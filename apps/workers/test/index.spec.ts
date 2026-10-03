// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Portfolio worker', () => {
  it('responds with Not Found for unknown routes (unit style)', async () => {
    const request = new IncomingRequest('http://example.com');
    // Create an empty context to pass to `worker.fetch()`.
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
    expect(await response.text()).toMatchInlineSnapshot(`"Not Found"`);
  });

  it('responds with Not Found for unknown routes (integration style)', async () => {
    const response = await SELF.fetch('https://example.com');
    expect(response.status).toBe(404);
    expect(await response.text()).toMatchInlineSnapshot(`"Not Found"`);
  });

  describe('/assets/*', () => {
    const key = 'assets/test.txt';

    it('streams the object from R2 with CORS and metadata', async () => {
      await env.PORTFOLIO_BUCKET.put(key, 'hello world', {
        httpMetadata: { contentType: 'text/plain' },
      });
      const response = await SELF.fetch(`https://example.com/${key}`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/plain');
      expect(response.headers.get('access-control-allow-origin')).toBe('https://www.arun.blog');
      expect(await response.text()).toBe('hello world');
    });

    it('returns 304 when the etag matches', async () => {
      const object = await env.PORTFOLIO_BUCKET.put(key, 'hello world');
      const response = await SELF.fetch(`https://example.com/${key}`, {
        headers: { 'If-None-Match': object!.httpEtag },
      });
      expect(response.status).toBe(304);
    });

    it('serves byte ranges', async () => {
      await env.PORTFOLIO_BUCKET.put(key, 'hello world');
      const response = await SELF.fetch(`https://example.com/${key}`, {
        headers: { Range: 'bytes=0-4' },
      });
      expect(response.status).toBe(206);
      expect(response.headers.get('content-range')).toBe('bytes 0-4/11');
      expect(await response.text()).toBe('hello');
    });

    it('returns 404 for missing objects', async () => {
      const response = await SELF.fetch('https://example.com/assets/missing.env');
      expect(response.status).toBe(404);
    });
  });
});
