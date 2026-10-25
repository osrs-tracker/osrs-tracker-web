import { DatePipe } from '@angular/common';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ConsentStore } from '@app/common/analytics/consent-store';
import { Icon } from '@app/common/icon/icon';
import { LastPlayedStore } from '@app/common/storage/last-played-store';
import { LoadingIndicatorStore } from '@app/core/interceptors/loading-indicator-store';
import { RouteFocus } from '@app/core/routing/route-focus';
import { ConsentBanner } from './consent-banner';
import { DarkMode } from './dark-mode';
import { NAV_TAB, NavMenu, NavMenuRow, NavMenus } from './nav-menu';
import { PlayersOnlineCard } from './players-online-card';
import { LucideArrowUpDown, LucideClock, LucideNewspaper, LucidePackagePlus } from '@lucide/angular';

@Component({
  selector: 'root-layout',
  templateUrl: './root-layout.html',
  imports: [
    DatePipe,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ConsentBanner,
    DarkMode,
    Icon,
    NavMenu,
    NavMenuRow,
    PlayersOnlineCard,
    LucideNewspaper,
    LucideArrowUpDown,
    LucidePackagePlus,
    LucideClock,
  ],
  providers: [NavMenus],
})
export default class RootLayout {
  readonly consentStore = inject(ConsentStore);
  readonly hasOngoingRequests = inject(LoadingIndicatorStore).hasOngoingRequests;

  readonly currentYear = new Date().getFullYear();

  readonly navMenus = inject(NavMenus);
  private readonly lastPlayedStore = inject(LastPlayedStore);
  private readonly routeFocus = inject(RouteFocus);
  private readonly hydrated = signal(false);

  /**
   * The news catch-up's day remembered on this device, for the Game menu's row. Only after hydration: the server can't
   * read it, so the row would differ from the server's render
   */
  readonly lastPlayed = computed(() => {
    const day = this.hydrated() ? this.lastPlayedStore.lastPlayed() : null;
    return day ? { day, date: new Date(`${day}T00:00:00Z`) } : null;
  });
  protected readonly navTab = NAV_TAB;

  /** The nav tab the current page is under, besides Home */
  readonly section = computed(() => {
    const path = this.navMenus.url().split(/[?#]/)[0];
    if (path.startsWith('/trackers')) return 'trackers';
    if (path === '/players-online' || path === '/news') return 'game';
    return null;
  });

  /** Home's tab is underlined on phones on Home, unless a menu is open (its tab is underlined then) */
  readonly homeMarked = computed(() => !this.navMenus.open() && this.navMenus.url().split(/[?#]/)[0] === '/');

  readonly skipHref = computed(() => `${this.navMenus.url().split('#')[0]}#main`);

  /** Focuses the page's h1 as a navigation does, without writing `#main` into the URL */
  protected skipToContent(event: MouseEvent): void {
    event.preventDefault();
    this.routeFocus.focusContent();
  }

  constructor() {
    // After hydration: whether the banner stays depends on this device's choice, which the server can't know
    afterNextRender(() => {
      this.consentStore.init();
      this.hydrated.set(true);
    });
  }
}
