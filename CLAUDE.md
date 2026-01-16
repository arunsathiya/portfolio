# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a monorepo containing two applications:

```
portfolio/
├── apps/
│   ├── web/        # Astro blog/portfolio site (deploys to Vercel)
│   └── workers/    # Cloudflare Workers API (deploys to Cloudflare)
├── packages/       # Shared packages (future)
└── package.json    # Root workspace config
```

## Development Commands

### From Root (Recommended)
- `bun dev` - Start Astro dev server
- `bun dev:workers` - Start Workers dev server
- `bun build` - Type check and build for production
- `bun preview` - Preview production build locally
- `bun deploy:workers` - Deploy workers to Cloudflare

### Content Management
- `bun notion-to-md` - Convert Notion database to MDX blog posts
- `bun notion` - Run Notion sync scripts
- `bun notion-format` - Run Notion conversion and format code

### Code Quality
- `bun format:check` - Check code formatting
- `bun format:write` - Format code using Prettier

## Architecture Overview

### apps/web (Astro Site)

An Astro-based personal blog and portfolio website:

- **Deployment**: Vercel (set root directory to `apps/web`)
- **CMS**: Notion database serves as the content management system
- **Content**: MDX files in `apps/web/src/content/blog/`
- **Images**: Cloudflare R2 bucket for optimized image delivery

Key patterns:
- Content collections with TypeScript schemas
- File-based routing in `src/pages/`
- Tailwind CSS (never use `@apply` directive)
- Custom rehype plugin for external link handling

### apps/workers (Cloudflare Workers)

Backend services for the blog:

- **Deployment**: Cloudflare Workers via `wrangler deploy`
- **Functions**: Notion webhooks, AI image generation, asset serving
- **Storage**: R2 for images, KV for caching
- **Queues**: Async job processing for content updates

The workers commit MDX files directly to GitHub, triggering Vercel rebuilds.

## Workflow

### Git Commits
- Use conventional commit format (e.g., `fix:`, `feat:`, `chore:`, `docs:`)
- Commit incrementally as you make progress
- Push immediately after each commit

### Deployment
- **Web**: Vercel auto-deploys on push to main (root directory: `apps/web`)
- **Workers**: Run `bun deploy:workers` or deploy via Cloudflare dashboard

## Important Notes

- Never modify blog post files in `apps/web/src/content/blog/` directly - use Notion CMS
- Run `bun notion-format` after making content changes in Notion
- Environment variables are configured separately for each platform:
  - Vercel: configured in Vercel dashboard
  - Workers: configured via `wrangler secret`
