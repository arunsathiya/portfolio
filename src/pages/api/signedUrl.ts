import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { APIRoute } from 'astro';

const s3Client = new S3Client({
	region: 'auto',
	endpoint: `https://${import.meta.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: import.meta.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
		secretAccessKey: import.meta.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
	},
});

export const GET: APIRoute = async ({ request }) => {
	const url = new URL(request.url);
	const key = url.searchParams.get('key');

	if (!key) {
		console.error('No key provided');
		return new Response(JSON.stringify({ error: 'No key provided' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		console.log('Generating signed URL for key:', key);
		const command = new GetObjectCommand({
			Bucket: import.meta.env.R2_BUCKET_NAME!,
			Key: key,
		});

		const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
		console.log('Generated signed URL:', signedUrl);

		return new Response(JSON.stringify({ url: signedUrl }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Error generating signed URL:', error);
		return new Response(JSON.stringify({ error: 'Failed to generate signed URL' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
