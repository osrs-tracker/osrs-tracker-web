import { Component, ResourceRef, Signal, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { LoadErrorComponent } from 'src/app/common/components/general/load-error.component';
import { SpinnerComponent } from 'src/app/common/components/general/spinner.component';
import { InfoTooltipComponent } from 'src/app/common/components/general/tooltip/info-tooltip.component';
import { PageHeaderComponent } from 'src/app/common/components/layout/page-header.component';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { ItemSearchComponent } from './item-search.component';
import { ItemWidgetComponent } from './item-widget/item-widget.component';
import { PriceTrackerStore, RecentItem } from './price-tracker.store';

@Component({
  selector: 'price-tracker',
  templateUrl: './price-tracker.component.html',
  imports: [
    RouterLink,
    InfoTooltipComponent,
    LoadErrorComponent,
    PageHeaderComponent,
    SpinnerComponent,
    ItemSearchComponent,
    ItemWidgetComponent,
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
}
