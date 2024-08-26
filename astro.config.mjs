import mdx from '@astrojs/mdx';
import partytown from '@astrojs/partytown';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import { defineConfig } from 'astro/config';
import { autoNewTabExternalLinks } from './src/autoNewTabExternalLinks';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
	site: 'https://www.arun.blog',
	output: 'hybrid',
	integrations: [mdx(), sitemap(), tailwind(), partytown()],
	markdown: {
		extendDefaultPlugins: true,
		rehypePlugins: [
			[
				autoNewTabExternalLinks,
				{
					domain: 'localhost:4321',
				},
			],
		],
	},
	adapter: cloudflare({
		routes: {
			extend: {
				include: ['/api/*'],
			},
		},
		platformProxy: {
			enabled: true,
		},
	}),
	vite: {
		ssr: {
			external: [
				'node:fs',
				'node:fs/promises',
				'node:path',
				'node:url',
				'node:assert',
				'node:async_hooks',
				'node:buffer',
				'node:crypto',
				'node:diagnostics_channel',
				'node:events',
				'node:process',
				'node:stream',
				'node:string_decoder',
				'node:test',
				'node:util',
				'node:perf_hooks',
				'node:module',
			],
		},
	},
});
