import { DecimalPipe, NgIf, NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Item } from '@osrs-tracker/models';
import { InfoTooltipComponent } from 'src/app/common/components/tooltip/info-tooltip.component';
import { TooltipComponent } from 'src/app/common/components/tooltip/tooltip.component';
import { TimeAgoPipe } from 'src/app/common/pipes/time-ago.pipe';
import { GoogleAnalyticsService } from 'src/app/common/services/google-analytics.service';
import { LatestPrices } from 'src/app/repositories/osrs-prices.repo';
import { config } from 'src/config/config';
import { PriceTrackerStorageService } from '../../price-tracker-storage.service';

@Component({
  standalone: true,
  selector: 'item-detail-widget',
  templateUrl: './item-detail-widget.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, NgTemplateOutlet, NgOptimizedImage, DecimalPipe, TimeAgoPipe, InfoTooltipComponent, TooltipComponent],
})
export class ItemDetailWidgetComponent {
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

  constructor(
    private googlAnalyticsService: GoogleAnalyticsService,
    private priceTrackerStorageService: PriceTrackerStorageService,
  ) {}

  goToWiki() {
    window.open(`${config.wikiBaseUrl}/w/${this.itemDetail.name}`, '_blank');
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
