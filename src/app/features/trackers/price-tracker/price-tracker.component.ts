import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { Item } from '@osrs-tracker/models';
import { trackChanges } from 'src/app/core/decorators/track-changes.decorator';
import { OsrsTrackerRepo } from 'src/app/services/repositories/osrs-tracker.repo';

@Component({
  selector: 'price-tracker',
  templateUrl: './price-tracker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceTrackerComponent {
  @trackChanges loading = false;

  query = '';
  results: Item[] = [];

  constructor(public cdRef: ChangeDetectorRef, private osrsTrackerRepo: OsrsTrackerRepo) {}

  searchItems(): void {
    if (!this.query) return;

    this.loading = true;

    this.osrsTrackerRepo.searchItems(this.query).subscribe(items => {
      this.results = items;
      this.loading = false;
    });
  }
}
