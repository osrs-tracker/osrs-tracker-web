import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { Item } from '@osrs-tracker/models';
import { trackChanges } from 'src/app/core/decorators/track-changes.decorator';
import { OsrsTrackerRepo } from 'src/app/services/repositories/osrs-tracker.repo';
import { PriceTrackerService, RecentItem } from './price-tracker.service';

@Component({
  selector: 'price-tracker',
  templateUrl: './price-tracker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceTrackerComponent {
  @trackChanges loading = false;

  query = '';
  results: Item[] = [];

  get favoriteItems(): RecentItem[] {
    return this.priceTrackerService.getFavoriteItems();
  }

  get recentItems(): RecentItem[] {
    return this.priceTrackerService.getRecentItems();
  }

  constructor(
    public cdRef: ChangeDetectorRef,
    private osrsTrackerRepo: OsrsTrackerRepo,
    private priceTrackerService: PriceTrackerService,
  ) {}

  searchItems(): void {
    if (!this.query) return;

    this.loading = true;

    this.osrsTrackerRepo.searchItems(this.query).subscribe(items => {
      this.results = items;
      this.loading = false;
    });
  }

  trackById(_index: number, item: RecentItem): number {
    return item.id;
  }
}
