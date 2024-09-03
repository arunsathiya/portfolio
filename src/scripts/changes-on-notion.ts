import { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({
	auth: process.env.NOTION_SECRET,
});

async function main() {
	const databaseId = process.env.NOTION_DATABASE_ID;
	if (!databaseId) {
		throw new Error('NOTION_DATABASE_ID is not set in the environment variables');
	}

	const databaseQuery = await notion.databases.query({
		database_id: databaseId,
	});

	const processPromises = databaseQuery.results.map(async (page) => {
		const pageObj = page as PageObjectResponse;
		console.log(pageObj.id);
	});

	await Promise.all(processPromises);
}

main().catch((error) => {
	console.error('An error occurred:', error);
	process.exit(1);
});
