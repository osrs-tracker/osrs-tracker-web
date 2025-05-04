import { DecimalPipe, NgOptimizedImage } from '@angular/common';
import { Component, InputSignal, OnInit, inject, input } from '@angular/core';
import { Item } from '@osrs-tracker/models';
import { InfoTooltipComponent } from 'src/app/common/components/general/tooltip/info-tooltip.component';
import { TooltipComponent } from 'src/app/common/components/general/tooltip/tooltip.component';
import { TimeAgoPipe } from 'src/app/common/pipes/time-ago.pipe';
import { LatestPrices } from 'src/app/common/repositories/osrs-prices.repo';
import { AnalyticsService } from 'src/app/common/services/analytics/analytics.service';
import { config } from 'src/config/config';
import { PriceTrackerStorageService } from '../../price-tracker-storage.service';

@Component({
  selector: 'item-detail-widget',
  templateUrl: './item-detail-widget.component.html',
  imports: [NgOptimizedImage, DecimalPipe, TimeAgoPipe, InfoTooltipComponent, TooltipComponent],
})
export class ItemDetailWidgetComponent implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly priceTrackerStorageService = inject(PriceTrackerStorageService);

  readonly itemDetail: InputSignal<Item> = input.required();
  readonly latestPrices: InputSignal<LatestPrices> = input.required();
  readonly dailyVolume: InputSignal<number> = input.required();

  // don't transform icon but transform name, ex. bolts have different name (Diamond_bolts_(e)_5.png vs Diamond_bolts_(e)_detail.png)

  get isFavorite(): boolean {
    return this.priceTrackerStorageService.isFavoriteItem(this.itemDetail().id);
  }

  pixelated = false;
  detailIconUrl: string;
  wikiUrl: string;

  ngOnInit(): void {
    this.detailIconUrl = `${config.wikiBaseUrl}/images/${this.itemDetail().name.replaceAll(/\s/g, '_')}_detail.png`;
    this.wikiUrl = `${config.wikiBaseUrl}/w/${this.itemDetail().name.replaceAll(/\s/g, '_')}`;
  }

  setFallbackIconUrl(): void {
    this.pixelated = true;
    this.detailIconUrl = `${config.wikiBaseUrl}/images/${this.itemDetail().icon.replaceAll(/\s/g, '_')}`;
  }

  toggleFavorite(): void {
    this.analyticsService.trackEvent('toggle_favorite_item', 'price_tracker', this.itemDetail().id, this.isFavorite);

    this.priceTrackerStorageService.toggleFavoriteItem({
      id: this.itemDetail().id,
      name: this.itemDetail().name,
      icon: this.itemDetail().icon,
    });
  }
}
