import mdx from '@astrojs/mdx';
import partytown from '@astrojs/partytown';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import { defineConfig } from 'astro/config';
import { autoNewTabExternalLinks } from './src/autoNewTabExternalLinks';

import vercel from '@astrojs/vercel/serverless';

// https://astro.build/config
export default defineConfig({
	site: 'https://www.arun.blog',
	output: 'server',
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
	adapter: vercel({
		routes: {
			include: ['/api/*'],
		},
	}),
});
