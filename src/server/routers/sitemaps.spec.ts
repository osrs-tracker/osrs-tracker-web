// @vitest-environment node
import express from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { collectLogs } from '../testing/log-lines';
import { serve } from '../testing/serve';
import { cachedSitemap, createSitemapRouter, type GetJson } from './sitemaps';

describe('createSitemapRouter', () => {
  const getJson = vi.fn<GetJson>();
  const logs = collectLogs();
  const get = serve(express().use(createSitemapRouter({ logger: logs.logger, getJson })));
  // A router of its own, without the copies the tests above cache in the first
  const failing = vi.fn<GetJson>();
  const getFailing = serve(express().use(createSitemapRouter({ logger: logs.logger, getJson: failing })));

  const api = (players: unknown[]) =>
    getJson.mockImplementation(async path => {
      if (path === '/sitemap/players') return players;
      if (path === '/items/browse/a') return [{ id: 4151 }, { id: 2 }];
      if (path === '/items/browse/0') return [{ id: 2 }]; // Each item is listed once
      return [];
    });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    getJson.mockReset();
    logs.lines.splice(0);
  });

  it('lists every item the API browses, by id, from all 27 letters', async () => {
    api([]);

    const res = await get('/sitemap-items.xml');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/xml');
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
    expect(await res.text()).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '<url><loc>https://osrs-tracker.freekmencke.com/trackers/price/2</loc></url>',
        '<url><loc>https://osrs-tracker.freekmencke.com/trackers/price/4151</loc></url>',
        '</urlset>',
      ].join('\n'),
    );
    expect(getJson).toHaveBeenCalledTimes(27);
  });

  it('lists the players at their canonical URL, dated by their newest entry, and caches them for an hour', async () => {
    api([{ username: 'the fraking', lastEntry: '2026-10-10T00:01:59.259Z' }]);

    const body = await (await get('/sitemap-players.xml')).text();
    expect(body).toContain(
      '<url><loc>https://osrs-tracker.freekmencke.com/trackers/xp/the%20fraking</loc>' +
        '<lastmod>2026-10-10T00:01:59.259Z</lastmod></url>',
    );

    await get('/sitemap-players.xml');
    expect(getJson).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(3_600_000);
    await get('/sitemap-players.xml');
    expect(getJson).toHaveBeenCalledTimes(2);
  });

  it('answers 503 and logs when the API returns nothing, before any sitemap was built', async () => {
    failing.mockResolvedValue([]);

    for (const path of ['/sitemap-items.xml', '/sitemap-players.xml']) {
      const res = await getFailing(path);
      expect(res.status).toBe(503);
      expect(res.headers.get('retry-after')).toBe('60');
    }
    expect(logs.lines).toContainEqual(expect.objectContaining({ type: 'sitemap', level: 'warn' }));
  });
});

describe('cachedSitemap', () => {
  const onError = vi.fn();
  const build = vi.fn<() => Promise<string>>();

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    build.mockReset();
    onError.mockReset();
  });

  it('keeps the last good copy when a build fails, and waits a minute before building again', async () => {
    const sitemap = cachedSitemap(build, 3_600_000, onError);
    build.mockResolvedValueOnce('<urlset>good</urlset>');
    await sitemap();

    vi.advanceTimersByTime(3_600_000);
    build.mockRejectedValue(new Error('API down'));
    expect(await sitemap()).toBe('<urlset>good</urlset>');
    expect(onError).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(59_000);
    await sitemap();
    expect(build).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(1_000);
    await sitemap();
    expect(build).toHaveBeenCalledTimes(3);
  });

  it('shares one build between calls that arrive while it runs', async () => {
    const sitemap = cachedSitemap(build, 3_600_000, onError);
    build.mockResolvedValue('<urlset/>');

    expect(await Promise.all([sitemap(), sitemap()])).toEqual(['<urlset/>', '<urlset/>']);
    expect(build).toHaveBeenCalledOnce();
  });
});
