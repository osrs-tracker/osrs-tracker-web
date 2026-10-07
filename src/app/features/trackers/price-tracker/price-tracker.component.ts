import { Component, ResourceRef, Signal, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { ListCardComponent, ListCardState, listCardState } from 'src/app/common/components/general/list-card.component';
import { InfoTooltipComponent } from 'src/app/common/components/general/tooltip/info-tooltip.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { TrackerHeroComponent } from '../tracker-hero.component';
import { ItemSearchComponent } from './item-search.component';
import { ItemRowComponent } from './item-row/item-row.component';
import { PriceTrackerStore, RecentItem } from './price-tracker.store';

@Component({
  selector: 'price-tracker',
  templateUrl: './price-tracker.component.html',
  imports: [
    RouterLink,
    InfoTooltipComponent,
    ListCardComponent,
    IconDirective,
    TrackerHeroComponent,
    ItemSearchComponent,
    ItemRowComponent,
  ],
})
export default class PriceTrackerComponent {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly priceTrackerStore = inject(PriceTrackerStore);

  readonly favoriteItems: Signal<RecentItem[]> = this.priceTrackerStore.favoriteItems;
  readonly recentItems: Signal<RecentItem[]> = this.priceTrackerStore.recentItems;

  readonly recentItemLookups: ResourceRef<Item[]> = rxResource({
    stream: () => this.osrsTrackerRepo.getRecentItemLookups(),
    defaultValue: [],
  });
  readonly recentItemLookupsState: Signal<ListCardState> = computed(() => listCardState(this.recentItemLookups));
}
