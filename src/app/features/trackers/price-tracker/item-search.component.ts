import { Component, ResourceRef, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { Subscription, finalize, forkJoin, map, of } from 'rxjs';
import { LoadErrorComponent } from 'src/app/common/components/general/load-error.component';
import { SkeletonComponent } from 'src/app/common/components/general/skeleton.component';
import { SpinnerComponent } from 'src/app/common/components/general/spinner.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { formatNumberLegible } from 'src/app/common/helpers/number.helper';
import { OsrsPricesRepo } from 'src/app/common/repositories/osrs-prices.repo';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';

/** Item name search with a floating dropdown of matching items and their prices, linking to their price pages. */
@Component({
  selector: 'item-search',
  host: { class: 'relative block w-full' },
  template: `
    <form autocomplete="off" class="search-box">
      <label for="item-search" class="sr-only">Item name</label>
      <input
        id="item-search"
        type="search"
        class="search-box-input"
        placeholder="Item name, e.g. Abyssal whip"
        name="query"
        [(ngModel)]="query"
        autocomplete="hidden"
      />

      <button type="submit" class="relative button--primary" (click)="searchItems()">
        <span class="flex items-center gap-2" [class.invisible]="loading()">
          <svg
            class="size-4.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Search
        </span>

        @if (loading()) {
          <spinner class="absolute inset-0 flex items-center justify-center"></spinner>
        }
      </button>
    </form>

    @if (open()) {
      <div
        class="absolute inset-x-0 top-full z-10 mt-2 rounded-2xl bg-card border border-border shadow-float overflow-hidden"
      >
        @if (error()) {
          <load-error source="item-search" message="Couldn't search items." (retry)="searchItems()" />
        } @else if (results().length) {
          <ul class="py-1.5 max-h-70 overflow-y-auto scroll-bar">
            @for (item of results(); track item.id) {
              <li>
                <a
                  class="flex items-center gap-3 min-h-11 px-4 py-1.5 font-bold text-strong hover:bg-row focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                  [routerLink]="['/trackers/price', item.id]"
                >
                  <span class="flex items-center justify-center size-8 shrink-0" aria-hidden="true">
                    <img class="max-w-7 max-h-7" icon [name]="item.icon" [wiki]="true" />
                  </span>
                  <span class="flex-1 min-w-0">{{ item.name }}</span>
                  @if (pricesResource.isLoading()) {
                    <skeleton class="h-3 w-14" />
                  } @else if (pricesResource.error()) {
                    <load-error
                      compact
                      source="item-search-prices"
                      message="Couldn't load the price."
                      (retry)="pricesResource.reload()"
                    />
                  } @else if (prices()[item.id]; as price) {
                    <span class="text-sm font-normal text-muted tabular-nums">{{ shortPrice(price) }} gp</span>
                  }
                </a>
              </li>
            }
          </ul>
        } @else {
          <p class="p-4 text-muted">No items match “{{ searchedQuery() }}”.</p>
        }
      </div>
    }
  `,
  imports: [FormsModule, RouterLink, IconDirective, LoadErrorComponent, SkeletonComponent, SpinnerComponent],
})
export class ItemSearchComponent {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly osrsPricesRepo = inject(OsrsPricesRepo);

  readonly query: WritableSignal<string> = signal('');
  readonly loading: WritableSignal<boolean> = signal(false);
  readonly results: WritableSignal<Item[]> = signal([]);
  readonly error: WritableSignal<boolean> = signal(false);
  /** The query of the last finished search, for the "No items match" message. */
  readonly searchedQuery: WritableSignal<string | null> = signal(null);

  /** Shown once a search has finished or failed, and hidden again when the input is cleared. */
  readonly open: Signal<boolean> = computed(
    () => !!this.query().trim() && (this.error() || this.searchedQuery() !== null),
  );

  /** The latest instant-sell price per result; the requests share one fetch of all latest prices. */
  readonly pricesResource: ResourceRef<Record<number, number | undefined>> = rxResource({
    params: () => ({ ids: this.results().map(item => item.id) }),
    stream: ({ params: { ids } }) =>
      ids.length
        ? forkJoin(ids.map(id => this.osrsPricesRepo.getLatestPrices(id).pipe(map(prices => [id, prices.low])))).pipe(
            map(entries => Object.fromEntries(entries)),
          )
        : of({}),
    defaultValue: {},
  });
  readonly prices: Signal<Record<number, number | undefined>> = computed(() =>
    this.pricesResource.hasValue() ? this.pricesResource.value() : {},
  );

  private searchSubscription?: Subscription;

  shortPrice(price: number): string {
    return formatNumberLegible(price);
  }

  searchItems(): void {
    this.error.set(false);
    if (!this.query()) return;

    // Cancel the previous search (before setting loading, as this runs its finalize), so a slow earlier response can't
    // overwrite a newer one
    this.searchSubscription?.unsubscribe();
    this.loading.set(true);

    const query = this.query();
    this.searchSubscription = this.osrsTrackerRepo
      .searchItems(query)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: items => {
          this.results.set(items ?? []);
          this.searchedQuery.set(query);
        },
        error: () => {
          this.results.set([]);
          this.error.set(true);
        },
      });
  }
}
