import { DecimalPipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { Item } from '@osrs-tracker/models';
import { InfoTooltipComponent } from 'src/app/common/components/general/tooltip/info-tooltip.component';
import { TooltipComponent } from 'src/app/common/components/general/tooltip/tooltip.component';
import { TimeAgoPipe } from 'src/app/common/pipes/time-ago.pipe';
import { LatestPrices } from 'src/app/common/repositories/osrs-prices.repo';
import { GoogleAnalyticsService } from 'src/app/common/services/google-analytics.service';
import { config } from 'src/config/config';
import { PriceTrackerStorageService } from '../../price-tracker-storage.service';

@Component({
  standalone: true,
  selector: 'item-detail-widget',
  templateUrl: './item-detail-widget.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, DecimalPipe, TimeAgoPipe, InfoTooltipComponent, TooltipComponent],
})
export class ItemDetailWidgetComponent implements OnInit {
  @Input() itemDetail: Item;
  @Input() latestPrices: LatestPrices;
  @Input() dailyVolume: number;

  // don't transform icon but transform name, ex. bolts have different name (Diamond_bolts_(e)_5.png vs Diamond_bolts_(e)_detail.png)
  get detailIconUrl(): string {
    return `${config.wikiBaseUrl}/images/${this.itemDetail.name.replaceAll(/\s/g, '_')}_detail.png`;
  }

  get isFavorite(): boolean {
    return this.priceTrackerStorageService.isFavoriteItem(this.itemDetail.id);
  }

  wikiUrl: string;

  constructor(
    private googlAnalyticsService: GoogleAnalyticsService,
    private priceTrackerStorageService: PriceTrackerStorageService,
  ) {}

  ngOnInit(): void {
    this.wikiUrl = `${config.wikiBaseUrl}/w/${this.itemDetail.name.replaceAll(/\s/g, '_')}`;
  }

  toggleFavorite(): void {
    this.googlAnalyticsService.trackEvent('toggle_favorite_item', 'price_tracker', this.itemDetail.id, this.isFavorite);

    this.priceTrackerStorageService.toggleFavoriteItem({
      id: this.itemDetail.id,
      name: this.itemDetail.name,
      icon: this.itemDetail.icon,
    });
  }
}
