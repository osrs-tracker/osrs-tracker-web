// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app';
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
  const { app, metricsApp } = createApp();
  const get = serve(app);
  const getMetrics = serve(metricsApp);

  beforeEach(() => {
    handle.mockReset().mockImplementation(async () => new Response('<html>rendered</html>'));
    vi.spyOn(process.stdout, 'write').mockReturnValue(true); // Keeps the request logs out of the test output
  });
  afterEach(() => {
    pageCache.clear();
    vi.restoreAllMocks();
  });

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

  it('answers rendering errors with a generic 500 that does not leak the error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    handle.mockRejectedValue(new Error('secret stack trace'));

    const res = await get('/trackers/price/4151');

    expect(res.status).toBe(500);
    expect(await res.text()).toBe('Internal Server Error');
  });

  it('labels the request metrics by route, not by URL', async () => {
    await get('/trackers/xp/ToxSick');
    const metrics = await (await getMetrics('/metrics')).text();

    expect(metrics).toContain('path="/trackers/xp/:username"');
    expect(metrics).not.toContain('ToxSick');
  });
});
