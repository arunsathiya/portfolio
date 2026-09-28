This is the user's personal site: an Astro 5 blog (`apps/web`, Vercel, auto-deploys on push to main), Cloudflare Workers (`apps/workers`: Notion webhooks, image generation, asset serving, GitHub commits; R2, KV, Queues, cron; deployed by hand), shared utilities (`packages/shared`) and Supabase migrations. Follow AGENTS.md.

Check, where relevant:

- Content pipeline: Notion → Workers → MDX commit → Vercel build must keep working. Blog posts in `src/content/blog/` are edited only through Notion; flag direct edits to them.
- Workers: bindings, secrets and queue/cron names match `wrangler.toml`; webhook signature checks stay in place; no secret is logged or committed.
- Database: Supabase migrations are hard to undo. Check what a migration drops or rewrites and whether the web app still reads what it expects.
- Web: the build passes (`bun build`), Tailwind usage follows AGENTS.md (no `@apply` outside rendered Markdown), layout changes still work on mobile and in dark mode. Do not judge visual taste; flag only breakage you can show.
- Claims: "it works" or "fixed" needs a build, test or dev-server check in the log.
- Project rules: Conventional Commits; `WORKLOG.local.md` kept current on each steer.
