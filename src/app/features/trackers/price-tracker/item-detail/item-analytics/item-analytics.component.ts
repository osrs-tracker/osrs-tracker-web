import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Item } from '@osrs-tracker/models';

@Component({
  selector: 'item-analytics',
  templateUrl: './item-analytics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemAnalyticsComponent {
  @Input() itemDetail: Item;
}
