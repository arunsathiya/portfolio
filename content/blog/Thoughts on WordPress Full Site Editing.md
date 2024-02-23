---
external: false
notion: 5a3bbbf2-7913-423e-bcb9-b0d544858e0a
title: Thoughts on WordPress Full Site Editing
slug: thoughts-on-wordpress-full-site-editing
description: I recently redesigned my website's homepage and blog post views using the new WordPress Full Site Editing experience. Read about my experience on this post.
date: 2021-09-28
---

For years, design on WordPress had been in the form of PHP templates bundled together as a WordPress theme. The templates apply to specific content as desginated by the [WordPress Template Hierarchy](https://developer.wordpress.org/themes/basics/template-hierarchy/). The largest issue with this approach would be that anyone wanting a custom design on their site must have PHP skills to write theme code.

Full Site Editing (FSE) is changing that process. Those with programming knowledge can design custom designs for their pages, posts or even for search archives or 404 pages. This is largely possible, thanks to the extensible nature of Gutenberg blocks. They are now available for use on sidebars in the form of widgets, on the header and footer areas, in the form of Full Site Editing.

https://make.wordpress.org/test/handbook/full-site-editing-outreach-experiment/faq-for-fse-outreach-experiment

Personally, I wanted a theme that shows all of my blog posts on the homepage, but with a customization that only short posts display the full output and longer-form posts require the visitor to open the blog post to view it. I have tried many themes over the last few years, Twenty Nineteen, Twenty Twenty and Spearhead, and everything involved a lot of CSS hack to display the output I wanted. After trying Blockbase with Full Site Editing, I have come to a conclusion that this is the future.

## New design with Blockbase and Full Site Editing

Right now, my homepage looks as shown below, this is a two column layout:

![9fec7-image-3.png](https://blogarunsathiya.files.wordpress.com/2022/07/9fec7-image-3.png?w=1024&h=580)

The content on the right isn't my sidebar. Rather is the right column of my homepage's FSE editor. For comparison, my editor view is as shown below:

![37c74-image-4.png](https://blogarunsathiya.files.wordpress.com/2022/07/37c74-image-4.png?w=1024&h=519)

Likewise, here's a comparison of the single blog post view:

![06ce5-image-5.png](https://blogarunsathiya.files.wordpress.com/2022/07/06ce5-image-5.png?w=1024&h=580)

![73643-image-6.png](https://blogarunsathiya.files.wordpress.com/2022/07/73643-image-6.png?w=1024&h=519)

See how the editor looks very similar to a blog post or page editor?

## Things that I would like to see improved

### Block navigator to be visible by default

Most people don't realize that a block navigator is available at the top left, next to the undo and redo icons. I know this because I have work in customer support and I have seen hundreds of customers try to navigate or edit blocks from the editor view. When there are many blocks on screen, it becomes tricky to choose the one you mean to edit. That's when the block navigator helps.

If I remember correctly, Elementor automatically shows their sidebar whenever one opens the editor view. A similar design would be neat here.

It's possible that this is already on Gutenberg's (which is a open source, community-driven project) radar already. I haven't looked yet.

### Different templates for different widths

This was my most frustrating issue when I started building the new design. Blocks come with intelligent design guidelines, like a 2 column block automatically changing its orientation to vertical mode when the visible screen space is less. But this came with a challenge that the right column, which is moved to the bottom on mobile widths, wouldn't have enough space between itself and the footer-located blocks.

I tried a bunch of CSS-based workarounds, but eventually, I decided that it would be a good idea to have two versions of the same content. That's why you can see my index template editor to have two "Query loop" blocks, where one is placed within a columns block and one without a columns block.

And I hide each "Query loop" block using CSS, on certain widths.

[View this gist on GitHub](https://gist.github.com/arunsathiya/7a72d68b2857deefc0613bd1cd08f63e)

If you inspect the source code of my index page, you can see two "Query loop" blocks. That's not ideal. That's not a good idea in terms of SEO either. I am yet to read more about the impllications of doing this, but for now, I am happy with this approach.

### Importing template design

I am able to export template designs using a handy option at the top right of the template editor. But it's not clear how I can import them today. [I asked about it on the community forums for now](https://wordpress.org/support/topic/import-full-site-editing-templates/?view=all).

I tried copying the full content from the top right menu, and pasting that on a different site's template editor, but I couldn't get the same design. I suspect that happens because some plugin-blocks plugins that I used on my first site's template editor are not activated on the other site. I didn't give this a good look as I was short on time and ended up fixing the missing block settings (like padding settings and custom CSS selectors) manually.

### Block breakage when certain settings are applied

Only one example comes to mind at the moment. When a "Post title" block is added to a template editor, and when it is marked as to appear as a link, the editor view breaks. [I have reported this on the Gutenberg project repository](https://github.com/WordPress/gutenberg/issues/35174).

There was another issue with a block, but I don't remember it at the moment.

---

Overall, like any software, WordPress Full Site Editing is not perfect. But the community and my colleagues at Automattic are hard at work. I imagine Full Site Editing to be the gold standard of website building experience in the coming years. If you wish to participate in the testing, the instructions below can help.

https://make.wordpress.org/test/handbook/full-site-editing-outreach-experiment/how-to-test-fse
