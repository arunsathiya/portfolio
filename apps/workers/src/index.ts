import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import Replicate, { ApiError, validateWebhook } from 'replicate';
import Anthropic from '@anthropic-ai/sdk';
import { isFullPage } from '@notionhq/client';
import {
  createNotionClient,
  createNotionToMarkdown,
  createR2ClientConfig,
  formatDateWithTime,
  formatDateForFolder,
  isTextRichTextItem,
  isParagraphBlock,
  normalizeUUID,
  escapeYamlString,
  queryDatabase,
  retrieveDataSourceSchema,
  type ImageBlockObjectResponse,
  type NotionClient,
  type PageObjectResponse,
  type UpdateBlockParameters,
} from '@portfolio/shared';

import { Buffer } from 'node:buffer';
import path from 'node:path';
import * as prettier from 'prettier/standalone';
import prettierPluginEstree from 'prettier/plugins/estree';
import prettierPluginBabel from 'prettier/plugins/babel';
import prettierPluginMarkdown from 'prettier/plugins/markdown';

interface Env {
  CLOUDFLARE_ACCOUNT_ID: string;
  R2_BUCKET_NAME: string;
  CLOUDFLARE_R2_ACCESS_KEY_ID: string;
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: string;
  REPLICATE_WEBHOOK_SIGNING_KEY: string;
  REPLICATE_API_TOKEN: string;
  IMAGE_GENERATION_SECRET: string;
  IMAGE_GENERATION_BASE_PROMPT: string;
  BlogAssets: KVNamespace;
  BlogOthers: KVNamespace;
  PORTFOLIO_BUCKET: R2Bucket;
  ANTHROPIC_API_KEY: string;
  NOTION_TOKEN: string;
  NOTION_DATABASE_ID: string;
  GITHUB_PAT: string;
  DISPATCH_SECRET: string;
  NOTION_QUEUE: Queue<NotionWebhookPayload>;
  NOTION_SIGNATURE_SECRET: string;
  IMAGE_UPLOAD_QUEUE: Queue<ImageProcessingMessage>;
}

interface CachedSignedUrl {
  url: string;
  refreshTime: number;
}

interface DispatchRequest {
  commit_message?: string;
}

interface GitHubDispatch {
  event_type: string;
  client_payload: {
    commit_message: string;
  };
}

interface ReplicatePrediction {
  id: string;
  version: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  status: string;
  input: {
    [key: string]: any;
  };
  output: any | null;
  error: string | null;
  logs: string | null;
  metrics: {
    [key: string]: any;
  };
}

interface NotionResponse {
  results: {
    properties: {
      'Date frontmatter': {
        formula: {
          string: string;
        };
      };
      'Slug frontmatter': {
        formula: {
          string: string;
        };
      };
      Title: {
        title: {
          plain_text: string;
        }[];
      };
      'Generate Image Title': {
        rich_text: {
          plain_text: string;
        }[];
      };
    };
    last_edited_time: string;
  }[];
}

interface GitHubWorkflowDispatch {
  ref: string;
  inputs: {
    commit_message: string;
    date_slug_combo: string;
  };
}

const createS3Client = (env: Env) =>
  new S3Client(
    createR2ClientConfig({
      accountId: env.CLOUDFLARE_ACCOUNT_ID,
      accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    })
  );

// CORS headers for API responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper to create JSON response with CORS
const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });

const handleAssets = async (request: Request, env: Env, s3Client: S3Client) => {
  const url = new URL(request.url);
  const key = url.pathname.slice(1);
  console.log('Key:', key);

  try {
    const cache = await env.BlogAssets.get<CachedSignedUrl>(key, 'json');
    let signedUrl: string;

    if (!cache || Date.now() > cache.refreshTime) {
      const command = new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key });
      signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      await env.BlogAssets.put(
        key,
        JSON.stringify({
          url: signedUrl,
          refreshTime: Date.now() + 55 * 60 * 1000,
        }),
      );
    } else {
      console.log(`Used cached signed URL for ${key}`);
      signedUrl = cache.url;
    }

    const response = await fetch(signedUrl);
    return new Response(response.body as BodyInit, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return new Response('Failed to generate signed URL', { status: 500 });
  }
};

const generateImagePrompt = async (title: string, env: Env) => {
  const basePrompt = env.IMAGE_GENERATION_BASE_PROMPT;
  if (!basePrompt) {
    throw new Error('IMAGE_GENERATION_BASE_PROMPT not found in environment variables');
  }
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const image_url = 'https://cdn.arun.blog/image.png';
  const image_media_type = 'image/png';
  const image_array_buffer = await (await fetch(image_url)).arrayBuffer();
  const image_data = Buffer.from(image_array_buffer).toString('base64');
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    temperature: 0,
    system:
      'Reply only with the generated prompt and not anything else, including any prefix message that the requested prompt is generated.',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `This is the prompt I have for the attached image:\n\n${basePrompt}\n\nCan you generate a similar prompt with creative materials relating to the blog post titled "${title}", but with a darker background? It can be any dark color. Aim to match the same font styling as in the base prompt.`,
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: image_media_type,
              data: image_data,
            },
          },
        ],
      },
    ],
  });
  return msg.content[0].type === 'text' ? msg.content[0].text : '';
};

function isReplicateApiError(error: unknown): error is ApiError {
  return (
    error instanceof Error &&
    error !== null &&
    typeof error === 'object' &&
    'request' in error &&
    'response' in error &&
    error.request instanceof Request &&
    error.response instanceof Response
  );
}

const handleGitHubDispatch = async (request: Request, env: Env) => {
  if (!env.DISPATCH_SECRET || !(await validateAuthToken(request, env.DISPATCH_SECRET))) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = (await request.json()) as DispatchRequest;
    const commit_message = body.commit_message || 'chore: update from Notion';

    const dispatch: GitHubDispatch = {
      event_type: 'chore: fetch and commit Notion changes',
      client_payload: {
        commit_message,
      },
    };

    const githubResponse = await fetch(
      'https://api.github.com/repos/arunsathiya/portfolio/dispatches',
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${env.DISPATCH_SECRET}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          'User-Agent': 'Cloudflare-Worker',
        },
        body: JSON.stringify(dispatch),
      },
    );

    if (!githubResponse.ok) {
      throw new Error(`GitHub API error: ${githubResponse.statusText}`);
    }

    return jsonResponse({
      commit_message,
      status: 'GitHub repository dispatch triggered',
    });
  } catch (error) {
    console.error('Error:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      500,
    );
  }
};

const handleImageGeneration = async (payload: NotionWebhookPayload, env: Env) => {
  try {
    const pageId = payload.data.id;
    const databaseId = payload.data.parent.database_id;

    console.log('📝 Parsed payload:', { pageId, databaseId });

    // Validate that the request is from the correct database
    const normalizedDatabaseId = normalizeUUID(databaseId);
    const normalizedTargetId = normalizeUUID(env.NOTION_DATABASE_ID);

    if (
      !normalizedDatabaseId ||
      !normalizedTargetId ||
      normalizedDatabaseId !== normalizedTargetId
    ) {
      console.log('❌ Invalid database ID:', {
        received: databaseId,
        expected: env.NOTION_DATABASE_ID,
      });
      return new Response('Invalid database ID', { status: 400 });
    }

    console.log('✅ Database ID validated');

    // Fetch the specific page data from Notion
    const notion = createNotionClient({
      auth: env.NOTION_TOKEN,
      fetch: (input, init) => fetch(input, init),
    });

    console.log('🔍 Fetching page data from Notion...');
    const pageResponse = await notion.pages.retrieve({ page_id: pageId });
    const page = pageResponse as NotionPage;

    // Extract date and slug
    const date = page.properties['Date frontmatter'].formula.string;
    const slug = page.properties['Slug frontmatter'].formula.string;

    // Extract image generation prompt
    const imageTitle = page.properties['Generate Image Title'].rich_text[0].plain_text;

    console.log('📊 Extracted page data:', { date, slug, imageTitle });

    // Generate and trigger image creation
    console.log('🤖 Generating image prompt with Claude...');
    const prompt = await generateImagePrompt(imageTitle, env);
    console.log('✅ Generated prompt:', prompt);

    const replicate = new Replicate({ auth: env.REPLICATE_API_TOKEN });
    const callbackUrl = `https://www.arun.blog/webhooks/replicate?date=${date}&slug=${slug}`;

    console.log('🚀 Creating Replicate prediction with:', {
      model: 'prunaai/p-image',
      callbackUrl,
      promptLength: prompt.length,
    });

    const prediction = await replicate.predictions.create({
      model: 'prunaai/p-image',
      input: { prompt },
      webhook: callbackUrl,
      webhook_events_filter: ['completed'],
    });

    console.log('✅ Replicate prediction created successfully:', {
      id: prediction.id,
      status: prediction.status,
      created_at: prediction.created_at,
    });

    return jsonResponse({
      imageTitle,
      date,
      slug,
      predictionId: prediction.id,
      status: 'Image generation requested',
    });
  } catch (error) {
    console.error('💥 Error in handleImageGeneration:', error);

    if (isReplicateApiError(error)) {
      const status = error.response.status;
      console.error('🔴 Replicate API error:', {
        status,
        statusText: error.response.statusText,
        url: error.request.url,
      });

      try {
        const responseText = await error.response.text();
        console.error('🔴 Replicate API error response:', responseText);
      } catch (e) {
        console.error('🔴 Could not read Replicate error response body');
      }

      switch (status) {
        case 402:
          return new Response('Monthly spend limit reached.', { status: 402 });
        case 429:
          return new Response('Rate limit reached. Please try again later.', { status: 429 });
        default:
          return new Response('API error occurred', { status: status });
      }
    }
    console.error('🔴 Unexpected error in image generation:', error);
    return new Response('An unexpected error occurred', { status: 500 });
  }
};

const handleReplicateWebhook = async (request: Request, env: Env) => {
  console.log('🪝 Replicate webhook received');

  const rawBody = await request.text();
  console.log('📨 Webhook payload size:', rawBody.length);

  const valid = await validateWebhook(
    new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: rawBody,
    }),
    env.REPLICATE_WEBHOOK_SIGNING_KEY,
  );

  if (!valid) {
    console.log('❌ Invalid webhook signature');
    return new Response('Invalid webhook signature', { status: 401 });
  }

  console.log('✅ Webhook signature validated');

  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  const slug = url.searchParams.get('slug');

  console.log('🔍 URL parameters:', { date, slug });

  if (!date || !slug) {
    console.log('❌ Missing date or slug parameters');
    return new Response('Missing blog post date or slug', { status: 400 });
  }

  try {
    const payload: ReplicatePrediction = JSON.parse(rawBody);

    console.log('📊 Replicate prediction status:', {
      id: payload.id,
      status: payload.status,
      completed_at: payload.completed_at,
      hasOutput: !!payload.output,
      outputType: Array.isArray(payload.output) ? 'array' : typeof payload.output,
    });

    if (payload.error) {
      console.log('❌ Replicate prediction error:', payload.error);
    }

    // Handle both single URL string and array of URLs
    const outputs: string[] = Array.isArray(payload.output)
      ? payload.output
      : typeof payload.output === 'string'
        ? [payload.output]
        : [];

    if (outputs.length === 0) {
      console.log('❌ Invalid output format:', payload.output);
      return new Response('Invalid output format', { status: 400 });
    }

    console.log('📸 Processing', outputs.length, 'generated images');

    const uploadResults = await Promise.allSettled(
      outputs.map(async (output, index) => {
        console.log(`⬇️ Downloading image ${index + 1}:`, output);
        const response = await fetch(output);
        if (!response.ok) {
          throw new Error(
            `Failed to download image ${index + 1}: ${response.status} ${response.statusText}`,
          );
        }
        const imageBody = await response.arrayBuffer();
        const fileExtension = output.split('.').pop() || 'webp';
        const fileName = `sandbox/${date}-${slug}/${payload.id}_${index}.${fileExtension}`;

        console.log(`⬆️ Uploading to R2:`, fileName);
        return env.PORTFOLIO_BUCKET.put(fileName, imageBody);
      }),
    );

    const failures = uploadResults.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );
    if (failures.length > 0) {
      console.error(
        '❌ Some images failed to upload:',
        failures.map((f) => f.reason),
      );
    }
    const successes = uploadResults.filter((r) => r.status === 'fulfilled').length;
    console.log(`✅ ${successes}/${uploadResults.length} images uploaded successfully`);

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('💥 Error processing Replicate webhook:', error);
    return new Response('Error processing webhook', { status: 500 });
  }
};

interface R2EventMessage {
  account: string;
  bucket: string;
  eventTime: string;
  action: 'PutObject' | 'DeleteObject' | 'CopyObject';
  object: {
    key: string;
    size: number;
    eTag: string;
  };
  copySource?: {
    bucket: string;
    object: string;
  };
}

interface Message<Body = unknown> {
  readonly id: string;
  readonly timestamp: Date;
  readonly body: Body;
  readonly attempts: number;
  ack(): void;
  retry(options?: QueueRetryOptions): void;
}

interface MessageBatch<Body = unknown> {
  readonly queue: string;
  readonly messages: Message<Body>[];
  ackAll(): void;
  retryAll(options?: QueueRetryOptions): void;
}

const getFileContent = async (path: string, env: Env): Promise<string | null> => {
  const query = `
    query GetFileContent {
      repository(owner: "arunsathiya", name: "portfolio") {
        object(expression: "main:${path}") {
          ... on Blob {
            text
          }
        }
      }
    }
  `;

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_PAT}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Cloudflare-Worker',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${await response.text()}`);
  }

  const result = await response.json();
  return result.data.repository.object?.text ?? null;
};

// Check if a file exists in the repo (works for binary files too)
const fileExistsInRepo = async (path: string, env: Env): Promise<boolean> => {
  const query = `
    query CheckFileExists {
      repository(owner: "arunsathiya", name: "portfolio") {
        object(expression: "main:${path}") {
          oid
        }
      }
    }
  `;

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_PAT}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Cloudflare-Worker',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    return false;
  }

  const result = await response.json();
  return result.data.repository.object !== null;
};

interface FileChange {
  path: string;
  content: string | ArrayBuffer;
}

/**
 * Format MDX content using Prettier with the same config as apps/web.
 * This ensures MDX files committed by workers match the codebase formatting.
 */
const formatMdxContent = async (content: string): Promise<string> => {
  return prettier.format(content, {
    parser: 'mdx',
    plugins: [prettierPluginMarkdown, prettierPluginBabel, prettierPluginEstree],
    printWidth: 140,
    tabWidth: 2,
    useTabs: true,
    semi: true,
    singleQuote: true,
    quoteProps: 'as-needed',
    jsxSingleQuote: true,
    trailingComma: 'all',
    bracketSpacing: true,
    arrowParens: 'always',
    proseWrap: 'preserve',
    htmlWhitespaceSensitivity: 'css',
    endOfLine: 'lf',
  });
};

const commitToGitHub = async (
  files: FileChange[],
  message: string,
  env: Env,
  deletions: string[] = [],
): Promise<boolean> => {
  const contentChecks = await Promise.all(
    files.map(async (file) => {
      // Format MDX files with Prettier before committing
      let content = file.content;
      if (file.path.endsWith('.mdx') && typeof content === 'string') {
        try {
          content = await formatMdxContent(content);
        } catch (error) {
          console.error(`Failed to format ${file.path}:`, error);
          // Continue with unformatted content if formatting fails
        }
      }

      const currentContent = await getFileContent(file.path, env);
      return {
        path: file.path,
        content,
        hasChanged: currentContent !== content,
        addition: {
          path: file.path,
          contents: Buffer.from(content).toString('base64'),
        },
      };
    }),
  );

  const additions = contentChecks
    .filter((check) => check.hasChanged)
    .map((check) => check.addition);

  if (additions.length === 0 && deletions.length === 0) {
    console.log('No changes detected in any files, skipping commit');
    return false;
  }

  const query = `
    mutation CreateCommitOnBranch($input: CreateCommitOnBranchInput!) {
      createCommitOnBranch(input: $input) {
        commit {
          url
        }
      }
    }
  `;

  const fileChanges: { additions: typeof additions; deletions?: { path: string }[] } = {
    additions,
  };

  if (deletions.length > 0) {
    fileChanges.deletions = deletions.map((path) => ({ path }));
  }

  const variables = {
    input: {
      branch: {
        repositoryNameWithOwner: 'arunsathiya/portfolio',
        branchName: 'main',
      },
      message: {
        headline: message,
        body: 'Commit created by github-actions[bot]\n\nCo-authored-by: github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>',
      },
      fileChanges,
      expectedHeadOid: await getLatestCommitOid(env),
    },
  };

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_PAT}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Cloudflare-Worker',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${await response.text()}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(`GraphQL Error: ${JSON.stringify(result.errors)}`);
  }
  return true;
};

const getLatestCommitOid = async (env: Env): Promise<string> => {
  const query = `
    query GetLatestCommit {
      repository(owner: "arunsathiya", name: "portfolio") {
        defaultBranchRef {
          target {
            oid
          }
        }
      }
    }
  `;

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_PAT}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Cloudflare-Worker',
    },
    body: JSON.stringify({ query }),
  });

  const result = await response.json();
  return result.data.repository.defaultBranchRef.target.oid;
};

interface NotionWebhookPayload {
  source: {
    type: 'automation';
    automation_id: string;
    action_id: string;
    event_id: string;
    attempt: number;
  };
  data: {
    object: 'page';
    id: string;
    created_time: string;
    last_edited_time: string;
    parent: {
      type: 'database_id';
      database_id: string;
    };
    properties: Record<string, any>;
    url: string;
    request_id: string;
  };
}

// Detect which cover image extension exists in the GitHub folder
const getCoverImageExtension = async (folderPath: string, env: Env): Promise<string> => {
  const extensions = ['webp', 'jpeg', 'jpg'];
  for (const ext of extensions) {
    const imagePath = `${folderPath}/image.${ext}`;
    if (await fileExistsInRepo(imagePath, env)) {
      return ext;
    }
  }
  // Default to webp for new pages
  return 'webp';
};

const processPage = async (pageId: string, env: Env, s3: S3Client) => {
  const notion = createNotionClient({
    auth: env.NOTION_TOKEN,
    fetch: (input, init) => fetch(input, init),
  });
  const n2m = createNotionToMarkdown({
    notionClient: notion,
  });

  const [mdblocks, page] = await Promise.all([
    n2m.pageToMarkdown(pageId),
    notion.pages.retrieve({ page_id: pageId }) as Promise<PageObjectResponse>,
  ]);

  // Extract page properties
  const title =
    page.properties.Title.type === 'title' && page.properties.Title.title.length > 1
      ? page.properties.Title.title.map((t) => t.plain_text.trim()).join(' ')
      : page.properties.Title.type === 'title'
        ? page.properties.Title.title[0]?.plain_text.trim()
        : 'Untitled';

  const slug =
    page.properties.Slug.type === 'formula' && page.properties.Slug?.formula?.type == 'string'
      ? (page.properties.Slug.formula?.string as string)
      : '';

  const description =
    page.properties.Description.type === 'rich_text'
      ? page.properties.Description.rich_text[0]?.plain_text.trim()
      : '';

  // Get dates
  const originallyPublishedDate =
    page.properties['Originally published on']?.type === 'date' &&
    page.properties['Originally published on'].date?.start
      ? page.properties['Originally published on'].date.start
      : null;

  const pubDate = originallyPublishedDate
    ? formatDateWithTime(originallyPublishedDate + 'T00:00:00.000Z')
    : formatDateWithTime(page.created_time);

  const updatedDate = formatDateWithTime(page.last_edited_time);

  // Get tags
  const tags =
    page.properties.Tags?.type === 'multi_select'
      ? page.properties.Tags.multi_select.map((tag) => tag.name)
      : [];

  // Get folder date
  const folderDate = originallyPublishedDate
    ? formatDateForFolder(originallyPublishedDate + 'T00:00:00.000Z')
    : formatDateForFolder(page.created_time);

  // Detect existing cover image extension
  const blogFolderPath = `apps/web/src/content/blog/${folderDate}-${slug}`;
  const coverImageExt = await getCoverImageExtension(blogFolderPath, env);

  // Process images in the markdown blocks
  for (let i = 0; i < mdblocks.length; i++) {
    const block = mdblocks[i];
    if (block.type === 'image') {
      const imageUrl = block.parent.match(/\((.*?)\)/)?.[1];
      if (imageUrl) {
        try {
          const blockId = block.blockId || `fallback-${i}`;
          const filename = `${slug}-${blockId}${path.extname(imageUrl.split('?')[0])}`;
          const key = `assets/${filename}`;
          const existingCaption = block.parent.match(/!\[(.*?)\]\(/)?.[1];
          mdblocks[i].parent = `<R2Image imageKey="${key}" alt="${existingCaption || '/'}" />`;
          await env.IMAGE_UPLOAD_QUEUE.send({
            type: 'image-processing',
            payload: {
              type: 'image-processing',
              imageUrl,
              pageSlug: slug,
              blockId,
              notionPageId: pageId,
              filePath: `apps/web/src/content/blog/${folderDate}-${slug}/index.mdx`,
            },
          });
        } catch (error) {
          console.error(`Failed to queue image: ${imageUrl}`, error);
        }
      }
    }
  }

  const mdString = n2m.toMarkdownString(mdblocks);
  const convertedMdString = mdString.parent.replace(/\[(embed|video)\]\((https?:\/\/\S+)\)/g, '$2');
  const postContainsImages = mdblocks.some((block) => block.parent.includes('R2Image'));

  const content = `---
title: '${escapeYamlString(title)}'
seoTitle: '${escapeYamlString(title)}'
slug: '${escapeYamlString(slug)}'
description: '${escapeYamlString(description)}'
pubDate: '${pubDate}'
updatedDate: '${updatedDate}'
tags: ${JSON.stringify(tags)}
coverImage: './image.${coverImageExt}'
---${
    postContainsImages
      ? `
import R2Image from 'src/components/R2Image.astro';`
      : ''
  }
${convertedMdString}`;

  return {
    content,
    path: `apps/web/src/content/blog/${folderDate}-${slug}/index.mdx`,
  };
};

const processImageMessage = async (message: ImageProcessingPayload, env: Env) => {
  const notion = createNotionClient({
    auth: env.NOTION_TOKEN,
    fetch: (input, init) => fetch(input, init),
  });

  try {
    // Get the block and its caption
    const blockObj = (await notion.blocks.retrieve({
      block_id: message.blockId,
    })) as ImageBlockObjectResponse;

    const caption = blockObj.image?.caption[0]?.plain_text || '';
    const filename = `${message.pageSlug}-${message.blockId}${path.extname(message.imageUrl.split('?')[0])}`;
    const key = `assets/${filename}`;

    // First upload the image if needed
    await uploadImage(
      message.imageUrl,
      message.pageSlug,
      message.blockId,
      env,
      createS3Client(env),
    );

    // Then update the MDX file with the caption
    const currentContent = await getFileContent(message.filePath, env);
    if (!currentContent) {
      throw new Error('MDX file not found');
    }

    const imageTagRegex = new RegExp(`<R2Image imageKey="${key}" alt="([^"]*)" />`);
    const currentCaption = currentContent.match(imageTagRegex)?.[1];

    if (currentCaption !== caption) {
      const newContent = currentContent.replace(
        `<R2Image imageKey="${key}" alt="${currentCaption}" />`,
        `<R2Image imageKey="${key}" alt="${caption}" />`,
      );
      await commitToGitHub(
        [
          {
            path: message.filePath,
            content: newContent,
          },
        ],
        `chore: update image caption for ${message.pageSlug}`,
        env,
      );
    }
  } catch (error) {
    console.error('Error processing image:', error);
    throw error; // Allow retry logic to handle the error
  }
};

const uploadImage = async (
  imageUrl: string,
  pageSlug: string,
  blockId: string,
  env: Env,
  s3: S3Client,
): Promise<{ uploaded: boolean; key: string }> => {
  try {
    // Generate a unique filename using blockId
    const filename = `${pageSlug}-${blockId}${path.extname(imageUrl.split('?')[0])}`;
    const key = `assets/${filename}`;

    // Check if the file already exists in the bucket
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: env.R2_BUCKET_NAME!,
        Key: key,
      });
      await s3.send(headCommand);

      // If we reach here, the file exists.
      console.log('Image already exists in the bucket.');
      return { uploaded: false, key };
    } catch (error) {
      // If the file doesn't exist, we'll get an error. Proceed with upload.
      console.log('Image does not exist in the bucket. Proceeding with upload.');
    }

    // Download the image
    const response = await fetch(imageUrl, {
      headers: {
        Accept: 'image/*',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();

    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME!,
      Key: key,
      Body: Buffer.from(buffer),
      ContentType: response.headers.get('content-type') || 'image/png',
    });

    const result = await s3.send(uploadCommand);

    if (result.$metadata.httpStatusCode !== 200) {
      throw new Error(`Upload failed with status code: ${result.$metadata.httpStatusCode}`);
    }

    console.log('Upload successful. Key:', key);
    return { uploaded: true, key };
  } catch (error) {
    console.error('Error uploading image to R2:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
};

interface NotionWebhookPayload {
  source: {
    type: 'automation';
    automation_id: string;
    action_id: string;
    event_id: string;
    attempt: number;
  };
  data: {
    object: 'page';
    id: string;
    created_time: string;
    last_edited_time: string;
    parent: {
      type: 'database_id';
      database_id: string;
    };
    properties: Record<string, any>;
    url: string;
    request_id: string;
  };
}

// Type guard to check if a message is a Notion webhook payload
function isNotionWebhookPayload(payload: any): payload is NotionWebhookPayload {
  return (
    payload &&
    'data' in payload &&
    'id' in payload.data &&
    'parent' in payload.data &&
    'database_id' in payload.data.parent
  );
}

// Type guard for R2 event
function isR2Event(payload: any): payload is R2EventMessage {
  return payload && 'action' in payload && 'object' in payload;
}

interface NotionWebhookContext {
  headers: Record<string, string>;
  processAllPages: boolean;
}

// The inner payload structure
interface ImageProcessingPayload {
  type: 'image-processing';
  imageUrl: string;
  pageSlug: string;
  blockId: string;
  notionPageId: string;
  filePath: string;
}

// The full message structure
interface ImageProcessingMessage {
  type: 'image-processing';
  payload: ImageProcessingPayload;
}

// Updated type definitions
interface QueueMessageBody {
  type: 'notion' | 'r2' | 'image-processing';
  payload: NotionWebhookPayload | R2EventMessage | ImageProcessingPayload;
  headers?: Record<string, string>;
  processAllPages?: boolean;
}

// Update the isNewPage function to check GitHub repository
const isNewPage = async (filePath: string, env: Env): Promise<boolean> => {
  try {
    // Use the existing getFileContent function to check if the file exists
    const fileContent = await getFileContent(filePath, env);
    // If file content is null, the file doesn't exist (new page)
    return fileContent === null;
  } catch (error) {
    console.error('Error checking if page exists in GitHub:', error);
    // If there's an error checking the file, assume it's new to be safe
    return true;
  }
};

// Add a function to get the default image from your R2 bucket
const getDefaultImage = async (env: Env, s3Client: S3Client): Promise<ArrayBuffer> => {
  try {
    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: 'sandbox/defaults/index.webp',
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error('No image data received');
    }

    // Convert the readable stream to a buffer
    const chunks = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).buffer;
  } catch (error) {
    console.error('Error getting default image:', error);
    throw error;
  }
};

// Helper function to process Notion webhooks
const processNotionWebhook = async (
  payload: NotionWebhookPayload,
  context: NotionWebhookContext,
  env: Env,
) => {
  const s3 = createS3Client(env);
  const { processAllPages } = context;
  const pageId = payload.data.id;
  const databaseId = payload.data.parent.database_id;

  const normalizedDatabaseId = normalizeUUID(databaseId);
  const normalizedTargetId = normalizeUUID(env.NOTION_DATABASE_ID);

  if (!normalizedDatabaseId || !normalizedTargetId || normalizedDatabaseId !== normalizedTargetId) {
    console.log('Ignoring webhook - not from target database');
    return;
  }

  if (processAllPages) {
    console.log('Processing all pages in database:', databaseId);
    const notion = createNotionClient({
      auth: env.NOTION_TOKEN,
      fetch: (input, init) => fetch(input, init),
    });

    const pages = await queryDatabase(notion, {
      database_id: databaseId,
    });

    // Process pages in parallel with a concurrency limit
    const BATCH_SIZE = 10;
    const fileChanges: FileChange[] = [];

    // Process pages in batches to avoid overwhelming the system
    for (let i = 0; i < pages.results.length; i += BATCH_SIZE) {
      const batch = pages.results.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((page) =>
          processPage(page.id, env, s3)
            .then((result) => ({ path: result.path, content: result.content }))
            .catch((error) => {
              console.error(`Error processing page ${page.id}:`, error);
              return null;
            }),
        ),
      );

      fileChanges.push(...batchResults.filter((result): result is FileChange => result !== null));

      // Remove the delay between batches
      // Only add minimal delay if you're hitting rate limits
      // await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (fileChanges.length > 0) {
      // Commit all changes in a single batch
      const committed = await commitToGitHub(
        fileChanges,
        'chore: update multiple pages from Notion',
        env,
      );
      console.log(committed ? 'Successfully committed all page changes' : 'No changes needed');
    } else {
      console.log('No changes to commit');
    }
  } else {
    // Process single page as before
    const { content, path } = await processPage(pageId, env, s3);
    const isPageNew = await isNewPage(path, env);
    const fileChanges: FileChange[] = [
      {
        path,
        content,
      },
    ];
    if (isPageNew) {
      try {
        const folderPath = path.substring(0, path.lastIndexOf('/'));
        const imageBuffer = await getDefaultImage(env, s3);
        fileChanges.push({
          path: `${folderPath}/image.webp`,
          content: imageBuffer,
        });
        console.log(`Add default index image for new page: ${folderPath}`);
      } catch (error) {
        console.error('Error adding default image:', error);
      }
    }
    await commitToGitHub(fileChanges, `chore: ${isPageNew ? 'create' : 'update'} ${path}`, env);
  }

  console.log('Successfully processed Notion webhook for page:', pageId);
};

// Helper function to process R2 events
async function processR2Event(event: R2EventMessage, env: Env) {
  console.log('Processing R2 event:', {
    action: event.action,
    sourceKey: event.copySource?.object,
    destinationKey: event.object.key,
    size: event.object.size,
    eTag: event.object.eTag,
  });

  const pathParts = event.object.key.split('/');
  if (pathParts.length >= 2) {
    const dateSlugPart = pathParts[1];
    const r2Object = await env.PORTFOLIO_BUCKET.get(event.object.key);

    if (r2Object === null) {
      throw new Error(`Object not found in R2: ${event.object.key}`);
    }

    // Extract the extension from the source file
    const sourceExtension = event.object.key.split('.').pop() || 'webp';
    const arrayBuffer = await r2Object.arrayBuffer();
    const targetPath = `apps/web/src/content/blog/${dateSlugPart}/image.${sourceExtension}`;

    // Check for existing images with different extensions to delete
    const imageExtensions = ['webp', 'jpeg', 'jpg'];
    const deletions: string[] = [];

    for (const ext of imageExtensions) {
      if (ext !== sourceExtension) {
        const existingPath = `apps/web/src/content/blog/${dateSlugPart}/image.${ext}`;
        const exists = await fileExistsInRepo(existingPath, env);
        if (exists) {
          deletions.push(existingPath);
          console.log(`Will delete existing image: ${existingPath}`);
        }
      }
    }

    // Update the frontmatter coverImage in index.mdx
    const mdxPath = `apps/web/src/content/blog/${dateSlugPart}/index.mdx`;
    const mdxContent = await getFileContent(mdxPath, env);
    const filesToCommit: FileChange[] = [
      {
        path: targetPath,
        content: arrayBuffer,
      },
    ];

    if (mdxContent) {
      // Replace coverImage with the new extension
      const updatedMdxContent = mdxContent.replace(
        /coverImage:\s*['"]\.\/image\.(webp|jpe?g)['"]/,
        `coverImage: './image.${sourceExtension}'`,
      );

      if (updatedMdxContent !== mdxContent) {
        filesToCommit.push({
          path: mdxPath,
          content: updatedMdxContent,
        });
        console.log(`Will update frontmatter in: ${mdxPath}`);
      }
    }

    await commitToGitHub(
      filesToCommit,
      `chore: update cover image for ${dateSlugPart}`,
      env,
      deletions,
    );

    console.log('Successfully processed image:', {
      r2Path: event.object.key,
      gitPath: targetPath,
      size: event.object.size,
      deletedFiles: deletions,
      updatedFrontmatter: filesToCommit.length > 1,
    });
  }
}

// Double HMAC implementation for timing-safe comparison
async function timingSafeEqual(
  bufferSource1: ArrayBuffer,
  bufferSource2: ArrayBuffer,
): Promise<boolean> {
  if (bufferSource1.byteLength !== bufferSource2.byteLength) {
    return false;
  }
  const algorithm = { name: 'HMAC', hash: 'SHA-256' };
  const key = await crypto.subtle.generateKey(algorithm, false, ['sign', 'verify']);
  const hmac = await crypto.subtle.sign(algorithm, key, bufferSource1);
  return await crypto.subtle.verify(algorithm, key, hmac, bufferSource2);
}

// Helper function for secure token comparison
const compareTokens = async (secret: string, token: string): Promise<boolean> => {
  if (!secret || !token) {
    return false;
  }
  try {
    const encoder = new TextEncoder();
    const secretBuffer = encoder.encode(secret);
    const tokenBuffer = encoder.encode(token);
    return await timingSafeEqual(secretBuffer, tokenBuffer);
  } catch (e) {
    console.error('Error in token comparison:', e);
    return false;
  }
};

const validateAuthToken = async (request: Request, secretKey: string): Promise<boolean> => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return false;
  }

  const token = authHeader.replace('Bearer ', '').trim();
  return await compareTokens(secretKey, token);
};

interface NotionTag {
  id: string;
  name: string;
  color: string;
}

const fetchAndStoreNotionTags = async (env: Env) => {
  const notion = createNotionClient({
    auth: env.NOTION_TOKEN,
    fetch: (input, init) => fetch(input, init),
  });

  try {
    // Fetch data source schema which includes tag options
    const response = await retrieveDataSourceSchema(notion, {
      database_id: env.NOTION_DATABASE_ID,
    });

    // Extract tags from the multi-select property
    const tagsProperty = Object.values(response.properties).find(
      (prop: any) => prop.type === 'multi_select',
    ) as { type: 'multi_select'; multi_select: { options: NotionTag[] } };

    if (!tagsProperty || !tagsProperty.multi_select?.options) {
      console.error('No multi-select tags property found in database');
      return;
    }

    const tags = tagsProperty.multi_select.options;

    // Store tags in KV
    await env.BlogOthers.put('tags', JSON.stringify(tags), {
      // Cache for 1 hour
      expirationTtl: 3600,
    });

    console.log(`Successfully stored ${tags.length} tags in KV`);
    return tags;
  } catch (error) {
    console.error('Error fetching or storing Notion tags:', error);
    throw error;
  }
};

interface CoverOption {
  type: 'solid' | 'gradient';
  color?: string;
  number?: string;
}

const getRandomCover = (): { type: 'external'; external: { url: string } } => {
  const coverOptions: CoverOption[] = [
    { type: 'solid', color: 'red' },
    { type: 'solid', color: 'blue' },
    { type: 'solid', color: 'yellow' },
    { type: 'gradient', number: '8' },
    { type: 'gradient', number: '4' },
    { type: 'gradient', number: '2' },
  ];

  const randomCover = coverOptions[Math.floor(Math.random() * coverOptions.length)];
  const getCoverUrl = (cover: CoverOption) => {
    if (cover.type === 'solid') {
      return `https://www.notion.so/images/page-cover/solid_${cover.color}.png`;
    } else {
      return `https://www.notion.so/images/page-cover/gradients_${cover.number}.png`;
    }
  };

  return {
    type: 'external',
    external: {
      url: getCoverUrl(randomCover),
    },
  };
};

const updateAllPageCoversAndIcons = async (env: Env): Promise<void> => {
  const notion = createNotionClient({
    auth: env.NOTION_TOKEN,
    fetch: (input, init) => fetch(input, init),
  });

  try {
    const databaseQuery = await queryDatabase(notion, {
      database_id: env.NOTION_DATABASE_ID,
      page_size: 100,
    });

    // Process pages in batches to avoid rate limits
    const BATCH_SIZE = 5;
    const pages = databaseQuery.results;

    for (let i = 0; i < pages.length; i += BATCH_SIZE) {
      const batch = pages.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (page) => {
          try {
            // Retrieve current page
            const currentPage = await notion.pages.retrieve({ page_id: page.id });
            if (!isFullPage(currentPage)) {
              console.log(`Skipping page ${page.id} - not a full page object`);
              return;
            }

            const updates: any = {};

            // Only update if missing cover or icon
            if (!currentPage.cover) {
              updates.cover = getRandomCover();
            }

            if (!currentPage.icon) {
              updates.icon = {
                type: 'emoji',
                emoji: '🚀',
              };
            }

            // Only update if needed
            if (Object.keys(updates).length > 0) {
              await notion.pages.update({
                page_id: page.id,
                ...updates,
              });
              console.log(`Updated page ${page.id} with ${Object.keys(updates).join(' and ')}`);
            }
          } catch (error) {
            console.error(`Failed to update page ${page.id}:`, error);
          }
        }),
      );

      // Add a small delay between batches
      if (i + BATCH_SIZE < pages.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log('successfully updated all page icons and over images');
  } catch (error) {
    console.error('Error updating pages:', error);
    throw error;
  }
};

const updatePageLinks = async (pageId: string, notion: NotionClient): Promise<void> => {
  const blocks = await notion.blocks.children.list({
    block_id: pageId,
  });

  for (const block of blocks.results) {
    if (isParagraphBlock(block)) {
      let isBlockModified = false;
      const updatedRichText = block.paragraph.rich_text.map((textBlock) => {
        if (
          isTextRichTextItem(textBlock) &&
          (textBlock.text.link?.url.includes('arun.blog/blog/') ||
            textBlock.text.link?.url.includes('arun.blog/post/') ||
            textBlock.text.link?.url.includes('arun.blog/tag/'))
        ) {
          isBlockModified = true;
          return {
            type: 'text',
            text: {
              content: textBlock.text.content,
              link: {
                url: textBlock.text.link.url
                  .replace(new RegExp('arun.blog/blog/', 'g'), 'arun.blog/')
                  .replace(new RegExp('arun.blog/post/', 'g'), 'arun.blog/')
                  .replace(/\/tag\//, '/tags/'),
              },
            },
            annotations: textBlock.annotations,
          };
        }
        return textBlock;
      });

      if (isBlockModified) {
        try {
          await notion.blocks.update({
            block_id: block.id,
            type: 'paragraph',
            paragraph: {
              rich_text: updatedRichText,
            },
          } as UpdateBlockParameters);
          console.log(`Updated block ${block.id}`);
        } catch (error) {
          console.error(`Error updating block ${block.id}:`, error);
          throw error;
        }
      }
    }
  }
};

const handleLinkUpdates = async (request: Request, env: Env): Promise<Response> => {
  // Check authentication
  if (!env.DISPATCH_SECRET || !(await validateAuthToken(request, env.DISPATCH_SECRET))) {
    return new Response('Unauthorized', { status: 401 });
  }

  const notion = createNotionClient({
    auth: env.NOTION_TOKEN,
    fetch: (input, init) => fetch(input, init),
  });

  try {
    // Query all pages in the database
    const databaseQuery = await queryDatabase(notion, {
      database_id: env.NOTION_DATABASE_ID,
      page_size: 100, // Adjust based on your needs
    });

    // Process pages in batches
    const BATCH_SIZE = 5;
    const pages = databaseQuery.results;
    const results = {
      processed: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < pages.length; i += BATCH_SIZE) {
      const batch = pages.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (page) => {
          try {
            await updatePageLinks(page.id, notion);
            results.processed++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            results.errors.push(`Error processing page ${page.id}: ${errorMessage}`);
          }
        }),
      );

      // Add a small delay between batches to respect rate limits
      if (i + BATCH_SIZE < pages.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return jsonResponse({
      status: 'success',
      message: `Processed ${results.processed} pages`,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    console.error('Error processing link updates:', error);
    return jsonResponse(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      500,
    );
  }
};

const fetchAndStoreCurrentSlugs = async (env: Env) => {
  const notion = createNotionClient({
    auth: env.NOTION_TOKEN,
    fetch: (input, init) => fetch(input, init),
  });

  try {
    const response = await queryDatabase(notion, {
      database_id: env.NOTION_DATABASE_ID,
      page_size: 100,
    });

    const slugs = response.results
      .map((page: any) => page.properties['Slug frontmatter']?.formula?.string)
      .filter((slug: any): slug is string => !!slug);

    await env.BlogOthers.put('slugs', JSON.stringify(slugs), {
      expirationTtl: 3600,
    });

    return slugs;
  } catch (error) {
    console.error('Error fetching slugs:', error);
    throw error;
  }
};

const findClosestSlug = (requestedSlug: string, currentSlugs: string[]): string | null => {
  const requestedKeywords = extractKeywords(requestedSlug);
  let bestMatch = {
    slug: '',
    score: 0,
    matchedKeywords: 0,
  };

  for (const slug of currentSlugs) {
    const slugKeywords = extractKeywords(slug);
    const matchResult = evaluateMatch(requestedKeywords, slugKeywords);

    if (matchResult.score > bestMatch.score) {
      bestMatch = {
        slug,
        score: matchResult.score,
        matchedKeywords: matchResult.matches,
      };
    }
  }

  // More lenient threshold for multi-word searches
  const threshold = requestedKeywords.length === 1 ? 0.3 : 0.4;
  return bestMatch.score >= threshold ? bestMatch.slug : null;
};

const evaluateMatch = (searchWords: string[], targetWords: string[]) => {
  let matches = 0;
  let partialMatches = 0;

  for (const searchWord of searchWords) {
    let bestWordScore = 0;

    for (const targetWord of targetWords) {
      // Exact match
      if (searchWord === targetWord) {
        bestWordScore = 1;
        break;
      }

      // Partial match with minimum length
      if (searchWord.length >= 4 && targetWord.length >= 4) {
        // One contains the other
        if (searchWord.includes(targetWord) || targetWord.includes(searchWord)) {
          bestWordScore = Math.max(bestWordScore, 0.8);
          continue;
        }

        // Levenshtein-like similarity for typos
        const similarity = calculateSimilarity(searchWord, targetWord);
        bestWordScore = Math.max(bestWordScore, similarity);
      }
    }

    if (bestWordScore >= 0.8) matches++;
    else if (bestWordScore >= 0.5) partialMatches++;
  }

  return {
    matches,
    score: (matches + partialMatches * 0.5) / Math.max(searchWords.length, 2),
  };
};

const calculateSimilarity = (str1: string, str2: string): number => {
  // Simple character-based similarity
  const maxLength = Math.max(str1.length, str2.length);
  let matches = 0;

  for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
    if (str1[i] === str2[i]) matches++;
  }

  return matches / maxLength;
};

const extractKeywords = (slug: string): string[] => {
  return slug.split(/[-_\s]+/).filter((word) => {
    const isCommonWord = [
      'the',
      'in',
      'at',
      'on',
      'for',
      'to',
      'of',
      'and',
      'or',
      'what',
      'was',
      'like',
    ].includes(word);
    const isShortNumber = !isNaN(Number(word)) && word.length < 4;
    return !isCommonWord && !isShortNumber && word.length >= 3;
  });
};

const countMatchedKeywords = (keywords1: string[], keywords2: string[]): number => {
  let matches = 0;

  for (const word1 of keywords1) {
    for (const word2 of keywords2) {
      if (
        word1 === word2 ||
        (word1.length > 4 && word2.includes(word1)) ||
        (word2.length > 4 && word1.includes(word2))
      ) {
        matches++;
        break;
      }
    }
  }

  return matches;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const s3Client = createS3Client(env);

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (
      !url.pathname.startsWith('/assets/') &&
      !url.pathname.startsWith('/api/') &&
      !url.pathname.startsWith('/webhooks/')
    ) {
      const slug = url.pathname.replace(/^\/blog\/|^\/post\/|^\//, '');

      if (slug) {
        const slugsJson = await env.BlogOthers.get('slugs');
        const currentSlugs: string[] = slugsJson ? JSON.parse(slugsJson) : [];

        if (!currentSlugs.includes(slug)) {
          const redirectSlug = findClosestSlug(slug, currentSlugs);
          if (redirectSlug) {
            return Response.redirect(`${url.origin}/${redirectSlug}`, 301);
          }
        }
      }
    }

    if (url.pathname.startsWith('/assets/')) {
      return handleAssets(request, env, s3Client);
    }

    if (url.pathname === '/api/changes-on-notion') {
      if (request.method !== 'POST') {
        return new Response(`Method not allowed`, { status: 405 });
      }
      return handleLinkUpdates(request, env);
    }

    if (url.pathname.startsWith('/blog/')) {
      const newPath = url.pathname.replace('/blog/', '/');
      return Response.redirect(url.origin + newPath, 301);
    }

    if (url.pathname.startsWith('/post/')) {
      const newPath = url.pathname.replace('/post/', '/');
      return Response.redirect(url.origin + newPath, 301);
    }

    if (url.pathname.startsWith('/tags')) {
      const tagsJson: string | null = await env.BlogOthers.get('tags');
      const tags: NotionTag[] = tagsJson ? JSON.parse(tagsJson) : [];
      const tag = url.pathname.split('/')[2];
      const tagExists = tags.some((t) => t.name.toLowerCase() === tag.toLowerCase());
      if (!tagExists) {
        return Response.redirect(`${url.origin}/tags`, 301);
      }
    }

    switch (url.pathname) {
      case '/api/generate-image': {
        if (request.method !== 'POST') {
          return new Response('Method not allowed', { status: 405 });
        }
        console.log('🎨 Image generation request received');
        if (
          !env.IMAGE_GENERATION_SECRET ||
          !(await validateAuthToken(request, env.IMAGE_GENERATION_SECRET))
        ) {
          console.log('❌ Image generation request unauthorized');
          return new Response('Unauthorized', { status: 401 });
        }
        console.log('✅ Image generation request authenticated');
        // Parse body BEFORE returning response (request stream closes after response)
        const imagePayload = (await request.json()) as NotionWebhookPayload;
        ctx.waitUntil(
          handleImageGeneration(imagePayload, env).catch((error) => {
            console.error('Error processing image generation webhook:', error);
          }),
        );
        return jsonResponse(
          {
            status: 'accepted',
            message: 'Webhook received and image generation will be processed asynchronously',
          },
          202,
        );
      }
      case '/api/dispatch':
        if (request.method !== 'POST') {
          return new Response('Method not allowed', { status: 405 });
        }
        return handleGitHubDispatch(request, env);
      case '/webhooks/replicate':
        if (request.method !== 'POST') {
          return new Response('Method not allowed', { status: 405 });
        }
        return handleReplicateWebhook(request, env);
      case '/webhooks/notion': {
        if (request.method !== 'POST') {
          return new Response('Method not allowed', { status: 405 });
        }
        const notionSignature =
          request.headers.get('x-notion-signature')?.replace('Bearer ', '') || '';
        if (
          !env.NOTION_SIGNATURE_SECRET ||
          !(await compareTokens(env.NOTION_SIGNATURE_SECRET, notionSignature))
        ) {
          return new Response('Unauthorized', { status: 401 });
        }
        const payload = (await request.json()) as NotionWebhookPayload;
        const relevantHeaders = {
          'x-notion-signature': notionSignature,
        };
        const processAllPages = request.headers.has('x-process-all-pages');
        ctx.waitUntil(
          processNotionWebhook(
            payload,
            {
              headers: relevantHeaders || {},
              processAllPages: processAllPages || false,
            },
            env,
          ).catch((error) => {
            console.error('Error processing Notion webhook:', error);
          }),
        );
        return jsonResponse(
          {
            status: 'accepted',
            message: 'Webhook received and will be processed asynchronously',
          },
          202,
        );
      }
      default:
        return new Response('Not Found', { status: 404 });
    }
  },

  async queue(
    batch: MessageBatch<QueueMessageBody | ImageProcessingMessage>,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const s3 = createS3Client(env);
    for (const message of batch.messages) {
      try {
        const payload = message.body;
        if (payload.type === 'image-processing') {
          await processImageMessage(payload.payload as ImageProcessingPayload, env);
          message.ack();
          continue;
        }
        // Handle R2 events for cover images (webp or jpeg)
        if (
          isR2Event(payload) &&
          payload.action === 'CopyObject' &&
          /\/image\.(webp|jpe?g)$/.test(payload.object.key)
        ) {
          await processR2Event(payload, env);
          message.ack();
          continue;
        }

        // Unknown message type
        console.warn('Unknown message type received:', payload);
        message.ack();
      } catch (error) {
        console.error('Error processing message:', error);
        if (message.attempts < 3) {
          message.retry({
            delaySeconds: 2 ** message.attempts,
          });
        } else {
          console.error(
            `Failed to process message after ${message.attempts} attempts:`,
            message.body,
          );
          // Store failed message in KV for later inspection
          const failedMessageKey = `dead-letter:${Date.now()}`;
          await env.BlogOthers.put(
            failedMessageKey,
            JSON.stringify({
              timestamp: new Date().toISOString(),
              attempts: message.attempts,
              body: message.body,
              error: error instanceof Error ? error.message : String(error),
            }),
            { expirationTtl: 60 * 60 * 24 * 7 }, // Keep for 7 days
          );
          console.error(`Dead letter stored: ${failedMessageKey}`);
          message.ack();
        }
      }
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    switch (event.cron) {
      case '0 */1 * * *':
        await fetchAndStoreNotionTags(env);
        break;
      case '*/3 * * * *':
        await updateAllPageCoversAndIcons(env);
        await fetchAndStoreCurrentSlugs(env);
        break;
    }
    console.log('cron processed');
  },
} satisfies ExportedHandler<Env>;
