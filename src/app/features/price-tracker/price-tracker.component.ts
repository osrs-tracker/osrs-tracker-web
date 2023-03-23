import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'price-tracker',
  templateUrl: './price-tracker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceTrackerComponent {
  loading = false;
  query = '';
}
