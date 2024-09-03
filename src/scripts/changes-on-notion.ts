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

async function updateSlugFrontmatter(page: PageObjectResponse) {
	await notion.pages.update({
		page_id: page.id,
		properties: {
			'Slug frontmatter': {
				type: 'rich_text',
				rich_text: [
					{
						type: 'text',
						text: {
							content: page.properties.Slug.type === 'rich_text' ? page.properties.Slug.rich_text[0]?.plain_text : '',
						},
					},
				],
			},
		},
	});
}

async function updateDateSlugCombo(page: PageObjectResponse) {
	const date = page.properties.Date.type === 'date' ? page.properties.Date.date?.start : null;
	const slug =
		page.properties.Slug.type === 'rich_text'
			? page.properties.Slug.rich_text[0]?.plain_text.trim().toLowerCase().replace(/\s+/g, '-')
			: '';
	const dateObj = new Date(date ?? '');
	const formattedDate = dateObj.toISOString().slice(0, 10);
	const dateSlugCombo = `${formattedDate}-${slug}`;
	await notion.pages.update({
		page_id: page.id,
		properties: {
			'Date slug combo frontmatter': {
				type: 'rich_text',
				rich_text: [
					{
						type: 'text',
						text: {
							content: dateSlugCombo,
						},
					},
				],
			},
		},
	});
}

async function updateDate(page: PageObjectResponse) {
	const date = page.properties.Date.type === 'date' ? page.properties.Date.date?.start : null;
	if (date) {
		const dateObj = new Date(date);
		const formattedDate = dateObj.toISOString().slice(0, 10);
		await notion.pages.update({
			page_id: page.id,
			properties: {
				'Date frontmatter': {
					rich_text: [
						{
							type: 'text',
							text: {
								content: formattedDate,
							},
						},
					],
				},
			},
		});
	}
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
		if (pageObj.properties['Date frontmatter']?.type === 'rich_text' && pageObj.properties['Date frontmatter'].rich_text[0] == undefined) {
			await updateDate(pageObj);
		}
		if (pageObj.properties['Slug frontmatter']?.type === 'rich_text' && pageObj.properties['Slug frontmatter'].rich_text[0] == undefined) {
			await updateSlugFrontmatter(pageObj);
		}
		if (
			pageObj.properties['Date slug combo frontmatter']?.type === 'rich_text' &&
			pageObj.properties['Date slug combo frontmatter'].rich_text[0] == undefined
		) {
			await updateDateSlugCombo(pageObj);
		}
	});

	await Promise.all(processPromises);
}

main().catch((error) => {
	console.error('An error occurred:', error);
	process.exit(1);
});
