import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DOCUMENT,
  ElementRef,
  Injector,
  ResourceRef,
  Signal,
  WritableSignal,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Item, Player } from '@osrs-tracker/models';
import { ListCard, ListCardState, listCardState } from '@app/common/components/general/list-card';
import { LoadError } from '@app/common/components/general/load-error';
import { Segmented, SegmentedOption } from '@app/common/components/general/segmented';
import { Icon } from '@app/common/directives/icon/icon';
import { OsrsNewsItem, OsrsTrackerRepo } from '@app/common/repositories/osrs-tracker-repo';
import { ItemRow } from '@app/features/trackers/price-tracker/item-row/item-row';
import { ItemSearch } from '@app/features/trackers/price-tracker/item-search';
import { PriceTrackerStore, RecentItem } from '@app/features/trackers/price-tracker/price-tracker-store';
import { PlayerRow } from '@app/features/trackers/xp-tracker/player-row/player-row';
import { PlayerSearch } from '@app/features/trackers/xp-tracker/player-search';
import { TrackingOffset } from '@app/features/trackers/xp-tracker/tracking-offset';
import { XpTrackerStore } from '@app/features/trackers/xp-tracker/xp-tracker-store';
import { OsrsNewsCardSkeleton } from './osrs-news-card/osrs-news-card-skeleton';
import OsrsNewsCard from './osrs-news-card/osrs-news-card';
import { PreviewCard } from './preview-card';

type SearchMode = 'player' | 'item';

@Component({
  selector: 'home',
  templateUrl: './home.html',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    Icon,
    ListCard,
    LoadError,
    Segmented,
    OsrsNewsCard,
    OsrsNewsCardSkeleton,
    PreviewCard,
    PlayerSearch,
    PlayerRow,
    TrackingOffset,
    ItemSearch,
    ItemRow,
  ],
})
export default class Home {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly document = inject(DOCUMENT);
  private readonly elementRef = inject(ElementRef);
  private readonly injector = inject(Injector);
  private readonly priceTrackerStore = inject(PriceTrackerStore);

  readonly NEWS_SKELETONS: number[] = [0, 1, 2, 3];
  readonly SEARCH_MODES: SegmentedOption<SearchMode>[] = [
    { value: 'player', label: 'Player', icon: { name: 'overall', skill: true } },
    { value: 'item', label: 'Item', icon: { name: 'coin stack' } },
  ];

  readonly searchMode: WritableSignal<SearchMode> = signal('player');
  readonly scrapingOffset: Signal<number> = inject(XpTrackerStore).scrapingOffset;
  /** The first three, as on the Price Tracker. Only shown in item mode, which the server never renders. */
  readonly favoriteItems: Signal<RecentItem[]> = computed(() => this.priceTrackerStore.favoriteItems().slice(0, 3));

  readonly osrsNewsItems: ResourceRef<OsrsNewsItem[]> = rxResource({
    stream: () => this.osrsTrackerRepo.getNews(),
    defaultValue: [],
  });

  readonly recentPlayerLookups: ResourceRef<Player[]> = rxResource({
    params: () => ({ offset: this.scrapingOffset() }),
    stream: ({ params: { offset } }) => this.osrsTrackerRepo.getRecentPlayerLookups(offset),
    defaultValue: [],
  });
  readonly recentPlayerLookupsState: Signal<ListCardState> = computed(() => listCardState(this.recentPlayerLookups));

  readonly recentItemLookups: ResourceRef<Item[]> = rxResource({
    stream: () => this.osrsTrackerRepo.getRecentItemLookups(),
    defaultValue: [],
  });
  readonly recentItemLookupsState: Signal<ListCardState> = computed(() => listCardState(this.recentItemLookups));

  /** Switches the search, moving focus to the new switch if it was on the old one (which is destroyed). */
  setSearchMode(mode: SearchMode): void {
    const hadFocus = !!this.document.activeElement?.closest('segmented');
    this.searchMode.set(mode);

    if (hadFocus) {
      afterNextRender(() => this.elementRef.nativeElement.querySelector('segmented [aria-checked="true"]')?.focus(), {
        injector: this.injector,
      });
    }
  }
}
