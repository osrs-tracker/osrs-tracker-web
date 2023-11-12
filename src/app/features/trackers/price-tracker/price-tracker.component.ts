import { ChangeDetectionStrategy, Component, WritableSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { PageHeaderComponent } from 'src/app/common/components/page-header.component';
import { SpinnerComponent } from 'src/app/common/components/spinner.component';
import { InfoTooltipComponent } from 'src/app/common/components/tooltip/info-tooltip.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { OsrsTrackerRepo } from 'src/app/repositories/osrs-tracker.repo';
import { ItemWidgetComponent } from './item-widget/item-widget.component';
import { PriceTrackerStorageService, RecentItem } from './price-tracker-storage.service';

@Component({
  standalone: true,
  selector: 'price-tracker',
  templateUrl: './price-tracker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    IconDirective,
    InfoTooltipComponent,
    PageHeaderComponent,
    SpinnerComponent,
    ItemWidgetComponent,
  ],
})
export default class PriceTrackerComponent {
  query = '';

  loading: WritableSignal<boolean> = signal(false);
  results: WritableSignal<Item[]> = signal([]);

  get favoriteItems(): RecentItem[] {
    return this.priceTrackerStorageService.getFavoriteItems();
  }

  get recentItems(): RecentItem[] {
    return this.priceTrackerStorageService.getRecentItems();
  }

  constructor(
    private osrsTrackerRepo: OsrsTrackerRepo,
    private priceTrackerStorageService: PriceTrackerStorageService,
  ) {}

  searchItems(): void {
    if (!this.query) return;

    this.loading.set(true);

    this.osrsTrackerRepo.searchItems(this.query).subscribe(items => {
      this.results.set(items ?? []);
      this.loading.set(false);
    });
  }

  trackById(_index: number, item: RecentItem): number {
    return item.id;
  }
}
