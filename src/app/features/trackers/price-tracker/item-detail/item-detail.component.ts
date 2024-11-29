import { Component, OnInit, computed, inject, input } from '@angular/core';
import { Item } from '@osrs-tracker/models';
import { AveragePricesAtTime, LatestPrices } from 'src/app/common/repositories/osrs-prices.repo';
import { PriceTrackerStorageService } from '../price-tracker-storage.service';
import { ItemAnalyticsComponent } from './item-analytics/item-analytics.component';
import { ItemDetailWidgetComponent } from './item-detail-widget/item-detail.widget.component';

@Component({
  selector: 'item-detail',
  templateUrl: './item-detail.component.html',
  imports: [ItemAnalyticsComponent, ItemDetailWidgetComponent],
})
export default class ItemDetailComponent implements OnInit {
  private readonly priceTrackerStorageService = inject(PriceTrackerStorageService);

  readonly item = input.required<[Item, LatestPrices, number, AveragePricesAtTime[]]>();

  readonly itemDetail = computed((): Item => this.item()[0]);
  readonly latestPrices = computed((): LatestPrices => this.item()[1]);
  readonly dailyVolume = computed((): number => this.item()[2]);
  readonly timeSeriesToday = computed((): AveragePricesAtTime[] => this.item()[3]);

  ngOnInit(): void {
    this.priceTrackerStorageService.pushRecentItem({
      id: this.itemDetail().id,
      name: this.itemDetail().name,
      icon: this.itemDetail().icon,
    });
  }
}
