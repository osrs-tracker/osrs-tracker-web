import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ListCard, listCardState } from '@app/common/ui/cards/list-card';
import { InfoTooltip } from '@app/common/ui/tooltip/info-tooltip';
import { Icon } from '@app/common/icon/icon';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { TrackerHero } from '../tracker-hero';
import { ItemSearch } from './item-search';
import { PriceTrackerLinks } from './price-tracker-links';
import { ItemRow } from './item-row';
import { PriceTrackerStore } from './price-tracker-store';

@Component({
  selector: 'price-tracker',
  templateUrl: './price-tracker.html',
  imports: [RouterLink, InfoTooltip, ListCard, Icon, TrackerHero, ItemSearch, PriceTrackerLinks, ItemRow],
})
export default class PriceTracker {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly priceTrackerStore = inject(PriceTrackerStore);

  readonly q = input<string>();

  readonly favoriteItems = this.priceTrackerStore.favoriteItems;
  readonly recentItems = this.priceTrackerStore.recentItems;

  readonly recentItemLookups = rxResource({
    stream: () => this.osrsTrackerRepo.getRecentItemLookups(),
    defaultValue: [],
  });
  readonly recentItemLookupsState = computed(() => listCardState(this.recentItemLookups));
}
