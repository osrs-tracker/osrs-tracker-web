import { Component, InputSignal, OnInit, inject, input } from '@angular/core';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { isHumanVisitor } from 'src/app/core/platform/human-visitor';
import { PriceTrackerStore } from '../price-tracker.store';
import { ItemAnalyticsComponent } from './item-analytics/item-analytics.component';
import { ItemDetailWidgetComponent } from './item-detail-widget/item-detail.widget.component';
import { ItemDetail } from './item-detail.resolver';

@Component({
  selector: 'item-detail',
  templateUrl: './item-detail.component.html',
  imports: [ItemAnalyticsComponent, ItemDetailWidgetComponent],
})
export default class ItemDetailComponent implements OnInit {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly priceTrackerStore = inject(PriceTrackerStore);
  private readonly isHumanVisitor = isHumanVisitor();

  readonly itemDetail: InputSignal<ItemDetail> = input.required();

  ngOnInit(): void {
    const { id, name, icon } = this.itemDetail().item;
    this.priceTrackerStore.pushRecentItem({ id, name, icon });

    // fire and forget: a lookup that isn't recorded only leaves the item out of the recent lookups
    if (this.isHumanVisitor) this.osrsTrackerRepo.recordItemLookup(id).subscribe({ error: () => undefined });
  }
}
