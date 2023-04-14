import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Item } from '@osrs-tracker/models';
import { LatestPrices } from 'src/app/services/repositories/osrs-prices.repo';
import { config } from 'src/config/config';
import { PriceTrackerService } from '../../price-tracker.service';

@Component({
  selector: 'item-detail-widget',
  templateUrl: './item-detail-widget.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemDetailWidgetComponent {
  @Input() itemDetail: Item;
  @Input() latestPrices: LatestPrices;

  // don't transform icon but transform name, ex. bolts have different name (Diamond_bolts_(e)_5.png vs Diamond_bolts_(e)_detail.png)
  get detailIconUrl(): string {
    return `${config.wikiBaseUrl}/images/${this.itemDetail.name.replaceAll(/\s/g, '_')}_detail.png`;
  }

  get isFavorite(): boolean {
    return this.priceTrackerService.isFavoriteItem(this.itemDetail.id);
  }

  constructor(private priceTrackerService: PriceTrackerService) {}

  goToWiki() {
    window.open(`${config.wikiBaseUrl}/w/${this.itemDetail.name}`, '_blank');
  }

  toggleFavorite(): void {
    this.priceTrackerService.toggleFavoriteItem({
      id: this.itemDetail.id,
      name: this.itemDetail.name,
      icon: this.itemDetail.icon,
    });
  }
}
