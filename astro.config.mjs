import mdx from '@astrojs/mdx';
import partytown from '@astrojs/partytown';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import embeds from 'astro-embed/integration';
import { defineConfig } from 'astro/config';
import { autoNewTabExternalLinks } from './src/autoNewTabExternalLinks';

import vercel from '@astrojs/vercel/static';

// https://astro.build/config
export default defineConfig({
	site: 'https://www.arun.blog',
	output: 'hybrid',
	integrations: [embeds(), mdx(), sitemap(), tailwind(), partytown()],
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
	adapter: vercel(),
	vite: {
		ssr: {
			noExternal: ['@zachleat/snow-fall'],
		},
	},
});
