import { inject, Service } from '@angular/core';
import { NavigationError } from '@angular/router';
import { WINDOW } from '@app/core/platform/window-token';

// Chrome and Firefox name the failed import, Safari doesn't
const FAILED_IMPORT = /dynamically imported module|Importing a module script failed/i;
// A `@defer` block whose chunk failed to load and that has no `@error` block. The cause isn't attached in production.
const DEFER_LOAD_FAILED = 'NG0750';

const LAST_RELOAD_KEY = 'stale-chunk-reload';
// A chunk that's still missing right after a reload isn't from an old version: let the error through instead of looping
const RELOAD_GUARD_MS = 10_000;

/**
 * Each deploy renames the chunks and the new image doesn't have the old ones, so a tab opened before the deploy can't
 * load a page or `@defer` block it hasn't loaded yet. A reload gets the new version (page HTML is `no-cache`).
 */
@Service()
export class StaleChunkReloader {
  private readonly window = inject(WINDOW);
  private reloading = false;

  reloadIfStale(error: unknown, url?: string): boolean {
    if (!this.window || !isFailedChunkLoad(error)) return false;
    if (this.reloading) return true;
    if (!this.claimReload(this.window)) return false;

    this.reloading = true;
    if (url) this.window.location.assign(url);
    else this.window.location.reload();
    return true;
  }

  /** Records the reload, unless one happened moments ago or storage is blocked (without the guard it could loop) */
  private claimReload(window: Window): boolean {
    try {
      const storage = window.sessionStorage;
      if (Date.now() - Number(storage.getItem(LAST_RELOAD_KEY)) < RELOAD_GUARD_MS) return false;
      storage.setItem(LAST_RELOAD_KEY, String(Date.now()));
      return true;
    } catch {
      return false;
    }
  }
}

export function reloadOnStaleChunk(event: NavigationError): void {
  inject(StaleChunkReloader).reloadIfStale(event.error, event.url);
}

function isFailedChunkLoad(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return FAILED_IMPORT.test(error.message) || error.message.startsWith(DEFER_LOAD_FAILED);
}
