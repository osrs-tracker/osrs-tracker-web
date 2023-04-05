import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Item } from '@osrs-tracker/models';

@Component({
  selector: 'item-detail',
  templateUrl: './item-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemDetailComponent {
  get itemDetail(): Item {
    return this.activatedRoute.snapshot.data['item'];
  }

  constructor(private activatedRoute: ActivatedRoute) {}
}
