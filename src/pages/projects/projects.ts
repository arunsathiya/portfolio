export interface Project {
	name: string;
	demoLink: string;
	tags?: string[];
	description?: string;
	postLink?: string;
	demoLinkRel?: string;
	[key: string]: any;
}

export const projects: Project[] = [
	{
		name: 'portfolio',
		description: 'Astro based portfolio with blog served from Notion and Cloudflare R2, supported by Cloudflare Workers, Cloudflare Queues, Replicate and GitHub API.',
		demoLink: 'https://github.com/arunsathiya/portfolio',
		tags: ['Notion', 'GitHub', 'DevOps'],
	},
	{
		name: 'portfolio-workers',
		description: 'Cloudflare Workers logic that supports the portfolio site.',
		demoLink: 'https://github.com/arunsathiya/portfolio-workers',
		tags: ['Notion', 'Cloudflare', 'DevOps'],
	},
	{
		name: 'set-output-janitor',
		description: 'Automated set-output replacements with GitHub GraphQL API',
		demoLink: 'https://github.com/arunsathiya/set-output-janitor',
		tags: ['GitHub', 'DevOps'],
	},
	{
		name: 'gh-ssh-import',
		description: 'Upload local SSH keys and 1Password-stored keys (coming soon) to your GitHub account',
		demoLink: 'https://github.com/arunsathiya/gh-ssh-import',
		demoLinkRel: 'nofollow noopener noreferrer',
		tags: ['1Password', 'DevOps', 'GitHub'],
	},
	{
		name: 'download-google-doc',
		description: 'Go program to download a Google document in specific file types with a beautiful TUI',
		demoLink: 'https://github.com/arunsathiya/download-google-doc',
		demoLinkRel: 'nofollow noopener noreferrer',
		tags: ['Terminal', 'CLI', 'TUI', 'Google API'],
	},
];
