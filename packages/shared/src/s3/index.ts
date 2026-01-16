import type { S3Client } from '@aws-sdk/client-s3';

/**
 * Configuration for creating an S3 client for Cloudflare R2.
 */
export interface R2ClientConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * Create S3 client configuration for Cloudflare R2.
 * Returns the configuration object to pass to S3Client constructor.
 *
 * Usage:
 * ```ts
 * import { S3Client } from '@aws-sdk/client-s3';
 * const client = new S3Client(createR2ClientConfig({ ... }));
 * ```
 */
export function createR2ClientConfig(config: R2ClientConfig) {
  return {
    region: 'auto' as const,
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  };
}

/**
 * Generate an R2 asset key from page slug and block ID.
 */
export function generateAssetKey(pageSlug: string, blockId: string, imageUrl: string): string {
  const ext = imageUrl.split('?')[0].split('.').pop() || 'png';
  const filename = `${pageSlug}-${blockId}.${ext}`;
  return `assets/${filename}`;
}
