import { DatePipe } from '@angular/common';
import { Component, afterNextRender, computed, inject, linkedSignal, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ConsentStore } from '@app/common/analytics/consent-store';
import { PriceWorld, priceTrackerPath } from '@app/common/api/price-world';
import { Segmented, SegmentedOption } from '@app/common/ui/controls/segmented';
import { Icon } from '@app/common/icon/icon';
import { LastPlayedStore } from '@app/common/storage/last-played-store';
import { LoadingIndicatorStore } from '@app/core/interceptors/loading-indicator-store';
import { RouteFocus } from '@app/core/routing/route-focus';
import { ConsentBanner } from './consent-banner';
import { DarkMode } from './dark-mode';
import { NAV_TAB, NavMenu, NavMenuRow, NavMenus } from './nav-menu';
import { PlayersOnlineCard } from './players-online-card';
import {
  LucideArrowUpDown,
  LucideClock,
  LucideDynamicIcon,
  LucideIcon,
  LucideNewspaper,
  LucidePackagePlus,
  LucideWandSparkles,
} from '@lucide/angular';
import { PlayerType } from '@osrs-tracker/models';

/** The price lists in the Trackers menu; `icon` null shows "A–Z" text instead */
const PRICE_LISTS: { path: string; label: string; sub: string; icon: LucideIcon | null; newUntil?: string }[] = [
  { path: '/browse/a', label: 'Browse all items', sub: 'Every item, by its first letter', icon: null },
  {
    path: '/high-alch',
    label: 'High-alch profit',
    sub: 'Profit per cast after the item and rune',
    icon: LucideWandSparkles,
    newUntil: '2026-11-14',
  },
  {
    path: '/margins',
    label: 'Margins',
    sub: 'Buy and sell spread after tax, per buy limit',
    icon: LucideArrowUpDown,
    newUntil: '2026-11-14',
  },
  {
    path: '/new',
    label: 'New on the GE',
    sub: 'The latest game updates’ items and prices',
    icon: LucidePackagePlus,
    newUntil: '2026-11-22',
  },
];

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
    Segmented,
    LucideNewspaper,
    LucideClock,
    LucideDynamicIcon,
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

  readonly section = computed(() => {
    const path = this.navMenus.url().split(/[?#]/)[0];
    if (path.startsWith('/trackers')) return 'trackers';
    if (path === '/players-online' || path === '/news') return 'game';
    return null;
  });

  protected readonly WORLD_OPTIONS: SegmentedOption<PriceWorld>[] = [
    { value: 'main', label: 'Main' },
    { value: 'hardcore', label: 'HCW', title: 'Hardcore Worlds' },
  ];

  /**
   * The world of the open page. A pick in the menu holds only while that menu stays open: navigating, closing or
   * opening a menu resets it, so the menu never shows a world the page isn't in.
   */
  readonly priceWorld = linkedSignal<{ url: string; open: string | null }, PriceWorld>({
    source: () => ({ url: this.navMenus.url(), open: this.navMenus.open() }),
    computation: ({ url }) => (url.split(/[?#]/)[0].startsWith(priceTrackerPath('hardcore')) ? 'hardcore' : 'main'),
  });

  protected readonly priceSearch = { main: priceTrackerPath('main'), hardcore: priceTrackerPath('hardcore') };
  protected readonly hardcoreIcon = PlayerType.HardcoreMain;

  /**
   * Both worlds' lists are rendered and the switch only hides one: links that exist only after a click aren't in the
   * server HTML, so crawlers would never find the Hardcore Worlds lists.
   */
  protected readonly priceListSets = (['main', 'hardcore'] as const).map(world => ({
    world,
    rows: PRICE_LISTS.map(row => ({ ...row, href: priceTrackerPath(world) + row.path })),
  }));

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
