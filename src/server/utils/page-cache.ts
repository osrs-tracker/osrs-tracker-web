import { serverConfig } from '../server-config';

interface PageCacheEntry {
  html: string;
  timestamp: number;
}

/**
 * Service for caching pre-rendered pages
 */
export class PageCache {
  private cache = new Map<string, PageCacheEntry>();

  /**
   * Get a cached page if it exists and is not expired
   * @param url The path of the page
   * @returns The cached HTML or null if not found or expired
   */
  get(url: string): string | null {
    const entry = this.cache.get(url);

    if (!entry) return null;

    // Check if the cache entry has expired
    if (Date.now() - entry.timestamp > serverConfig.pageCache.ttl) {
      this.cache.delete(url);
      return null;
    }

    return entry.html;
  }

  /**
   * Store a page in the cache
   * @param url The path of the page
   * @param html The rendered HTML content
   */
  set(url: string, html: string): void {
    // A Map iterates in insertion order, so re-inserting keeps the oldest entry first
    this.cache.delete(url);

    // Enforce maximum cache size by dropping the oldest entry
    if (this.cache.size >= serverConfig.pageCache.maxSize) {
      this.cache.delete(this.cache.keys().next().value!);
    }

    this.cache.set(url, { html, timestamp: Date.now() });
  }

  /**
   * Clear the entire cache or a specific URL
   * @param url Optional URL to clear from cache
   */
  clear(url?: string): void {
    if (url) this.cache.delete(url);
    else this.cache.clear();
  }
}

// Create a singleton instance
export const pageCache = new PageCache();
