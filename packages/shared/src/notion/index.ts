import { Client } from '@notionhq/client';
import type {
  BlockObjectResponse,
  PartialBlockObjectResponse,
  RichTextItemResponse,
  TextRichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { NotionToMarkdown } from 'notion-to-md';

/**
 * Type alias for Notion client instance type.
 */
export type NotionClient = InstanceType<typeof Client>;

/**
 * Type for block update parameters.
 */
export type UpdateBlockParameters = Parameters<NotionClient['blocks']['update']>[0];

/**
 * Type guard to check if a rich text item is a text item.
 */
export function isTextRichTextItem(item: RichTextItemResponse): item is TextRichTextItemResponse {
  return item.type === 'text';
}

/**
 * Type guard to check if a block is a paragraph block.
 */
export function isParagraphBlock(
  block: BlockObjectResponse | PartialBlockObjectResponse
): block is BlockObjectResponse & { type: 'paragraph' } {
  return 'type' in block && block.type === 'paragraph';
}

/**
 * Configuration options for creating a Notion client.
 */
export interface NotionClientConfig {
  auth: string;
  /** Optional custom fetch function (useful for Cloudflare Workers) */
  fetch?: typeof globalThis.fetch;
}

/**
 * Create a configured Notion client.
 */
export function createNotionClient(config: NotionClientConfig): Client {
  return new Client({
    auth: config.auth,
    notionVersion: '2022-06-28',
    ...(config.fetch && { fetch: config.fetch }),
  });
}

/**
 * Configuration for NotionToMarkdown converter.
 */
export interface NotionToMarkdownConfig {
  notionClient: Client;
  parseChildPages?: boolean;
  separateChildPage?: boolean;
}

/**
 * Create a configured NotionToMarkdown instance.
 */
export function createNotionToMarkdown(config: NotionToMarkdownConfig): NotionToMarkdown {
  return new NotionToMarkdown({
    notionClient: config.notionClient,
    config: {
      parseChildPages: config.parseChildPages ?? false,
      separateChildPage: config.separateChildPage ?? false,
    },
  });
}

/**
 * Normalize a UUID to canonical format (8-4-4-4-12 with hyphens).
 * Returns null if the input is not a valid UUID.
 */
export function normalizeUUID(id: string): string | null {
  const hex = id.replace(/[-\s]/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Escape a string for use in YAML frontmatter.
 * Escapes single quotes by doubling them.
 */
export function escapeYamlString(str: string): string {
  return str.replace(/'/g, "''");
}

// Re-export types from notion client for convenience
export type {
  BlockObjectResponse,
  PartialBlockObjectResponse,
  RichTextItemResponse,
  TextRichTextItemResponse,
  ImageBlockObjectResponse,
  PageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
