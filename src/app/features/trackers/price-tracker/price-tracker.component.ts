import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Item } from '@osrs-tracker/models';
import { trackChanges } from 'src/app/core/decorators/track-changes.decorator';
import { MetaService } from 'src/app/services/meta.service';
import { OsrsTrackerRepo } from 'src/app/services/repositories/osrs-tracker.repo';
import { PriceTrackerService, RecentItem } from './price-tracker.service';

@Component({
  selector: 'price-tracker',
  templateUrl: './price-tracker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceTrackerComponent implements OnInit {
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
    private metaService: MetaService,
    private osrsTrackerRepo: OsrsTrackerRepo,
    private priceTrackerService: PriceTrackerService,
  ) {}

  ngOnInit(): void {
    this.metaService.setPriceTrackerMeta();
  }

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
