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
    parseChildPages: false,
    separateChildPage: false,
  },
});

function normalizeString(str) {
  return str.toLowerCase().replace(/\s+/g, "-");
}

(async () => {
  const databaseQuery = await notion.databases.query({
    database_id: "8d62717492394debab4bea9262e3c066",
  });
  for (const page of databaseQuery.results) {
    const pageId = page.id;
    const mdblocks = await n2m.pageToMarkdown(pageId);
    const mdString = n2m.toMarkdownString(mdblocks);
    const pageInfo = await notion.pages.retrieve({ page_id: pageId });
    const pageTitle = pageInfo.properties.Title.title[0].plain_text.trimEnd();
    const pageSlug = pageInfo.properties.Slug.rich_text[0].plain_text.trimEnd();
    const pureSlug = normalizeString(
      pageInfo.properties.Slug.rich_text[0].plain_text.trimEnd()
    );
    const pageDescription =
      pageInfo.properties.Description.rich_text[0].plain_text.trimEnd();
    const pageDate = pageInfo.properties.Date.date.start;
    const filePath = `./content/blog/${pageSlug}.md`;
    const content = `---\nexternal: false\nnotion: ${pageId}\ntitle: ${pageTitle}\nslug: ${pureSlug}\ndescription: ${pageDescription}\ndate: ${pageDate}\n---\n${mdString.parent.replace(
      /\n\n/g,
      "\n"
    )}`;
    fs.writeFileSync(filePath, content);
  }
})();

module.exports = { normalizeString };
