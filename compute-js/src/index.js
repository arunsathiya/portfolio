/// <reference types="@fastly/js-compute" />
import { getServer } from "../static-publisher/statics.js";
const staticContentServer = getServer();

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));

async function handleRequest(event) {
  const req = event.request;
  const host = req.headers.get("Host");

  // Check for apex domain and redirect to www
  if (host && !host.startsWith("www.")) {
    const redirectURL = new URL(req.url);
    redirectURL.hostname = `www.${host}`;

    return new Response(null, {
      headers: {
        Location: redirectURL.toString(),
        "Cache-Control": "max-age=86400",
      },
      status: 301,
    });
  }

  // Serve static content
  const response = await staticContentServer.serveRequest(req);
  if (response != null) {
    return response;
  }

  // Return a 404 response if the content is not found
  return new Response("Not found", { status: 404 });
}
