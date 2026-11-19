import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ListCard, listCardState } from '@app/common/ui/cards/list-card';
import { InfoTooltip } from '@app/common/ui/tooltip/info-tooltip';
import { Icon } from '@app/common/icon/icon';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { PRICE_WORLD, priceTrackerPath } from '@app/common/api/price-world';
import { TrackerHero } from '../tracker-hero';
import { HARDCORE_FAQ } from './hardcore-faq';
import { ItemSearch } from './item-search';
import { PriceTrackerLinks } from './price-tracker-links';
import { ItemRow } from './item-row';
import { PriceMoversCard } from './price-movers/price-movers-card';
import { PriceTrackerStore } from './price-tracker-store';
import { WorldSwitch } from './world-switch';

@Component({
  selector: 'price-tracker',
  templateUrl: './price-tracker.html',
  imports: [
    RouterLink,
    InfoTooltip,
    ListCard,
    Icon,
    TrackerHero,
    ItemSearch,
    PriceTrackerLinks,
    ItemRow,
    PriceMoversCard,
    WorldSwitch,
  ],
})
export default class PriceTracker {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly priceTrackerStore = inject(PriceTrackerStore);

  readonly world = inject(PRICE_WORLD);
  readonly isHardcore = this.world === 'hardcore';
  readonly itemsPath = priceTrackerPath(this.world);
  readonly faqs = HARDCORE_FAQ;

  readonly q = input<string>();

  readonly favoriteItems = this.priceTrackerStore.favoriteItems;
  readonly recentItems = computed(() => this.priceTrackerStore.recentItems()[this.world]);

  readonly recentItemLookups = rxResource({
    stream: () => this.osrsTrackerRepo.getRecentItemLookups(),
    defaultValue: [],
  });
  readonly recentItemLookupsState = computed(() => listCardState(this.recentItemLookups));
}
