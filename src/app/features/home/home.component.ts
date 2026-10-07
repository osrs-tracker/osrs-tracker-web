import { Component, inject, ResourceRef, Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Item, Player } from '@osrs-tracker/models';
import { CardComponent } from 'src/app/common/components/general/card.component';
import { ListRowSkeletonComponent } from 'src/app/common/components/general/list-row-skeleton.component';
import { LoadErrorComponent } from 'src/app/common/components/general/load-error.component';
import { OsrsNewsItem, OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { ItemSearchComponent } from '../trackers/price-tracker/item-search.component';
import { ItemRowComponent } from '../trackers/price-tracker/item-row/item-row.component';
import { PlayerSearchComponent } from '../trackers/xp-tracker/player-search.component';
import { PlayerRowComponent } from '../trackers/xp-tracker/player-row/player-row.component';
import { XpTrackerStore } from '../trackers/xp-tracker/xp-tracker.store';
import { OsrsNewsCardSkeletonComponent } from './osrs-news-card/osrs-news-card-skeleton.component';
import OsrsNewsCardComponent from './osrs-news-card/osrs-news-card.component';

@Component({
  selector: 'home',
  templateUrl: './home.component.html',
  imports: [
    RouterLink,
    CardComponent,
    ListRowSkeletonComponent,
    LoadErrorComponent,
    OsrsNewsCardComponent,
    OsrsNewsCardSkeletonComponent,
    PlayerSearchComponent,
    PlayerRowComponent,
    ItemSearchComponent,
    ItemRowComponent,
  ],
})
export default class HomeComponent {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);

  readonly SKELETON_ROWS = [0, 1, 2, 3, 4];

  readonly scrapingOffset: Signal<number> = inject(XpTrackerStore).scrapingOffset;

  readonly osrsNewsItems: ResourceRef<OsrsNewsItem[]> = rxResource({
    stream: () => this.osrsTrackerRepo.getNews(),
    defaultValue: [],
  });

  readonly recentPlayerLookups: ResourceRef<Player[]> = rxResource({
    params: () => ({ offset: this.scrapingOffset() }),
    stream: ({ params: { offset } }) => this.osrsTrackerRepo.getRecentPlayerLookups(offset),
    defaultValue: [],
  });

  readonly recentItemLookups: ResourceRef<Item[]> = rxResource({
    stream: () => this.osrsTrackerRepo.getRecentItemLookups(),
    defaultValue: [],
  });
}
