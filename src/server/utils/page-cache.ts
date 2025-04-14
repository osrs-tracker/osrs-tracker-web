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
   * Get all keys currently in the cache
   * @returns An array of cached keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get a cached page if it exists and is not expired
   * @param url The full URL of the page
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
   * @param url The full URL of the page
   * @param html The rendered HTML content
   */
  set(url: string, html: string): void {
    // Enforce maximum cache size
    if (this.cache.size >= serverConfig.pageCache.maxSize) {
      // Remove oldest entry if at capacity
      const oldestKey = [...this.cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
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
