// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { logOutgoingRequests } from '@osrs-tracker/logger';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app';
import { serverConfig } from './server-config';
import { collectLogs } from './testing/log-lines';
import { serve } from './testing/serve';
import { pageCache } from './utils/page-cache';

// The real engine needs a server build, these tests are about the Express app around it
const { handle } = vi.hoisted(() => ({ handle: vi.fn<(req: Request) => Promise<Response | null>>() }));
vi.mock('@angular/ssr/node', () => ({
  AngularNodeAppEngine: class {
    handle = handle;
  },
  createNodeRequestHandler: (app: unknown) => app,
  writeResponseToNodeResponse: async (
    response: Response,
    res: { status(code: number): { send(body: string): void } },
  ) => res.status(response.status).send(await response.text()),
}));

describe('createApp', () => {
  // A browser build with a chunk, an icon and a sitemap, so the static middleware has real files to serve
  serverConfig.browserDistFolder = mkdtempSync(join(tmpdir(), 'osrs-tracker-browser-'));
  writeFileSync(join(serverConfig.browserDistFolder, 'chunk-real.js'), 'export {};');
  writeFileSync(join(serverConfig.browserDistFolder, 'sitemap-items.xml'), '<urlset/>');
  mkdirSync(join(serverConfig.browserDistFolder, 'assets/icons'), { recursive: true });
  writeFileSync(join(serverConfig.browserDistFolder, 'assets/icons/coins.png'), 'png');
  afterAll(() => rmSync(serverConfig.browserDistFolder, { recursive: true }));

  let ready = true;
  const logs = collectLogs(); // Also keeps the request logs out of the test output
  const { app, metricsApp } = createApp({ isReady: () => ready, logger: logs.logger });
  const get = serve(app);
  const getMetrics = serve(metricsApp);

  beforeEach(() => {
    handle.mockReset().mockImplementation(async () => new Response('<html>rendered</html>'));
    logs.lines.splice(0);
  });
  afterEach(() => pageCache.clear());

  it('serves pre-rendered pages from the page cache, ignoring the query string', async () => {
    pageCache.set('/', '<html>cached</html>');

    for (const path of ['/', '/?utm_source=x']) {
      const res = await get(path);
      expect(res.headers.get('x-cache')).toBe('HIT');
      expect(res.headers.get('cache-control')).toContain('no-store');
      expect(await res.text()).toBe('<html>cached</html>');
    }
    expect(handle).not.toHaveBeenCalled();
  });

  it('renders other pages with Angular', async () => {
    const res = await get('/trackers/xp/ToxSick');

    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache')).toBe('MISS');
    expect(await res.text()).toBe('<html>rendered</html>');
  });

  it('gives rendered and cached pages a fresh CSP nonce that matches the header', async () => {
    const page = '<html><app-root ngcspnonce="CSP_NONCE_PLACEHOLDER"></app-root><script nonce="CSP_NONCE_PLACEHOLDER">';
    handle.mockImplementation(async () => new Response(page, { headers: { 'content-type': 'text/html' } }));
    pageCache.set('/', page);

    const nonces = [];
    for (const path of ['/', '/', '/trackers/xp/ToxSick']) {
      const res = await get(path);
      const nonce = res.headers.get('content-security-policy')!.match(/'nonce-([^']+)'/)![1];
      const body = await res.text();

      expect(body).not.toContain('CSP_NONCE_PLACEHOLDER');
      expect(body.match(/\w*nonce="[^"]+"/gi)).toEqual([`ngcspnonce="${nonce}"`, `nonce="${nonce}"`]);
      nonces.push(nonce);
    }
    expect(new Set(nonces).size).toBe(3);
  });

  it('passes the status Angular renders, so unknown routes are a 404', async () => {
    handle.mockImplementation(async () => new Response('<html>not found</html>', { status: 404 }));

    expect((await get('/nope')).status).toBe(404);
  });

  it('does not serve files from the page cache', async () => {
    pageCache.set('/robots.txt', 'cached');

    const res = await get('/robots.txt');

    expect(res.headers.get('x-cache')).toBeNull();
    expect(await res.text()).not.toBe('cached');
  });

  it('answers protocol-relative paths with a 404 without rendering or redirecting them', async () => {
    const res = await get('//evil.com');

    expect(res.status).toBe(404);
    expect(res.headers.get('location')).toBeNull();
    expect(handle).not.toHaveBeenCalled();
  });

  it('answers missing assets under a page path with a 404 without rendering them', async () => {
    for (const path of ['/trackers/price/chunk-x.js', '/trackers/xp/styles-X.css', '/chunk-gone.js']) {
      const res = await get(path);

      expect(res.status).toBe(404);
      expect(await res.text()).toBe('Not Found');
    }
    expect(handle).not.toHaveBeenCalled();
  });

  it('still serves existing assets', async () => {
    const res = await get('/chunk-real.js');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('export {};');
    expect(handle).not.toHaveBeenCalled();
  });

  it('caches hashed bundles for a year, other files for a day and revalidates the sitemaps every time', async () => {
    const cacheControl = async (path: string) => (await get(path)).headers.get('cache-control');

    expect(await cacheControl('/chunk-real.js')).toBe('public, max-age=31536000, immutable');
    expect(await cacheControl('/assets/icons/coins.png')).toBe('public, max-age=86400');
    expect(await cacheControl('/sitemap-items.xml')).toBe('no-cache');
  });

  it('answers the readiness probe with 503 until it is ready', async () => {
    ready = false;
    expect((await get('/healthy')).status).toBe(503);

    ready = true;
    expect((await get('/healthy')).status).toBe(200);
  });

  it('answers rendering errors with a generic 500 that does not leak the error', async () => {
    handle.mockRejectedValue(new Error('secret stack trace'));

    const res = await get('/trackers/price/4151');

    expect(res.status).toBe(500);
    expect(await res.text()).toBe('Internal Server Error');
    // Logged as one JSON line, stack included, so Loki keeps it together
    expect(logs.lines).toContainEqual(
      expect.objectContaining({
        level: 'error',
        type: 'uncaught',
        message: 'GET /trackers/price/4151 failed',
        error: expect.stringContaining('Error: secret stack trace\n    at '),
      }),
    );
  });

  it('logs the cache field of a request, but not for one the client aborted before the headers were sent', async () => {
    pageCache.set('/', '<html>cached</html>');
    await (await get('/')).text();
    let received!: () => void;
    const handled = new Promise<void>(resolve => (received = resolve));
    handle.mockImplementation(() => (received(), new Promise(() => undefined))); // A render the client gives up on
    const controller = new AbortController();
    const request = get('/trackers/price/4151', { signal: controller.signal }).catch(() => undefined);
    await handled;
    controller.abort();
    await request;

    await vi.waitFor(() => expect(logs.lines).toHaveLength(2));
    expect(logs.lines[0]).toMatchObject({ type: 'incoming', url: '/', cache: 'HIT' });
    expect(logs.lines[1]).toMatchObject({ type: 'incoming', url: '/trackers/price/4151', aborted: true });
    expect(logs.lines[1]).not.toHaveProperty('cache');
  });

  it('logs the requests a render makes with the page it was rendering', async () => {
    const stop = logOutgoingRequests({ logger: logs.logger }); // Also logs the test's own requests, without a page
    handle.mockImplementation(async () => (await get('/healthy'), new Response('<html>rendered</html>')));

    await (await get('/trackers/price/4151')).text();
    stop();

    const renderRequest = () => logs.lines.find(line => line['type'] === 'outgoing' && line['page']);
    await vi.waitFor(() => expect(renderRequest()).toBeDefined());
    expect(renderRequest()).toMatchObject({ url: expect.stringMatching(/\/healthy$/), page: '/trackers/price/4151' });
  });

  it('labels the request metrics by route, not by URL', async () => {
    await get('/trackers/xp/ToxSick');
    const metrics = await (await getMetrics('/metrics')).text();

    expect(metrics).toContain('path="/trackers/xp/:username"');
    expect(metrics).not.toContain('ToxSick');
  });
});
