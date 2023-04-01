import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'item-detail',
  templateUrl: './item-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemDetailComponent {}
