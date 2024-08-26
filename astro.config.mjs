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
			noExternal: ['!node:fs'],
		},
	},
});
