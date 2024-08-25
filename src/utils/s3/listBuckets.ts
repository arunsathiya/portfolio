import { ListBucketsCommand, S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

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

export async function listR2Buckets(): Promise<void> {
	try {
		console.log('Attempting to list R2 buckets...');
		console.log('Using account ID:', ACCOUNT_ID);
		console.log('Access Key ID (first 5 chars):', ACCESS_KEY_ID?.substring(0, 5));

		const command = new ListBucketsCommand({});
		const response = await S3.send(command);

		console.log('Successfully listed buckets:');
		console.log(JSON.stringify(response.Buckets, null, 2));
	} catch (error) {
		console.error('Error listing R2 buckets:');
		if (error instanceof Error) {
			console.error('Error message:', error.message);
			console.error('Error stack:', error.stack);
		} else {
			console.error('Unknown error:', error);
		}
	}
}

// Call the function to test
listR2Buckets();
