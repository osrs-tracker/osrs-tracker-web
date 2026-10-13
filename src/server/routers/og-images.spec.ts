// @vitest-environment node
import type { Item, Player } from '@osrs-tracker/models';
import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collectLogs } from '../testing/log-lines';
import { serve } from '../testing/serve';
import {
  createOgImageRouter,
  type GetIcon,
  type GetItem,
  type GetPlayer,
  type RenderItemCard,
  type RenderPlayerCard,
} from './og-images';

const item = (id: number) => ({ id, name: `Item ${id}`, icon: `Item ${id}.png` }) as Item;
const player = (username: string) => ({ username }) as Player;
const PNG = new Uint8Array([137, 80, 78, 71]);
const ICON = new Uint8Array([1, 2, 3]);

describe('createOgImageRouter', () => {
  const getItem = vi.fn<GetItem>();
  const getIcon = vi.fn<GetIcon>();
  const render = vi.fn<RenderItemCard>();
  const getPlayer = vi.fn<GetPlayer>();
  const renderPlayer = vi.fn<RenderPlayerCard>();
  const logs = collectLogs();
  // Each test gets a router of its own, so none sees the images another cached
  let router: express.Router;
  const app = express()
    .use((req, res, next) => router(req, res, next))
    // Express only treats four parameters as an error handler
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).send(error.message);
    });
  const get = serve(app);

  beforeEach(() => {
    getItem.mockReset().mockImplementation(async id => (id === 404404 ? undefined : item(id)));
    getIcon.mockReset().mockResolvedValue(ICON);
    render.mockReset().mockResolvedValue(PNG);
    getPlayer.mockReset().mockImplementation(async name => (name === 'nobody' ? undefined : player(name)));
    renderPlayer.mockReset().mockResolvedValue(PNG);
    logs.lines.splice(0);
    router = createOgImageRouter({ logger: logs.logger, getItem, getIcon, render, getPlayer, renderPlayer });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('serves a known item as a long-lived PNG, ignoring the version query', async () => {
    const res = await get('/og/item/4151.png?v=1');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('cache-control')).toBe('public, max-age=604800, immutable');
    expect(res.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG);
    expect(render).toHaveBeenCalledExactlyOnceWith(item(4151), ICON);
  });

  it('answers a short-lived 404 for an unknown id, without rendering or logging', async () => {
    const res = await get('/og/item/404404.png');

    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe('public, max-age=300');
    expect(await res.text()).toBe('Not found');
    expect(render).not.toHaveBeenCalled();
    expect(logs.lines).toEqual([]);
  });

  it('answers 404 for an id that is not all digits', async () => {
    for (const path of ['/og/item/abc.png', '/og/item/12a.png', '/og/item/-1.png']) {
      expect((await get(path)).status).toBe(404);
    }
    expect(getItem).not.toHaveBeenCalled();
  });

  it('answers a short-lived 404 and logs a warning when the API fails', async () => {
    getItem.mockRejectedValue(new Error('API down'));

    const res = await get('/og/item/4151.png');

    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe('public, max-age=300');
    expect(render).not.toHaveBeenCalled();
    expect(logs.lines).toContainEqual(expect.objectContaining({ type: 'og-image', level: 'warn' }));
  });

  it('draws the card without its icon when the Wiki fails, and tries the icon again next time', async () => {
    getIcon.mockRejectedValueOnce(new Error('Wiki down'));

    const first = await get('/og/item/4151.png');
    expect(first.status).toBe(200);
    expect(first.headers.get('cache-control')).toBe('public, max-age=300');
    expect(render).toHaveBeenLastCalledWith(item(4151), undefined);
    expect(logs.lines).toContainEqual(expect.objectContaining({ type: 'og-image', level: 'warn' }));

    const second = await get('/og/item/4151.png');
    expect(second.headers.get('cache-control')).toBe('public, max-age=604800, immutable');
    expect(getIcon).toHaveBeenCalledTimes(2);
    expect(render).toHaveBeenLastCalledWith(item(4151), ICON);
  });

  it('keeps finished images, so a second request loads and renders nothing', async () => {
    await get('/og/item/4151.png');
    await get('/og/item/4151.png');

    expect(getItem).toHaveBeenCalledOnce();
    expect(render).toHaveBeenCalledOnce();
  });

  it('shares one load and render between concurrent requests for the same id', async () => {
    // The load takes a while, so all three requests arrive before it finishes
    getItem.mockImplementation(async id => (await new Promise(r => setTimeout(r, 100)), item(id)));

    await Promise.all([get('/og/item/4151.png'), get('/og/item/4151.png'), get('/og/item/4151.png')]);

    expect(getItem).toHaveBeenCalledOnce();
    expect(render).toHaveBeenCalledOnce();
  });

  it('keeps only the 200 most recently used images', async () => {
    for (let id = 1; id <= 200; id++) await get(`/og/item/${id}.png`);
    await get('/og/item/1.png'); // Id 1 is now the newest, so 2 is the oldest
    await get('/og/item/201.png'); // Evicts 2
    render.mockClear();

    await get('/og/item/1.png');
    expect(render).not.toHaveBeenCalled();
    await get('/og/item/2.png');
    expect(render).toHaveBeenCalledOnce();
  });

  it('answers 500 when the render throws, and renders again next time', async () => {
    render.mockRejectedValueOnce(new Error('Out of memory'));

    expect((await get('/og/item/4151.png')).status).toBe(500);
    expect((await get('/og/item/4151.png')).status).toBe(200);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('serves a stored player as a PNG for an hour, ignoring the version query', async () => {
    const res = await get('/og/player/the%20fraking.png?v=1');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
    expect(res.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG);
    expect(renderPlayer).toHaveBeenCalledExactlyOnceWith(player('the fraking'));
  });

  it('draws one image per player however the name is spelled', async () => {
    for (const path of ['/og/player/The_Fraking.png', '/og/player/the%20fraking.png', '/og/player/THE-FRAKING.png']) {
      expect((await get(path)).status).toBe(200);
    }
    expect(getPlayer).toHaveBeenCalledExactlyOnceWith('the fraking');
    expect(renderPlayer).toHaveBeenCalledOnce();
  });

  it('answers a short-lived 404 for a player the API does not store, and for a name Jagex does not allow', async () => {
    for (const path of [
      '/og/player/nobody.png',
      '/og/player/thirteen%20chrs.png',
      '/og/player/a.b.png',
      '/og/player/___.png',
    ]) {
      const res = await get(path);
      expect(res.status).toBe(404);
      expect(res.headers.get('cache-control')).toBe('public, max-age=300');
    }
    expect(getPlayer).toHaveBeenCalledExactlyOnceWith('nobody');
    expect(renderPlayer).not.toHaveBeenCalled();
  });

  it('answers a short-lived 404 and logs a warning when the API fails for a player', async () => {
    getPlayer.mockRejectedValue(new Error('API down'));

    const res = await get('/og/player/the%20fraking.png');

    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe('public, max-age=300');
    expect(logs.lines).toContainEqual(expect.objectContaining({ type: 'og-image', level: 'warn' }));
  });

  it("draws a player's image again once it is an hour old", async () => {
    vi.useFakeTimers({ toFake: ['Date'] });

    await get('/og/player/the%20fraking.png');
    vi.advanceTimersByTime(3599_000);
    await get('/og/player/the%20fraking.png');
    expect(renderPlayer).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(1000);
    await get('/og/player/the%20fraking.png');
    expect(renderPlayer).toHaveBeenCalledTimes(2);
  });
});
