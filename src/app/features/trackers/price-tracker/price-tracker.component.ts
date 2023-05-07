import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, WritableSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { SpinnerComponent } from 'src/app/common/components/spinner.component';
import { InfoTooltipComponent } from 'src/app/common/components/tooltip/info-tooltip.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { OsrsTrackerRepo } from 'src/app/repositories/osrs-tracker.repo';
import { ItemWidgetComponent } from './item-widget/item-widget.component';
import { PriceTrackerService, RecentItem } from './price-tracker.service';

@Component({
  standalone: true,
  selector: 'price-tracker',
  templateUrl: './price-tracker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgIf,
    NgFor,
    RouterLink,
    FormsModule,
    IconDirective,
    InfoTooltipComponent,
    SpinnerComponent,
    ItemWidgetComponent,
  ],
})
export default class PriceTrackerComponent {
  query = '';

  loading: WritableSignal<boolean> = signal(false);
  results: WritableSignal<Item[]> = signal([]);

  get favoriteItems(): RecentItem[] {
    return this.priceTrackerService.getFavoriteItems();
  }

  get recentItems(): RecentItem[] {
    return this.priceTrackerService.getRecentItems();
  }

  constructor(private osrsTrackerRepo: OsrsTrackerRepo, private priceTrackerService: PriceTrackerService) {}

  searchItems(): void {
    if (!this.query) return;

    this.loading.set(true);

    this.osrsTrackerRepo.searchItems(this.query).subscribe(items => {
      this.results.set(items);
      this.loading.set(false);
    });
  }

  trackById(_index: number, item: RecentItem): number {
    return item.id;
  }
}
