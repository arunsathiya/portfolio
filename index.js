const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const fs = require("fs");
// or
// import {NotionToMarkdown} from "notion-to-md";
require("dotenv").config();

const notion = new Client({
  auth: process.env.NOTION_SECRET,
});

// passing notion client to the option
const n2m = new NotionToMarkdown({
  notionClient: notion,
  config: {
    parseChildPages: true,
    separateChildPage: true,
  },
});

(async () => {
  const rootPageId = "af053880c57248e290c7ffefc4c88973";
  const rootMdblocks = await n2m.pageToMarkdown(rootPageId);
  const childPageBlocks = rootMdblocks.filter(
    (block) => block.type === "child_page"
  );

  for (const block of childPageBlocks) {
    const childPageId = block.blockId;
    const childMdblocks = await n2m.pageToMarkdown(childPageId);
    const mdString = n2m.toMarkdownString(childMdblocks);
    const page = await notion.pages.retrieve({ page_id: childPageId });
    const pageTitle = page.properties.title.title[0].plain_text.trimEnd();
    const filePath = `./content/blog/${pageTitle}.md`;

    const content = `---\nexternal: false\nnotion: ${childPageId}\ntitle: ${pageTitle}\ndescription: Auto-generated from Notion page\ndate: 2024-02-17\n---\n${mdString.parent.replace(
      /\n\n/g,
      "\n"
    )}`;
    fs.writeFileSync(filePath, content);
  }
})();
