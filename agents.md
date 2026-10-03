# agents.md

Guidance for Claude Code when working with this repository.

## Communication

I am a bad reader. Be precise in your suggestions and discussions. Avoid long explanations unless I explicitly ask for them.

## Repository Structure

```
portfolio/
├── apps/
│   ├── web/        # Astro blog/portfolio (Vercel)
│   └── workers/    # Cloudflare Workers API
├── packages/
│   └── shared/     # Notion, S3, and date utilities
└── package.json    # Bun workspace config
```

## Commands

From root: `bun dev` (Astro), `bun dev:workers` (Workers), `bun build`, `bun deploy:workers`.

Content sync: `bun notion-to-md` converts Notion pages to MDX. `bun notion-format` syncs and formats.

Formatting: `bun format:check` and `bun format:write` via Prettier.

## Content Pipeline

Notion serves as the CMS. When pages are published, Notion webhooks trigger Workers which convert pages to MDX, format with Prettier, and commit directly to GitHub via GraphQL. This triggers a Vercel rebuild automatically.

The "Ship All" feature queues multiple pages via Cloudflare Queues, coordinating them into a single commit. Cron jobs handle tag caching, slug synchronization, and pending batch cleanup.

## Image Handling

Blog cover images are generated using Claude (for prompts) and Replicate (for generation), then stored in R2. The `/assets/*` route streams images from the `PORTFOLIO_BUCKET` R2 binding, with ETag (304) and range (206) support.

## Apps

**web**: Astro 5 with MDX, Tailwind, and content collections. Deploys to Vercel (root directory `apps/web`). Avoid `@apply` in Tailwind except for styling rendered Markdown/MDX content where inline classes aren't possible. Blog posts live in `src/content/blog/` but should only be edited via Notion.

**workers**: Handles webhooks, image generation, asset serving, and GitHub commits. Uses R2 for storage, KV for caching, and Queues for async processing. Deploy with `bun deploy:workers` or `wrangler deploy`.

**shared**: Common utilities for Notion API, S3/R2 configuration, and date formatting. Used by both apps.

## Observability

Workers Logs, Traces and Issues are on in `apps/workers/wrangler.toml`, with source maps uploaded on deploy. Errors that are caught still reach Issues if you pass the error to `console.error()`. Check them in the dashboard (Workers → portfolio-workers → Issues), or with `cf observability issues list`.

## Cloudflare CLIs

- `wrangler` (project dev dependency in `apps/workers`): dev, deploy, types. `wrangler.toml` is the source of truth for routes and bindings.
- `cf` (global, `bun add -g cf`): the full Cloudflare API, for things wrangler doesn't cover (zones, DNS, R2 objects, observability). Find commands with `cf cli search "<task>"`.
- Bun enforces a 7-day `minimum-release-age`, so the newest versions may not install yet.

## Environment Variables

Workers (via `wrangler secret`): `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `NOTION_SIGNATURE_SECRET`, `GITHUB_PAT`, `DISPATCH_SECRET`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `ANTHROPIC_API_KEY`, `REPLICATE_API_TOKEN`, `REPLICATE_WEBHOOK_SIGNING_KEY`, `IMAGE_GENERATION_SECRET`, `R2_BUCKET_NAME`.

Web (Vercel dashboard): `NOTION_TOKEN` for local scripts.

## Workflow

Use conventional commits (`fix:`, `feat:`, `chore:`, `docs:`). Commit incrementally and push immediately. Vercel auto-deploys web on push to main. Workers require manual deploy.
