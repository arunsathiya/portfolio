import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

const ALLOWED_USER_AGENTS = [
  'wordpress.com; public-api.wordpress.com',
  'wordpress.com',
  'jetpack',
  'wp-android',
  'wp-iphone',
];

function isAllowedUserAgent(userAgent) {
  return ALLOWED_USER_AGENTS.some(allowed => userAgent?.toLowerCase().includes(allowed.toLowerCase()));
}

function cleanContent(content) {
  return content
    .replace(/^import.*astro';?\n?/gm, '')
    .replace(/<R2Image.*?\/>/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+?)\)/g, '<a href="$2">$1</a>')
    .replace(/\n\n/g, '<br><br>')
    .trim();
}

export async function GET(context) {
  const posts = await getCollection('blog');
  const userAgent = context.request.headers.get('user-agent');

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      ...post.data,
      link: `/${post.slug}/`,
      description: post.data.tags?.includes('Asides') || isAllowedUserAgent(userAgent)
        ? cleanContent(post.body)
        : `${post.data.description} <a href="${context.site}${post.slug}/">Read full post</a>.`
    })),
  });
}
