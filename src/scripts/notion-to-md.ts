import { Client } from '@notionhq/client';
import type {
	BlockObjectResponse,
	ImageBlockObjectResponse,
	PageObjectResponse,
	PartialBlockObjectResponse,
	RichTextItemResponse,
	TextRichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { uploadImage } from '@src/utils/s3/uploadImage';
import dotenv from 'dotenv';
import fs from 'fs';
import { NotionToMarkdown } from 'notion-to-md';
import path from 'path';
import sortKeys from 'sort-keys';

dotenv.config();

const notion = new Client({
	auth: process.env.NOTION_SECRET,
});

const n2m = new NotionToMarkdown({
	notionClient: notion,
	config: {
		parseChildPages: false,
		separateChildPage: false,
	},
});

function formatDate(dateString: string): string {
	const date = new Date(dateString);
	const month = date.toLocaleString('default', { month: 'short', timeZone: 'UTC' });
	const day = date.getUTCDate().toString().padStart(2, '0');
	const year = date.getUTCFullYear();
	return `${month} ${day} ${year}`;
}

function formatDateForFolder(dateString: string): string {
	return new Date(dateString).toISOString().split('T')[0];
}

type NotionClient = InstanceType<typeof Client>;
type UpdateBlockParameters = Parameters<NotionClient['blocks']['update']>[0];

function isTextRichTextItem(item: RichTextItemResponse): item is TextRichTextItemResponse {
	return item.type === 'text';
}

function isParagraphBlock(block: BlockObjectResponse | PartialBlockObjectResponse): block is BlockObjectResponse & { type: 'paragraph' } {
	return 'type' in block && block.type === 'paragraph';
}

async function processPage(page: PageObjectResponse) {
	const pageId = page.id;

	const searchString = 'blogarunsathiya.wordpress.com';
	const replaceString = 'www.arun.blog';

	const blocks = await notion.blocks.children.list({
		block_id: pageId,
	});

	for (const block of blocks.results) {
		if (isParagraphBlock(block)) {
			let isBlockModified = false;
			const updatedRichText = block.paragraph.rich_text.map((textBlock) => {
				if (isTextRichTextItem(textBlock) && textBlock.text.link?.url.includes(searchString)) {
					isBlockModified = true;
					return {
						type: 'text',
						text: {
							content: textBlock.text.content,
							link: {
								url: textBlock.text.link.url
									.replace(new RegExp(searchString, 'g'), replaceString)
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

	const mdblocks = await n2m.pageToMarkdown(pageId);
	const title =
		page.properties.Title.type === 'title' && page.properties.Title.title.length > 1
			? page.properties.Title.title.map((t) => t.plain_text.trim()).join(' ')
			: page.properties.Title.type === 'title'
				? page.properties.Title.title[0]?.plain_text.trim()
				: 'Untitled';
	const slug =
		page.properties.Slug.type === 'formula' && page.properties.Slug?.formula?.type == 'string'
			? (page.properties.Slug.formula?.string as string)
			: '';
	const description = page.properties.Description.type === 'rich_text' ? page.properties.Description.rich_text[0]?.plain_text.trim() : '';

	for (let i = 0; i < mdblocks.length; i++) {
		const block = mdblocks[i];
		if (block.type === 'image') {
			const imageUrl = block.parent.match(/\((.*?)\)/)?.[1];
			if (imageUrl) {
				try {
					const blockId = block.blockId || `fallback-${i}`;
					const imageKey = `${slug}-${blockId}${path.extname(imageUrl.split('?')[0])}`;
					await uploadImage(imageUrl, slug, blockId);
					const blockObj = (await notion.blocks.retrieve({ block_id: blockId })) as ImageBlockObjectResponse;
					const caption = blockObj.image?.caption[0]?.plain_text || '';
					mdblocks[i].parent = `<R2Image imageKey="blog/assets/${imageKey}" alt="${caption}" />`;
				} catch (error) {
					console.error(`Failed to upload image: ${imageUrl}`, error);
				}
			}
		}
	}

	const mdString = n2m.toMarkdownString(mdblocks);
	const convertedMdString = mdString.parent.replace(/\[(embed|video)\]\((https?:\/\/\S+)\)/g, '$2');

	// Use the Date property instead of created_time
	let pubDate = '';
	if (page.properties.Date && page.properties.Date.type === 'date') {
		pubDate = formatDate(page.properties.Date.date?.start || '');
	} else {
		pubDate = formatDate(page.created_time);
	}

	const updatedDate = formatDate(page.last_edited_time);

	let tags: string[] = [];
	let tagColors: Record<string, string> = {};
	if (page.properties.Tags && page.properties.Tags.type === 'multi_select') {
		tags = page.properties.Tags.multi_select.map((tag) => tag.name);
		page.properties.Tags.multi_select.forEach((tag) => {
			tagColors[tag.name] = tag.color;
		});
	}

	// Use the Date property for folder name as well, because it's different from the page creation date
	let folderDate = '';
	if (page.properties.Date && page.properties.Date.type === 'date') {
		folderDate = formatDateForFolder(page.properties.Date.date?.start || '');
	} else {
		folderDate = formatDateForFolder(page.created_time);
	}

	const blogDir = './src/content/blog';
	const existingFolders = fs.readdirSync(blogDir);
	const existingFolder = existingFolders.find((folder) => folder.endsWith(`-${slug}`));
	if (existingFolder) {
		if (existingFolder !== `${folderDate}-${slug}`) {
			const oldDir = path.join(blogDir, existingFolder);
			const newDir = path.join(blogDir, `${folderDate}-${slug}`);
			fs.renameSync(oldDir, newDir);
		}
	}

	const dir = `./src/content/blog/${folderDate}-${slug}`;
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	const sourceImagePath = './src/scripts/image.webp';
	const destinationImagePath = path.join(dir, 'image.webp');
	if (fs.existsSync(sourceImagePath) && !fs.existsSync(destinationImagePath)) {
		fs.copyFileSync(sourceImagePath, destinationImagePath);
	} else {
		console.warn(`Warning: image.webp not found in scripts folder`);
	}

	const filePath = path.join(dir, 'index.mdx');
	const postContainsImages = mdblocks.some((block) => block.parent.includes('R2Image'));
	const content = `---
title: "${title}"
seoTitle: "${title}"
slug: "${slug}"
description: "${description}"
pubDate: '${pubDate}'
updatedDate: '${updatedDate}'
tags: ${JSON.stringify(tags)}
coverImage: "./image.webp"
---

${postContainsImages ? `import R2Image from 'src/components/R2Image.astro';` : ''}

${convertedMdString.replace(/\n\n/g, '\n')}`;

	fs.writeFileSync(filePath, content);
	console.log(`Created/Updated: ${filePath}`);
}

async function main() {
	const databaseId = process.env.NOTION_DATABASE_ID;
	if (!databaseId) {
		throw new Error('NOTION_DATABASE_ID is not set in the environment variables');
	}

	const databaseQuery = await notion.databases.query({
		database_id: databaseId,
	});

	const allTagColors: Record<string, string> = {};

	const processPromises = databaseQuery.results.map(async (page) => {
		const pageObj = page as PageObjectResponse;
		await processPage(pageObj);

		if (pageObj.properties.Tags && pageObj.properties.Tags.type === 'multi_select') {
			pageObj.properties.Tags.multi_select.forEach((tag) => {
				allTagColors[tag.name] = tag.color;
			});
		}
	});

	await Promise.all(processPromises);

	const tagColorsPath = path.join('./src/data', 'tagColors.json');
	fs.writeFileSync(tagColorsPath, JSON.stringify(sortKeys(allTagColors), null, 2));
}

main().catch((error) => {
	console.error('An error occurred:', error);
	process.exit(1);
});
