import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { LatestPrices } from 'src/app/services/repositories/osrs-prices.repo';

@Component({
  selector: 'item-detail',
  templateUrl: './item-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemDetailComponent {
  get itemDetail(): Item {
    return this.activatedRoute.snapshot.data['item'][0];
  }

  get latestPrices(): LatestPrices {
    return this.activatedRoute.snapshot.data['item'][1];
  }

  constructor(private activatedRoute: ActivatedRoute) {}
}
