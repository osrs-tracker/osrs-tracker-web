import { Component, inject, ResourceRef, Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Item, Player } from '@osrs-tracker/models';
import { CardComponent } from 'src/app/common/components/general/card.component';
import { LoadErrorComponent } from 'src/app/common/components/general/load-error.component';
import { OsrsNewsItem, OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { ItemSearchComponent } from '../trackers/price-tracker/item-search.component';
import { ItemWidgetComponent } from '../trackers/price-tracker/item-widget/item-widget.component';
import { PlayerSearchComponent } from '../trackers/xp-tracker/player-search.component';
import { PlayerWidgetComponent } from '../trackers/xp-tracker/player-widget/player-widget.component';
import { XpTrackerStore } from '../trackers/xp-tracker/xp-tracker.store';
import { OsrsNewsCardSkeletonComponent } from './osrs-news-card/osrs-news-card-skeleton.component';
import OsrsNewsCardComponent from './osrs-news-card/osrs-news-card.component';

@Component({
  selector: 'home',
  templateUrl: './home.component.html',
  imports: [
    RouterLink,
    CardComponent,
    LoadErrorComponent,
    OsrsNewsCardComponent,
    OsrsNewsCardSkeletonComponent,
    PlayerSearchComponent,
    PlayerWidgetComponent,
    ItemSearchComponent,
    ItemWidgetComponent,
  ],
})
export default class HomeComponent {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);

  readonly scrapingOffset: Signal<number> = inject(XpTrackerStore).scrapingOffset;

  readonly osrsNewsItems: ResourceRef<OsrsNewsItem[]> = rxResource({
    stream: () => this.osrsTrackerRepo.getNews(),
    defaultValue: [],
  });

  readonly recentPlayerLookups: ResourceRef<Player[]> = rxResource({
    stream: () => this.osrsTrackerRepo.getRecentPlayerLookups(),
    defaultValue: [],
  });

  readonly recentItemLookups: ResourceRef<Item[]> = rxResource({
    stream: () => this.osrsTrackerRepo.getRecentItemLookups(),
    defaultValue: [],
  });
}
