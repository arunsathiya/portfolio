import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

const S3 = new S3Client({
	region: 'auto',
	endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: ACCESS_KEY_ID!,
		secretAccessKey: SECRET_ACCESS_KEY!,
	},
});

export async function uploadImage(imageUrl: string, pageSlug: string, blockId: string): Promise<string> {
	try {
		// Generate a unique filename using blockId
		const filename = `${pageSlug}-${blockId}${path.extname(imageUrl.split('?')[0])}`;
		const key = `blog/assets/${filename}`;

		// Check if the file already exists in the bucket
		try {
			const headCommand = new HeadObjectCommand({
				Bucket: process.env.R2_BUCKET_NAME!,
				Key: key,
			});
			await S3.send(headCommand);

			// If we reach here, the file exists. Generate and return a signed URL.
			console.log('Image already exists in the bucket. Generating signed URL.');
			return await getSignedUrlForObject(key);
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
			Bucket: process.env.R2_BUCKET_NAME!,
			Key: key,
			Body: Buffer.from(buffer),
			ContentType: response.headers.get('content-type') || 'image/png',
		});

		const result = await S3.send(uploadCommand);

		if (result.$metadata.httpStatusCode !== 200) {
			throw new Error(`Upload failed with status code: ${result.$metadata.httpStatusCode}`);
		}

		// Generate a signed URL
		const signedUrl = await getSignedUrlForObject(key);

		console.log('Upload successful. Signed URL:', signedUrl);
		return signedUrl;
	} catch (error) {
		console.error('Error uploading image to R2:', error);
		if (error instanceof Error) {
			console.error('Error message:', error.message);
			console.error('Error stack:', error.stack);
		}
		throw error;
	}
}

async function getSignedUrlForObject(key: string): Promise<string> {
	const getObjectCommand = new GetObjectCommand({
		Bucket: process.env.R2_BUCKET_NAME!,
		Key: key,
	});

	return getSignedUrl(S3, getObjectCommand, { expiresIn: 3600 }); // URL expires in 1 hour
}
