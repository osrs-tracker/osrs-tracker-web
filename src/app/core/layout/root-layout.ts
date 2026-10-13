import { Component, Signal, afterNextRender, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ConsentService } from '@app/common/analytics/consent-service';
import { Icon } from '@app/common/icon/icon';
import { LoadingIndicatorService } from '@app/core/interceptors/loading-indicator-interceptor';
import { ConsentBanner } from './consent-banner';
import { DarkMode } from './dark-mode';
import { NAV_TAB, NavMenu, NavMenuRow, NavMenus } from './nav-menu';
import { PlayersOnlineCard } from './players-online-card';

@Component({
  selector: 'app-root-layout',
  templateUrl: './root-layout.html',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ConsentBanner,
    DarkMode,
    Icon,
    NavMenu,
    NavMenuRow,
    PlayersOnlineCard,
  ],
  providers: [NavMenus],
})
export default class RootLayout {
  readonly consentService = inject(ConsentService);
  readonly hasOngoingRequests: Signal<boolean> = inject(LoadingIndicatorService).hasOngoingRequests;

  readonly currentYear = new Date().getFullYear();

  readonly navMenus = inject(NavMenus);
  protected readonly navTab = NAV_TAB;

  /** The nav tab the current page is under, besides Home */
  readonly section: Signal<'trackers' | 'game' | null> = computed(() => {
    const path = this.navMenus.url().split(/[?#]/)[0];
    if (path.startsWith('/trackers')) return 'trackers';
    if (path === '/players-online') return 'game';
    return null;
  });

  /** Home's tab is underlined on phones on Home, unless a menu is open (its tab is underlined then) */
  readonly homeMarked: Signal<boolean> = computed(
    () => !this.navMenus.open() && this.navMenus.url().split(/[?#]/)[0] === '/',
  );

  constructor() {
    // After hydration: whether the banner stays depends on this device's choice, which the server can't know
    afterNextRender(() => this.consentService.init());
  }
}
