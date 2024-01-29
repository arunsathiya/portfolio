// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = "Arun";
export const SITE_DESCRIPTION =
  "Hello! I am a software engineer and open source contributor.";
export const TWITTER_HANDLE = "@arunsathiya";
export const MY_NAME = "Arun";

// setup in astro.config.mjs
const BASE_URL = new URL(import.meta.env.SITE);
export const SITE_URL = BASE_URL.origin;
