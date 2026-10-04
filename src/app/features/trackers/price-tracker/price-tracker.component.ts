import { Component, ResourceRef, WritableSignal, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { Subscription, finalize } from 'rxjs';
import { LoadErrorComponent } from 'src/app/common/components/general/load-error.component';
import { SpinnerComponent } from 'src/app/common/components/general/spinner.component';
import { InfoTooltipComponent } from 'src/app/common/components/general/tooltip/info-tooltip.component';
import { PageHeaderComponent } from 'src/app/common/components/layout/page-header.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { ItemWidgetComponent } from './item-widget/item-widget.component';
import { PriceTrackerStorageService, RecentItem } from './price-tracker-storage.service';

@Component({
  selector: 'price-tracker',
  templateUrl: './price-tracker.component.html',
  imports: [
    RouterLink,
    FormsModule,
    IconDirective,
    InfoTooltipComponent,
    LoadErrorComponent,
    PageHeaderComponent,
    SpinnerComponent,
    ItemWidgetComponent,
  ],
})
export default class PriceTrackerComponent {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly priceTrackerStorageService = inject(PriceTrackerStorageService);

  readonly query: WritableSignal<string> = signal('');
  readonly loading: WritableSignal<boolean> = signal(false);
  readonly results: WritableSignal<Item[]> = signal([]);

  private searchSubscription?: Subscription;

  get favoriteItems(): RecentItem[] {
    return this.priceTrackerStorageService.getFavoriteItems();
  }

  get recentItems(): RecentItem[] {
    return this.priceTrackerStorageService.getRecentItems();
  }

  readonly recentItemLookups: ResourceRef<Item[]> = rxResource({
    stream: () => this.osrsTrackerRepo.getRecentItemLookups(),
    defaultValue: [],
  });

  searchItems(): void {
    if (!this.query()) return;

    // Cancel the previous search (before setting loading, as this runs its finalize), so a slow earlier response can't
    // overwrite a newer one
    this.searchSubscription?.unsubscribe();
    this.loading.set(true);

    this.searchSubscription = this.osrsTrackerRepo
      .searchItems(this.query())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: items => this.results.set(items ?? []),
        error: () => this.results.set([]),
      });
  }
}
