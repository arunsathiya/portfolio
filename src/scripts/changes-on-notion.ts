import { Client, isFullPageOrDatabase } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({
	auth: process.env.NOTION_SECRET,
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

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
		await retryUpdate(pageObj.id);
	});

	await Promise.all(processPromises);
}

async function retryUpdate(pageId: string): Promise<void> {
	let retries = 0;
	while (retries < MAX_RETRIES) {
		try {
			await addIconAndCover(pageId);
			return;
		} catch (error) {
			if (error instanceof Error && error.message.includes('Rate limited')) {
				retries++;
				console.log(`Rate limited on page ${pageId}, retry attempt ${retries}, retrying in ${RETRY_DELAY}ms`);
				await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * 2 ** retries));
			} else {
				throw error;
			}
		}
	}
	throw new Error(`Failed to update page ${pageId} after ${MAX_RETRIES} retries`);
}

async function addIconAndCover(pageId: string): Promise<void> {
	const page = await notion.pages.retrieve({ page_id: pageId });

	const updates: any = {};

	if (isFullPageOrDatabase(page) && !page.icon) {
		updates.icon = {
			type: 'emoji',
			emoji: '🚀',
		};
	}

	if (isFullPageOrDatabase(page) && !page.cover) {
		const coverOptions = [
			{ type: 'solid', color: 'red' },
			{ type: 'solid', color: 'blue' },
			{ type: 'solid', color: 'yellow' },
			{ type: 'gradient', number: '8' },
			{ type: 'gradient', number: '4' },
			{ type: 'gradient', number: '2' },
		];

		const randomCover = coverOptions[Math.floor(Math.random() * coverOptions.length)];

		const getCoverUrl = (cover: typeof randomCover) => {
			if (cover.type === 'solid') {
				return `https://www.notion.so/images/page-cover/solid_${cover.color}.png`;
			} else {
				return `https://www.notion.so/images/page-cover/gradients_${cover.number}.png`;
			}
		};

		updates.cover = {
			type: 'external',
			external: {
				url: getCoverUrl(randomCover),
			},
		};
	}

	if (Object.keys(updates).length > 0) {
		await notion.pages.update({
			page_id: pageId,
			...updates,
		});
		console.log(`Updated page ${pageId} with ${Object.keys(updates).join(' and ')}`);
	} else {
		console.log(`No updates needed for page ${pageId}`);
	}
}

main().catch((error) => {
	console.error('An error occurred:', error);
	process.exit(1);
});
