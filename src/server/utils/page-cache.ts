import { serverConfig } from '../server-config';

interface PageCacheEntry {
  html: string;
  timestamp: number;
}

export class PageCache {
  private cache = new Map<string, PageCacheEntry>();

  get(url: string): string | null {
    const entry = this.cache.get(url);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > serverConfig.pageCache.ttl) {
      this.cache.delete(url);
      return null;
    }

    return entry.html;
  }

  set(url: string, html: string): void {
    // A Map iterates in insertion order, so re-inserting keeps the oldest entry first
    this.cache.delete(url);

    if (this.cache.size >= serverConfig.pageCache.maxSize) {
      this.cache.delete(this.cache.keys().next().value!);
    }

    this.cache.set(url, { html, timestamp: Date.now() });
  }

  clear(url?: string): void {
    if (url) this.cache.delete(url);
    else this.cache.clear();
  }
}

export const pageCache = new PageCache();
