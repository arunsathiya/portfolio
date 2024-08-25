import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.R2_BUCKET_NAME;

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET_NAME) {
	console.error('Error: One or more required environment variables are not set.');
	process.exit(1);
}

const S3 = new S3Client({
	region: 'auto',
	endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: ACCESS_KEY_ID,
		secretAccessKey: SECRET_ACCESS_KEY,
	},
});

async function getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: BUCKET_NAME,
		Key: key,
	});

	return getSignedUrl(S3, command, { expiresIn });
}

async function listObjectsInBucket(prefix?: string): Promise<void> {
	try {
		console.log(`Attempting to list objects in bucket: ${BUCKET_NAME}`);
		if (prefix) {
			console.log(`With prefix: ${prefix}`);
		}

		const command = new ListObjectsV2Command({
			Bucket: BUCKET_NAME,
			Prefix: prefix,
		});

		const response = await S3.send(command);

		if (response.Contents && response.Contents.length > 0) {
			console.log('Objects in the bucket:');
			for (const object of response.Contents) {
				const signedUrl = await getSignedDownloadUrl(object.Key!);
				console.log(`- ${object.Key}`);
				console.log(`  Size: ${object.Size} bytes`);
				console.log(`  Last Modified: ${object.LastModified}`);
				console.log(`  Signed URL (expires in 1 hour): ${signedUrl}`);
				console.log('---');
			}
		} else {
			console.log('No objects found in the bucket.');
		}

		if (response.IsTruncated) {
			console.log('More objects are available. Implement pagination to see them all.');
		}
	} catch (error) {
		console.error('Error listing objects in R2 bucket:');
		if (error instanceof Error) {
			console.error('Error message:', error.message);
			console.error('Error stack:', error.stack);
		} else {
			console.error('Unknown error:', error);
		}
	}
}

// You can call the function with or without a prefix
// listObjectsInBucket();
listObjectsInBucket('blog-images/');
