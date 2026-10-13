import { DOCUMENT } from '@angular/common';
import { inject, Service, Signal, signal } from '@angular/core';
import { config } from '@config/config';
import { StorageKey } from '@app/common/storage/storage';
import { StorageService } from '@app/common/storage/storage-service';
import { WINDOW } from '@app/core/platform/window-token';
import { GTAG_TOKEN } from './gtag-token';

export type AnalyticsConsent = 'granted' | 'denied';

const TAG_URL = 'https://www.googletagmanager.com/gtag/js?id=' + config.gaMeasurementId;
/** Google's opt-out flag: while it's set on `window`, the tag sends nothing */
const DISABLE_KEY = 'ga-disable-' + config.gaMeasurementId;

/**
 * The visitor's choice about Google Analytics' cookies. Until they allow them, the tag (gtag.js) isn't loaded, so
 * nothing reaches Google: events wait in `dataLayer` and go out if the visitor allows it later on the same page.
 * `index.html` loads the tag on page load for visitors who allowed it before.
 */
@Service()
export class ConsentService {
  private readonly document = inject(DOCUMENT);
  private readonly window = inject(WINDOW) as (Window & Record<string, unknown>) | null;
  private readonly gtag = inject(GTAG_TOKEN);
  private readonly storageService = inject(StorageService);

  readonly #choice = signal<AnalyticsConsent | null>(null);
  readonly #bannerOpen = signal(false);
  readonly choice: Signal<AnalyticsConsent | null> = this.#choice.asReadonly();
  readonly bannerOpen: Signal<boolean> = this.#bannerOpen.asReadonly();

  /** Browser only, after hydration: the server can't know the choice, so it never renders the banner */
  init(): void {
    const stored = this.storageService.getItem(StorageKey.AnalyticsConsent);
    const choice = stored === 'granted' || stored === 'denied' ? stored : null;
    this.#choice.set(choice);
    this.#bannerOpen.set(choice === null);
  }

  /** The footer's Cookies button: shows the banner again, with the current choice */
  reopen(): void {
    this.#bannerOpen.set(true);
  }

  allow(): void {
    this.choose('granted');
    if (this.window) delete this.window[DISABLE_KEY];
    this.gtag?.('consent', 'update', { analytics_storage: 'granted' });
    if (!this.document.querySelector(`script[src="${TAG_URL}"]`)) {
      const tag = this.document.createElement('script');
      tag.async = true;
      tag.src = TAG_URL;
      this.document.head.appendChild(tag);
    }
  }

  /** Also when the tag already runs (allowed earlier): Google's opt-out flag stops it sending, and its cookies go */
  deny(): void {
    this.choose('denied');
    if (this.window) this.window[DISABLE_KEY] = true;
    this.gtag?.('consent', 'update', { analytics_storage: 'denied' });
    this.deleteAnalyticsCookies();
  }

  private choose(choice: AnalyticsConsent): void {
    this.storageService.setItem(StorageKey.AnalyticsConsent, choice);
    this.#choice.set(choice);
    this.#bannerOpen.set(false);
  }

  /** `_ga` and `_ga_<id>`, set on the widest domain the tag could use (`.freekmencke.com`) */
  private deleteAnalyticsCookies(): void {
    const names = this.document.cookie
      .split(';')
      .map(cookie => cookie.split('=')[0].trim())
      .filter(name => name === '_ga' || name.startsWith('_ga_'));
    const labels = this.document.location.hostname.split('.');
    const domains = labels.slice(0, -1).map((_, i) => '.' + labels.slice(i).join('.'));

    for (const name of names) {
      this.document.cookie = `${name}=; Max-Age=0; path=/`;
      for (const domain of domains) this.document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
    }
  }
}
