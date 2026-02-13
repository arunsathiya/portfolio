import { isFullPage } from '@notionhq/client';
import {
	createNotionClient,
	queryDatabase,
	isTextRichTextItem,
	isParagraphBlock,
	type PageObjectResponse,
	type UpdateBlockParameters,
} from '@portfolio/shared';
import dotenv from 'dotenv';

dotenv.config();

const notion = createNotionClient({
	auth: process.env.NOTION_SECRET!,
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function main() {
	const databaseId = process.env.NOTION_DATABASE_ID;
	if (!databaseId) {
		throw new Error('NOTION_DATABASE_ID is not set in the environment variables');
	}

	const databaseQuery = await queryDatabase(notion, {
		database_id: databaseId,
	});

	const processPromises = databaseQuery.results.map(async (page: any) => {
		const pageObj = page as PageObjectResponse;
		await retryUpdate(pageObj.id);
	});

	await Promise.all(processPromises);
}

async function onceOffUpdates(pageId: string): Promise<void> {
	const page = await notion.pages.retrieve({ page_id: pageId });
	if (!isFullPage(page)) {
		throw new Error(`Page ${pageId} is not a page or database`);
	}
	const blocks = await notion.blocks.children.list({
		block_id: pageId,
	});
	for (const block of blocks.results) {
		if (isParagraphBlock(block)) {
			let isBlockModified = false;
			const updatedRichText = block.paragraph.rich_text.map((textBlock) => {
				if (isTextRichTextItem(textBlock) && textBlock.text.link?.url.includes('arun.blog/blog/')) {
					isBlockModified = true;
					return {
						type: 'text',
						text: {
							content: textBlock.text.content,
							link: {
								url: textBlock.text.link.url
									.replace(/arun.blog\/blog\//g, 'arun.blog/')
									.replace(/\/\d{4}\/\d{2}\/\d{2}\//, '/post/')
									.replace(/\/tag\//, '/tags/'),
							},
						},
						annotations: textBlock.annotations,
					};
				}
				return textBlock;
			});

			if (isBlockModified) {
				try {
					await notion.blocks.update({
						block_id: block.id,
						type: 'paragraph',
						paragraph: {
							rich_text: updatedRichText,
						},
					} as UpdateBlockParameters);
					console.log(`Updated block ${block.id}`);
				} catch (error) {
					console.error(`Error updating block ${block.id}:`, error);
				}
			}
		}
	}
}

async function retryUpdate(pageId: string): Promise<void> {
	let retries = 0;
	while (retries < MAX_RETRIES) {
		try {
			await addIconAndCover(pageId);
			await onceOffUpdates(pageId);
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

	const iconUpdate = await addIcon(page as PageObjectResponse);
	const coverUpdate = await addCover(page as PageObjectResponse);

	const updates = { ...iconUpdate, ...coverUpdate };

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

async function addIcon(page: PageObjectResponse): Promise<any> {
	if (isFullPage(page) && !page.icon) {
		return {
			icon: {
				type: 'emoji',
				emoji: '🚀',
			},
		};
	}
	return {};
}

async function addCover(page: PageObjectResponse): Promise<any> {
	if (isFullPage(page) && !page.cover) {
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

		return {
			cover: {
				type: 'external',
				external: {
					url: getCoverUrl(randomCover),
				},
			},
		};
	}
	return {};
}

main().catch((error) => {
	console.error('An error occurred:', error);
	process.exit(1);
});
