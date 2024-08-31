import { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({
	auth: process.env.NOTION_SECRET,
});

async function updateSlug(page: PageObjectResponse) {
	const pageId = page.id;
	const slug =
		page.properties.Slug.type === 'rich_text'
			? page.properties.Slug.rich_text[0]?.plain_text.trim().toLowerCase().replace(/\s+/g, '-')
			: '';
	await notion.pages.update({
		page_id: pageId,
		properties: {
			Slug: {
				type: 'rich_text',
				rich_text: [
					{
						type: 'text',
						text: {
							content: slug,
						},
					},
				],
			},
		},
	});
}

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
		if (pageObj.properties.Slug.type === 'rich_text' && pageObj.properties.Slug.rich_text.some((text) => text.plain_text.includes(' '))) {
			await updateSlug(pageObj);
		}
	});

	await Promise.all(processPromises);
}

main().catch((error) => {
	console.error('An error occurred:', error);
	process.exit(1);
});
