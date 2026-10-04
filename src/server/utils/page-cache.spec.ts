// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { serverConfig } from '../server-config';
import { PageCache } from './page-cache';

describe('PageCache', () => {
  let cache: PageCache;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new PageCache();
  });
  afterEach(() => vi.useRealTimers());

  it('expires pages after the TTL', () => {
    cache.set('/', 'html');

    vi.advanceTimersByTime(serverConfig.pageCache.ttl);
    expect(cache.get('/')).toBe('html');

    vi.advanceTimersByTime(1);
    expect(cache.get('/')).toBeNull();
  });

  it('evicts the oldest page when full', () => {
    for (let i = 0; i < serverConfig.pageCache.maxSize; i++) {
      cache.set(`/${i}`, 'html');
      vi.advanceTimersByTime(1);
    }

    cache.set('/new', 'html');

    expect(cache.get('/0')).toBeNull();
    expect(cache.get('/1')).toBe('html');
    expect(cache.get('/new')).toBe('html');
  });

  it('refreshes the age of a page when it is set again', () => {
    cache.set('/', 'old');
    vi.advanceTimersByTime(serverConfig.pageCache.ttl);
    cache.set('/', 'new');
    vi.advanceTimersByTime(1);

    expect(cache.get('/')).toBe('new');
  });
});
