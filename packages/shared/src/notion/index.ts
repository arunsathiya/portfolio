import { Client } from '@notionhq/client';
import type {
  BlockObjectResponse,
  PartialBlockObjectResponse,
  RichTextItemResponse,
  TextRichTextItemResponse,
  RichTextItemResponseCommon,
  QueryDataSourceParameters,
  QueryDataSourceResponse,
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
 * Full text rich text item type (intersection of common + text-specific)
 */
export type FullTextRichTextItemResponse = RichTextItemResponseCommon & TextRichTextItemResponse;

/**
 * Type guard to check if a rich text item is a text item.
 */
export function isTextRichTextItem(
  item: RichTextItemResponse
): item is RichTextItemResponseCommon & TextRichTextItemResponse {
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
    notionVersion: '2025-09-03',
    ...(config.fetch && { fetch: config.fetch }),
  });
}

// In-memory cache for data source IDs
const dataSourceIdCache = new Map<string, string>();

/**
 * Extract data_source_id from a database retrieve response.
 * Handles the new API structure where databases contain data_sources array.
 */
function extractDataSourceIdFromDatabaseResponse(db: any): string | undefined {
  // In 2025-09-03, databases.retrieve returns { data_sources: [{ id, name }, ...] }
  if (Array.isArray(db?.data_sources) && db.data_sources.length > 0) {
    return db.data_sources[0].id;
  }
  // Fallback for other possible shapes
  return db?.data_source?.id;
}

/**
 * Resolve data_source_id from a database_id (with in-memory caching).
 * Required for SDK v5 / API version 2025-09-03.
 */
export async function getDataSourceIdFromDatabaseId(
  notion: Client,
  database_id: string
): Promise<string> {
  const cached = dataSourceIdCache.get(database_id);
  if (cached) return cached;

  const db = await notion.databases.retrieve({ database_id });
  const data_source_id = extractDataSourceIdFromDatabaseResponse(db);

  if (!data_source_id) {
    throw new Error(
      `Could not resolve data_source_id from database_id=${database_id}. ` +
        `Check the Notion API response shape for databases.retrieve() on API version 2025-09-03.`
    );
  }

  dataSourceIdCache.set(database_id, data_source_id);
  return data_source_id;
}

/**
 * Clear the data source ID cache (useful for testing or long-running processes).
 */
export function clearDataSourceIdCache(): void {
  dataSourceIdCache.clear();
}

/**
 * Query a database using the new data sources API.
 * Automatically resolves data_source_id from database_id.
 */
export async function queryDatabase(
  notion: Client,
  args: Omit<QueryDataSourceParameters, 'data_source_id'> & { database_id: string }
): Promise<QueryDataSourceResponse> {
  const { database_id, ...rest } = args;
  const data_source_id = await getDataSourceIdFromDatabaseId(notion, database_id);
  return notion.dataSources.query({ data_source_id, ...rest });
}

/**
 * Retrieve a data source schema (properties) using the new data sources API.
 * Automatically resolves data_source_id from database_id.
 */
export async function retrieveDataSourceSchema(
  notion: Client,
  args: { database_id: string }
): Promise<any> {
  const data_source_id = await getDataSourceIdFromDatabaseId(notion, args.database_id);
  return notion.dataSources.retrieve({ data_source_id });
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
 * Format a string for YAML frontmatter, returning the quoted value.
 * Uses double quotes for strings containing apostrophes (Prettier-compatible),
 * otherwise uses single quotes with escaping.
 */
export function formatYamlString(str: string): string {
  if (str.includes("'")) {
    // Use double quotes for strings with apostrophes (Prettier-preferred)
    return `"${str.replace(/"/g, '\\"')}"`;
  }
  return `'${str}'`;
}

/**
 * @deprecated Use formatYamlString instead for Prettier-compatible output
 * Escape a string for use in YAML frontmatter.
 * Escapes single quotes by doubling them.
 */
export function escapeYamlString(str: string): string {
  return str.replace(/'/g, "''");
}

/**
 * Format an array of tags for YAML frontmatter (Prettier-compatible).
 * Outputs: ['tag1', 'tag2'] with single quotes and spaces.
 */
export function formatYamlTags(tags: string[]): string {
  return `[${tags.map((tag) => `'${tag}'`).join(', ')}]`;
}

// Re-export types from notion client for convenience
export type {
  BlockObjectResponse,
  PartialBlockObjectResponse,
  RichTextItemResponse,
  RichTextItemResponseCommon,
  TextRichTextItemResponse,
  ImageBlockObjectResponse,
  PageObjectResponse,
  QueryDataSourceParameters,
  QueryDataSourceResponse,
  DataSourceObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
