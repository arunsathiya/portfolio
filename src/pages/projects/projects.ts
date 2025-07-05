export interface Project {
	name: string;
	demoLink: string;
	tags?: string[];
	description?: string;
	postLink?: string;
	demoLinkRel?: string;
	image?: string;
	[key: string]: any;
}

export const projects: Project[] = [
	{
		name: 'portfolio',
		description:
			'Astro-based portfolio with blog served from Notion and Cloudflare R2, supported by Cloudflare Workers, Cloudflare Queues, Replicate and GitHub API.',
		demoLink: 'https://github.com/arunsathiya/portfolio',
		tags: ['Notion', 'GitHub', 'DevOps'],
		image: 'https://repository-images.githubusercontent.com/692625109/595932d7-6bfa-4dc6-95e2-7cfb16b8775e',
	},
	{
		name: 'portfolio-workers',
		description: 'Cloudflare Workers logic that supports the portfolio website',
		demoLink: 'https://github.com/arunsathiya/portfolio-workers',
		tags: ['Notion', 'Cloudflare', 'DevOps'],
		image: 'https://repository-images.githubusercontent.com/850488767/60df865d-4117-42ff-b82b-c798df8e7d2b',
	},
	{
		name: 'set-output-janitor',
		description: 'Automated set-output replacements with GitHub GraphQL API',
		demoLink: 'https://github.com/arunsathiya/set-output-janitor',
		tags: ['GitHub', 'DevOps'],
		image: 'https://repository-images.githubusercontent.com/742774479/b7628449-f1e0-4b18-a63f-0a5f0343c9a6',
	},
	{
		name: 'gh-ssh-import',
		description: 'Upload local SSH keys and 1Password-stored keys (coming soon) to your GitHub account',
		demoLink: 'https://github.com/arunsathiya/gh-ssh-import',
		demoLinkRel: 'nofollow noopener noreferrer',
		tags: ['1Password', 'DevOps', 'GitHub'],
		image: 'https://repository-images.githubusercontent.com/694734469/a301ea5f-08df-4669-9649-5b604d703a67',
	},
	{
		name: 'download-google-doc',
		description: 'Go program to download a Google document in specific file types with a beautiful TUI',
		demoLink: 'https://github.com/arunsathiya/download-google-doc',
		demoLinkRel: 'nofollow noopener noreferrer',
		tags: ['Terminal', 'CLI', 'TUI', 'Google API'],
		image: 'https://repository-images.githubusercontent.com/700637629/c04e8ce4-17cc-470b-b75c-45d375d17f71',
	},
];
