import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context) {
  const posts = await getCollection('blog');
  const cleanContent = (content) => {
    return content
      .replace(/^import.*astro';?\n?/gm, '')
      .replace(/<R2Image.*?\/>/g, '')
      .replace(/\n+/g, ' ')
      .trim();
  };
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      ...post.data,
      link: `/${post.slug}/`,
      description: post.data.tags?.includes('Asides')
        ? cleanContent(post.body)
        : `${post.data.description} <a href="${context.site}/${post.slug}/">Read full post</a>`
    })),
  });
}
