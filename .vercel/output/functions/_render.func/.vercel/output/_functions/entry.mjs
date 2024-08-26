import { renderers } from './renderers.mjs';
import { c as createExports } from './chunks/entrypoint_CmsGQrYl.mjs';
import { manifest } from './manifest_CQtcWB3T.mjs';
import { onRequest } from './_noop-middleware.mjs';

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/404.astro.mjs');
const _page2 = () => import('./pages/about.astro.mjs');
const _page3 = () => import('./pages/api/signedurl.astro.mjs');
const _page4 = () => import('./pages/posts.astro.mjs');
const _page5 = () => import('./pages/projects/projects.astro.mjs');
const _page6 = () => import('./pages/projects.astro.mjs');
const _page7 = () => import('./pages/rss.xml.astro.mjs');
const _page8 = () => import('./pages/tags/_tag_.astro.mjs');
const _page9 = () => import('./pages/tags.astro.mjs');
const _page10 = () => import('./pages/index.astro.mjs');
const _page11 = () => import('./pages/_---slug_.astro.mjs');

const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/404.astro", _page1],
    ["src/pages/about.astro", _page2],
    ["src/pages/api/signedUrl.ts", _page3],
    ["src/pages/posts/index.astro", _page4],
    ["src/pages/projects/projects.ts", _page5],
    ["src/pages/projects/index.astro", _page6],
    ["src/pages/rss.xml.js", _page7],
    ["src/pages/tags/[tag]/index.astro", _page8],
    ["src/pages/tags/index.astro", _page9],
    ["src/pages/index.astro", _page10],
    ["src/pages/[...slug].astro", _page11]
]);
const serverIslandMap = new Map();

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    middleware: onRequest
});
const _args = {
    "middlewareSecret": "4fd0ab0e-9cbf-4b3b-a908-5bc3d880036d",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;

export { __astrojsSsrVirtualEntry as default, pageMap };
