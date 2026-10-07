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
import { ListCardComponent, ListCardState, listCardState } from 'src/app/common/components/general/list-card.component';
import { LoadErrorComponent } from 'src/app/common/components/general/load-error.component';
import { SegmentedComponent, SegmentedOption } from 'src/app/common/components/general/segmented.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { OsrsNewsItem, OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { ItemRowComponent } from '../trackers/price-tracker/item-row/item-row.component';
import { ItemSearchComponent } from '../trackers/price-tracker/item-search.component';
import { PriceTrackerStore, RecentItem } from '../trackers/price-tracker/price-tracker.store';
import { PlayerRowComponent } from '../trackers/xp-tracker/player-row/player-row.component';
import { PlayerSearchComponent } from '../trackers/xp-tracker/player-search.component';
import { TrackingOffsetComponent } from '../trackers/xp-tracker/tracking-offset.component';
import { XpTrackerStore } from '../trackers/xp-tracker/xp-tracker.store';
import { OsrsNewsCardSkeletonComponent } from './osrs-news-card/osrs-news-card-skeleton.component';
import OsrsNewsCardComponent from './osrs-news-card/osrs-news-card.component';
import { PreviewCardComponent } from './preview-card.component';

type SearchMode = 'player' | 'item';

@Component({
  selector: 'home',
  templateUrl: './home.component.html',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    IconDirective,
    ListCardComponent,
    LoadErrorComponent,
    SegmentedComponent,
    OsrsNewsCardComponent,
    OsrsNewsCardSkeletonComponent,
    PreviewCardComponent,
    PlayerSearchComponent,
    PlayerRowComponent,
    TrackingOffsetComponent,
    ItemSearchComponent,
    ItemRowComponent,
  ],
})
export default class HomeComponent {
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
      afterNextRender(() => this.elementRef.nativeElement.querySelector('segmented [aria-pressed="true"]')?.focus(), {
        injector: this.injector,
      });
    }
  }
}
