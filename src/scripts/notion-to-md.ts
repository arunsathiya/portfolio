import { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
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
	const month = date.toLocaleString('default', { month: 'short' });
	const day = date.getDate().toString().padStart(2, '0');
	const year = date.getFullYear();
	return `${month} ${day} ${year}`;
}

function formatDateForFolder(dateString: string): string {
	return new Date(dateString).toISOString().split('T')[0];
}

async function processPage(page: PageObjectResponse) {
	const pageId = page.id;
	const mdblocks = await n2m.pageToMarkdown(pageId);
	const mdString = n2m.toMarkdownString(mdblocks);

	const title =
		page.properties.Title.type === 'title' && page.properties.Title.title.length > 1
			? page.properties.Title.title.map((t) => t.plain_text.trim()).join(' ')
			: page.properties.Title.type === 'title'
				? page.properties.Title.title[0]?.plain_text.trim()
				: 'Untitled';
	const slug =
		page.properties.Slug.type === 'rich_text'
			? page.properties.Slug.rich_text[0]?.plain_text.trim().toLowerCase().replace(/\s+/g, '-')
			: '';
	const description = page.properties.Description.type === 'rich_text' ? page.properties.Description.rich_text[0]?.plain_text.trim() : '';

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

	// Use the Date property for folder name as well
	let folderDate = '';
	if (page.properties.Date && page.properties.Date.type === 'date') {
		folderDate = formatDateForFolder(page.properties.Date.date?.start || '');
	} else {
		folderDate = formatDateForFolder(page.created_time);
	}

	const folderName = `${folderDate}-${slug}`;
	const dir = `./src/content/blog/${folderName}`;
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	const filePath = path.join(dir, 'index.md');
	const content = `---
title: "${title}"
seoTitle: "${title}"
slug: "${slug}"
description: "${description}"
pubDate: '${pubDate}'
updatedDate: '${updatedDate}'
tags: ${JSON.stringify(tags)}
coverImage: './image.webp'
---

${mdString.parent.replace(/\n\n/g, '\n')}`;

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
