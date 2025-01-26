export const prerender = false;

import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

const WP_USER_AGENT_PATTERNS = ['wp.com', 'wp-desktop', 'wp-iphone', 'wp-android'];

function isAllowedUserAgent(userAgent) {
  return userAgent && WP_USER_AGENT_PATTERNS.some(pattern =>
    userAgent.toLowerCase().includes(pattern.toLowerCase())
  );
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
