import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { Item } from '@osrs-tracker/models';
import { AveragePricesAtTime, LatestPrices } from 'src/app/common/repositories/osrs-prices.repo';
import { PriceTrackerStorageService } from '../price-tracker-storage.service';
import { ItemAnalyticsComponent } from './item-analytics/item-analytics.component';
import { ItemDetailWidgetComponent } from './item-detail-widget/item-detail.widget.component';

@Component({
  standalone: true,
  selector: 'item-detail',
  templateUrl: './item-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ItemAnalyticsComponent, ItemDetailWidgetComponent],
})
export default class ItemDetailComponent implements OnInit {
  get itemDetail(): Item {
    return this.item[0];
  }

  get latestPrices(): LatestPrices {
    return this.item[1];
  }

  get dailyVolume(): number {
    return this.item[2];
  }

  get timeSeriesToday(): AveragePricesAtTime[] {
    return this.item[3];
  }

  @Input('item') item: [Item, LatestPrices, number, AveragePricesAtTime[]];

  constructor(private priceTrackerStorageService: PriceTrackerStorageService) {}

  ngOnInit(): void {
    this.priceTrackerStorageService.pushRecentItem({
      id: this.itemDetail.id,
      name: this.itemDetail.name,
      icon: this.itemDetail.icon,
    });
  }
}
