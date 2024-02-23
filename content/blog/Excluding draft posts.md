---
external: false
notion: 96d739fd-bb00-41c9-9d6e-e06690dccf3b
title: Excluding draft posts from search index
slug: excluding-draft-posts
description: If you are looking for a way to excluding draft posts from being indexed on the search engines, Yoast SEO offers filters to achieve that.
date: 2021-08-13
---

> Note: As of Feb 2024, I have moved to a Astro-based website deployed to the edge with Fastly Compute, with Notion as a backend and GitHub Actions as my build tool.

For a while, I have been thinking about excluding draft posts from search engines' indexes. When I say draft posts, I am talking about the blog posts that aren't worthy of being indexed; those that aren't subjected to the level of quality that I expect the public to read. Think of draft blog posts similar to tweets. [I have been trying to use my blog as a source of my thoughts](https://www.notion.so/2021/01/19/blog-as-a-replacement-for-twitter/), while being cross-posted to other social networks.

That's why I started classifying my blog posts into two categories: [links](https://blogarunsathiya.wordpress.com/category/links/) and [posts](https://blogarunsathiya.wordpress.com/category/posts/).

Links are often short posts without an image, links or a featured image, or just a link with some content. On the other hand, posts are long-form articles that are worthy of being indexed on search engines for the general public to read.

Of course, anyone can read blog posts from the "links" category if they visit the blog.

## The setup

Yoast is my choice for search engine optimization today. With some search, I found that they offer some filters to `noindex`blog posts, and to exclude them from the sitemap as well.

[I found this snippet](https://github.com/Yoast/wordpress-seo/issues/387#issuecomment-477024877) to automatically mark all blog posts in the `links` category as `noindex`:

```text
add_filter( 'wpseo_robots', 'wpseo_robots' );
function wpseo_robots( $robotsstr ) {
	if ( is_single() && in_category( 1 ) ) {
		return 'noindex, follow';
	}
	return $robotsstr;
}
```

[I found another snippet](https://github.com/Yoast/wordpress-seo/issues/387#issuecomment-565716379) to exclude blog posts from this category on the sitemap:

```text
add_filter( 'wpseo_exclude_from_sitemap_by_post_ids', function( $excluded_posts_ids ) {
	$args = array(
		'fields'         => 'ids',
		'post_type'      => 'post',
		'category__in'   => array( 1 ),
		'posts_per_page' => -1,
	);
	return array_merge( $excluded_posts_ids, get_posts( $args ) );
} );
```

Yoast has a built-in functionality to exclude a category (available on the category editor view of the WordPress wp-admin dashboard) archives, but that's not quite my goal. My goal is to exclude individual posts.

My links category is basically the default WordPress category; that explains why the category ID is 1. This is particularly helpful when I blog on the go using the WordPress mobile app, meaning I don't have to mark the blog posts on the links category explicitly. WordPress will default the blog post to it, thus being `noindex`'d and removed from sitemaps.
