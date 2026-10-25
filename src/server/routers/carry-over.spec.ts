// @vitest-environment node
import { config } from '@config/config';
import express from 'express';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { cspNonceMiddleware } from '../middleware/csp-nonce';
import { securityMiddleware } from '../middleware/security';
import { serve } from '../testing/serve';
import { createCarryOverRouter } from './carry-over';

describe('createCarryOverRouter', () => {
  const get = serve(express().use(cspNonceMiddleware(), securityMiddleware(), createCarryOverRouter()));

  /** The URL the page's script sends the visitor to, before the fragment */
  const target = (html: string) => JSON.parse(html.match(/location\.replace\((".*?") \+/)![1]) as string;

  it('serves a page whose script carries the response nonce, uncached and unindexed', async () => {
    const response = await get('/carry-over?to=/trackers/xp');
    const html = await response.text();
    const nonce = html.match(/<script nonce="([^"]+)">/)![1];

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^text\/html/);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-robots-tag')).toBe('noindex');
    expect(response.headers.get('content-security-policy')).toContain(`'nonce-${nonce}'`);
    expect(target(html)).toBe(`${config.siteUrl}/trackers/xp`);
  });

  it('keeps the query of the page the visitor came for', async () => {
    const html = await (await get(`/carry-over?to=${encodeURIComponent('/trackers/xp/the fraking?offset=2')}`)).text();

    expect(target(html)).toBe(`${config.siteUrl}/trackers/xp/the fraking?offset=2`);
  });

  it.each([['https://example.com/'], ['example.com'], ['']])('sends `to=%s` to the home page', async to => {
    const html = await (await get(`/carry-over?to=${encodeURIComponent(to)}`)).text();

    expect(target(html)).toBe(`${config.siteUrl}/`);
  });

  it("can't be made to end its script early", async () => {
    const html = await (
      await get(`/carry-over?to=${encodeURIComponent('/</script><script>alert(1)</script>')}`)
    ).text();

    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(target(html)).toBe(`${config.siteUrl}/</script><script>alert(1)</script>`);
  });

  it('sends every stored entry but the consent choice in the fragment', async () => {
    const html = await (await get('/carry-over?to=/news')).text();
    const stored = new Map([
      ['dark-mode', 'true'],
      ['analytics-consent', 'granted'],
      ['xp-tracker-favorite-players', '["the fraking"]'],
    ]);
    const replace = vi.fn<(url: string) => void>();

    runInNewContext(html.match(/<script[^>]*>([\s\S]*?)<\/script>/)![1], {
      localStorage: {
        get length() {
          return stored.size;
        },
        key: (i: number) => [...stored.keys()][i],
        getItem: (key: string) => stored.get(key) ?? null,
      },
      location: { replace },
    });

    const [url, fragment] = replace.mock.calls[0][0].split('#carry-over=');
    expect(url).toBe(`${config.siteUrl}/news`);
    expect(JSON.parse(decodeURIComponent(fragment))).toEqual({
      'dark-mode': 'true',
      'xp-tracker-favorite-players': '["the fraking"]',
    });
  });
});
