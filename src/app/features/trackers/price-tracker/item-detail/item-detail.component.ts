import { Component, InputSignal, OnInit, inject, input } from '@angular/core';
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
  private readonly priceTrackerStore = inject(PriceTrackerStore);

  readonly itemDetail: InputSignal<ItemDetail> = input.required();

  ngOnInit(): void {
    const { id, name, icon } = this.itemDetail().item;
    this.priceTrackerStore.pushRecentItem({ id, name, icon });
  }
}
