import { Component, InputSignal, ResourceRef, Signal, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { ListCard, ListCardState, listCardState } from '@app/common/components/general/list-card';
import { InfoTooltip } from '@app/common/components/general/tooltip/info-tooltip';
import { Icon } from '@app/common/directives/icon/icon';
import { OsrsTrackerRepo } from '@app/common/repositories/osrs-tracker-repo';
import { TrackerHero } from '../tracker-hero';
import { ItemSearch } from './item-search';
import { ItemRow } from './item-row/item-row';
import { PriceTrackerStore, RecentItem } from './price-tracker-store';

@Component({
  selector: 'price-tracker',
  templateUrl: './price-tracker.html',
  imports: [RouterLink, InfoTooltip, ListCard, Icon, TrackerHero, ItemSearch, ItemRow],
})
export default class PriceTracker {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly priceTrackerStore = inject(PriceTrackerStore);

  /** A search to run straight away, from `?q=` (e.g. from an item page that wasn't found) */
  readonly q: InputSignal<string | undefined> = input<string>();

  readonly favoriteItems: Signal<RecentItem[]> = this.priceTrackerStore.favoriteItems;
  readonly recentItems: Signal<RecentItem[]> = this.priceTrackerStore.recentItems;

  readonly recentItemLookups: ResourceRef<Item[]> = rxResource({
    stream: () => this.osrsTrackerRepo.getRecentItemLookups(),
    defaultValue: [],
  });
  readonly recentItemLookupsState: Signal<ListCardState> = computed(() => listCardState(this.recentItemLookups));
}
