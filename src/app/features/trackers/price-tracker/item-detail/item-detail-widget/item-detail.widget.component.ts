import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Item } from '@osrs-tracker/models';
import { LatestPrices } from 'src/app/services/repositories/osrs-prices.repo';
import { config } from 'src/config/config';

@Component({
  selector: 'item-detail-widget',
  templateUrl: './item-detail-widget.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemDetailWidgetComponent {
  @Input() itemDetail: Item;
  @Input() latestPrices: LatestPrices;

  get detailIconUrl(): string {
    return `${config.wikiBaseUrl}/images/${this.itemDetail.icon.replaceAll(/\s/g, '_').replace('.png', '_detail.png')}`;
  }

  goToWiki() {
    window.open(`${config.wikiBaseUrl}/w/${this.itemDetail.name}`, '_blank');
  }
}
