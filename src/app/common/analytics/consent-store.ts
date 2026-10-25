import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { config } from '@config/config';
import { StorageKey } from '@app/common/storage/storage';
import { StorageService } from '@app/common/storage/storage-service';
import { WINDOW } from '@app/core/platform/window-token';
import { GTAG_TOKEN } from './gtag-token';

export type AnalyticsConsent = 'granted' | 'denied';

const TAG_URL = 'https://www.googletagmanager.com/gtag/js?id=' + config.gaMeasurementId;
/** Google's opt-out flag: while it's set on `window`, the tag sends nothing */
const DISABLE_KEY = 'ga-disable-' + config.gaMeasurementId;
/** Added by `index.html` before the first paint when a choice is stored: hides the server-rendered banner */
const CHOSEN_STYLE_ID = 'consent-chosen';

class ConsentState {
  choice: AnalyticsConsent | null = null;
  /**
   * Open until `init()` reads the choice: the server renders the banner in every page (the choice is in this device's
   * storage, and the page cache serves everyone the same HTML), so it paints with the page instead of after hydration
   */
  bannerOpen = true;
}

/**
 * The visitor's choice about Google Analytics' cookies. Until they allow them, the tag (gtag.js) isn't loaded, so
 * nothing reaches Google: events wait in `dataLayer` and go out if the visitor allows it later on the same page.
 * `index.html` loads the tag on page load for visitors who allowed it before.
 */
export const ConsentStore = signalStore(
  { providedIn: 'root' },
  withState(new ConsentState()),
  withMethods(store => {
    const document = inject(DOCUMENT);
    const window = inject(WINDOW) as (Window & Record<string, unknown>) | null;
    const gtag = inject(GTAG_TOKEN);
    const storageService = inject(StorageService);

    function choose(choice: AnalyticsConsent): void {
      storageService.setItem(StorageKey.AnalyticsConsent, choice);
      patchState(store, { choice, bannerOpen: false });
    }

    /** `_ga` and `_ga_<id>`, set on the widest domain the tag could use (`.osrs-tracker.net`) */
    function deleteAnalyticsCookies(): void {
      const names = document.cookie
        .split(';')
        .map(cookie => cookie.split('=')[0].trim())
        .filter(name => name === '_ga' || name.startsWith('_ga_'));
      const labels = document.location.hostname.split('.');
      const domains = labels.slice(0, -1).map((_, i) => '.' + labels.slice(i).join('.'));

      for (const name of names) {
        document.cookie = `${name}=; Max-Age=0; path=/`;
        for (const domain of domains) document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
      }
    }

    return {
      /** Browser only, after hydration; until then `index.html` hides the banner from visitors who chose before */
      init(): void {
        const stored = storageService.getItem(StorageKey.AnalyticsConsent);
        const choice = stored === 'granted' || stored === 'denied' ? stored : null;
        patchState(store, { choice, bannerOpen: choice === null });
      },

      /** The footer's Cookies button: shows the banner again, with the current choice */
      reopen(): void {
        document.getElementById(CHOSEN_STYLE_ID)?.remove();
        patchState(store, { bannerOpen: true });
      },

      allow(): void {
        choose('granted');
        if (window) delete window[DISABLE_KEY];
        gtag?.('consent', 'update', { analytics_storage: 'granted' });
        if (!document.querySelector(`script[src="${TAG_URL}"]`)) {
          const tag = document.createElement('script');
          tag.async = true;
          tag.src = TAG_URL;
          document.head.appendChild(tag);
        }
      },

      /** Also when the tag already runs (allowed earlier): Google's opt-out flag stops it sending, and its cookies go */
      deny(): void {
        choose('denied');
        if (window) window[DISABLE_KEY] = true;
        gtag?.('consent', 'update', { analytics_storage: 'denied' });
        deleteAnalyticsCookies();
      },
    };
  }),
);
