import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

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

(async () => {
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!databaseId) {
        throw new Error("NOTION_DATABASE_ID is not set in the environment variables");
    }

    const databaseQuery = await notion.databases.query({
        database_id: databaseId,
    });

    for (const page of databaseQuery.results) {
        const pageId = page.id;
        const mdblocks = await n2m.pageToMarkdown(pageId);
        const mdString = n2m.toMarkdownString(mdblocks);
        const pageInfo = await notion.pages.retrieve({ page_id: pageId }) as PageObjectResponse;

        const title = pageInfo.properties.Title.type === 'title' 
            ? pageInfo.properties.Title.title[0]?.plain_text.trim() 
            : 'Untitled';
        const slug = pageInfo.properties.Slug.type === 'rich_text'
            ? pageInfo.properties.Slug.rich_text[0]?.plain_text.trim().toLowerCase().replace(/\s+/g, '-')
            : '';
        const description = pageInfo.properties.Description.type === 'rich_text'
            ? pageInfo.properties.Description.rich_text[0]?.plain_text.trim()
            : '';
        const pubDate = formatDate(pageInfo.created_time);
        const updatedDate = formatDate(pageInfo.last_edited_time);

        const folderDate = formatDateForFolder(pageInfo.created_time);
        const folderName = `${folderDate}-${slug}`;
        const dir = `./src/content/blog/${folderName}`;
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const filePath = path.join(dir, "index.md");
        const content = `---
title: "${title}"
seoTitle: "${title}"
slug: "${slug}"
description: "${description}"
pubDate: '${pubDate}'
updatedDate: '${updatedDate}'
tags: []
coverImage: './image.webp'
---

${mdString.parent.replace(/\n\n/g, "\n")}`;

        fs.writeFileSync(filePath, content);
        console.log(`Created/Updated: ${filePath}`);
    }
})().catch((error) => {
    console.error("An error occurred:", error);
    process.exit(1);
});