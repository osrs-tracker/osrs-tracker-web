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

  /** Runs the page's script against `stored` at the old host's `search`, and returns where it sends the visitor */
  async function carry(search: string, stored = new Map<string, string>()) {
    const html = await (await get(`/carry-over${search}`)).text();
    const start = html.indexOf('>', html.indexOf('<script')) + 1;
    const replace = vi.fn<(url: string) => void>();

    runInNewContext(html.slice(start, html.indexOf('</script>', start)), {
      URLSearchParams,
      localStorage: {
        get length() {
          return stored.size;
        },
        key: (i: number) => [...stored.keys()][i],
        getItem: (key: string) => stored.get(key) ?? null,
      },
      location: { search, replace },
    });

    const [url, fragment] = replace.mock.calls[0][0].split('#carry-over=');
    return { url, carried: JSON.parse(decodeURIComponent(fragment)) as Record<string, string> };
  }

  it('serves a page whose script carries the response nonce, uncached and unindexed', async () => {
    const response = await get('/carry-over?to=/trackers/xp');
    const html = await response.text();
    const nonce = html.match(/<script nonce="([^"]+)">/)![1];

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^text\/html/);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-robots-tag')).toBe('noindex');
    expect(response.headers.get('content-security-policy')).toContain(`'nonce-${nonce}'`);
  });

  it("doesn't put the request's query in the page", async () => {
    const html = await (
      await get(`/carry-over?to=${encodeURIComponent('/</script><script>alert(1)</script>')}`)
    ).text();

    expect(html).not.toContain('alert(1)');
  });

  it('sends every stored entry but the consent choice to the same page on the new host', async () => {
    const stored = new Map([
      ['dark-mode', 'true'],
      ['analytics-consent', 'granted'],
      ['xp-tracker-favorite-players', '["the fraking"]'],
    ]);

    expect(await carry(`?to=${encodeURIComponent('/trackers/xp/the fraking?offset=2')}`, stored)).toEqual({
      url: `${config.siteUrl}/trackers/xp/the fraking?offset=2`,
      carried: { 'dark-mode': 'true', 'xp-tracker-favorite-players': '["the fraking"]' },
    });
  });

  it.each([['https://example.com/'], ['example.com'], ['']])('sends `to=%s` to the home page', async to => {
    expect((await carry(`?to=${encodeURIComponent(to)}`)).url).toBe(`${config.siteUrl}/`);
  });

  it('sends a visitor without a `to` to the home page', async () => {
    expect(await carry('')).toEqual({ url: `${config.siteUrl}/`, carried: {} });
  });
});
