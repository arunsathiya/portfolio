# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Development
- `bun dev` - Start development server
- `bun build` - Type check and build for production  
- `bun preview` - Preview production build locally

### Content Management
- `bun notion-to-md` - Convert Notion database to MDX blog posts
- `bun changes-on-notion` - Process Notion content changes
- `bun notion` - Run both Notion scripts sequentially
- `bun notion-format` - Run Notion conversion and format code

### Code Quality
- `bun format:check` - Check code formatting
- `bun format:write` - Format code using Prettier

### AWS S3 Utilities
- `bun list-buckets` - List S3 buckets
- `bun list-objects` - List objects in S3 bucket
- `bun list-objects-signed` - List objects with signed URLs

### Maintenance
- `bun clean-and-dev` - Clean cache, reinstall dependencies, format, and start dev server

## Architecture Overview

This is an Astro-based personal blog and portfolio website with the following key architectural components:

### Content Management Strategy
- **Primary CMS**: Notion database serves as the content management system
- **Content Pipeline**: Automated scripts convert Notion pages to MDX files in `src/content/blog/`
- **Blog Structure**: Each post is stored in a date-prefixed folder (e.g., `2025-01-09-shell-variables-in-json/`) containing `index.mdx` and `image.webp`
- **Content Schema**: Defined in `src/content/config.ts` with TypeScript validation for frontmatter

### Media Management
- **Image Storage**: Cloudflare R2 bucket for optimized image delivery
- **Upload Pipeline**: `src/utils/s3/uploadImage.ts` handles programmatic uploads
- **Component**: `R2Image.astro` component for rendering optimized images

### Key Technical Patterns

#### Content Collections
- Blog posts use Astro's content collections with strict TypeScript schemas
- Frontmatter validation ensures consistent metadata across posts
- Cover images must be at least 960px wide (enforced by schema)

#### Routing Strategy  
- File-based routing with dynamic routes in `src/pages/`
- Tag-based filtering at `/tags/[tag]/`
- Paginated post listings at `/posts/[page]`
- Catch-all route `[...slug].astro` for dynamic content

#### Styling Architecture
- Tailwind CSS for utility-first styling (never use `@apply` directive)
- Global styles in `src/styles/global.css`
- Scoped component styles in `.astro` files
- Typography plugin for blog content rendering

#### External Link Handling
- Custom rehype plugin `autoNewTabExternalLinks.ts` automatically opens external links in new tabs
- Configured in `astro.config.mjs` markdown processing

### Integration Points

#### Notion Integration
- Two-way sync between Notion database and local MDX files
- URL rewriting for internal links during content processing
- Tag color preservation in `src/data/tagColors.json`
- Image extraction and upload to R2 during conversion

#### Deployment
- Configured for Vercel deployment with hybrid output mode
- Static generation for most pages with server-side rendering capabilities
- Environment variables required: `NOTION_SECRET`, `NOTION_DATABASE_ID`

### File Structure Patterns
- Components in `src/components/` (both `.astro` and framework-specific)
- Layouts in `src/layouts/` with reusable layout components
- Utilities in `src/utils/` with domain-specific subdirectories
- Scripts in `src/scripts/` for build-time content processing

### Development Considerations
- TypeScript throughout with strict type checking
- Astro's partial hydration model - minimal client-side JavaScript
- Content-first architecture with performance optimization
- RSS feed generation for blog subscribers

## Workflow

### Git Commits
- Use conventional commit format (e.g., `fix:`, `feat:`, `chore:`, `docs:`)
- Commit incrementally as you make progress, not just at the end
- Push immediately after each commit
- Vercel automatically deploys on push to main

### Deployment
- Hosted on Vercel with automatic deployments from main branch
- Preview deployments created for pull requests
- No manual deployment steps required

## Important Notes

- Never modify blog post files in `src/content/blog/` directly - use Notion CMS instead
- Run `bun notion-format` after making content changes in Notion
- Environment variables are required for Notion integration and S3 operations
- The site uses hybrid output mode allowing both static and server-rendered pages