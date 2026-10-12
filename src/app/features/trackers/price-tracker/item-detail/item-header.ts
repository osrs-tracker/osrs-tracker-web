import { Component, InputSignal, OutputEmitterRef, Signal, computed, inject, input, output } from '@angular/core';
import { Item } from '@osrs-tracker/models';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { Icon } from '@app/common/icon/icon';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { config } from '@config/config';
import { PriceTrackerStore } from '../price-tracker-store';
import { formatWhole } from './item-prices';

/**
 * The item page's header: icon tile, the name (to the OSRS Wiki), the examine text, the instant
 * sell price with its change since yesterday's 24-hour average, and the favourite star beside it. On phones the price
 * and star move below the name, so a long name gets the full width.
 */
@Component({
  selector: 'header[item-header]',
  template: `
    <span
      class="flex items-center justify-center size-16 shrink-0 rounded-2xl bg-deep border border-line"
      aria-hidden="true"
    >
      <img class="max-w-12 max-h-12" icon eager [name]="item().icon" [wiki]="true" [scale]="1.25" />
    </span>

    <div class="flex flex-col gap-1.5 flex-1 basis-0 min-w-0 sm:basis-65">
      <!-- The name links to the wiki, as the player page's name links to the hiscores. Inline, so the icon follows the
           last word when a long name wraps: the word joiner keeps them together, and the top margin centres the icon on
           the line (24px, 36px from sm). -->
      <a
        class="text-2xl/none sm:text-4xl/none font-bold text-strong hover:text-accent"
        [href]="wikiUrl()"
        target="_blank"
        rel="noopener"
        title="Open on the OSRS Wiki"
      >
        <h1 class="inline">{{ item().name }}&#8288;</h1>
        <svg
          class="inline size-4.5 ml-2.5 mt-0.75 align-top text-muted sm:mt-2.25"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M14 4h6v6" />
          <path d="M20 4l-9 9" />
          <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
        </svg>
        <span class="sr-only">(opens the OSRS Wiki in a new tab)</span>
      </a>
      <p class="text-base text-muted">{{ item().examine }}</p>
    </div>

    <div class="flex items-center gap-4 basis-full sm:basis-auto sm:gap-6">
      <div
        class="flex flex-col items-start gap-1.5 flex-1 sm:items-end"
        title="Latest instant sell price, compared with yesterday's 24-hour average (UTC)"
      >
        <span class="text-sm text-muted">Instant sell price</span>
        @if (loading()) {
          <skeleton class="h-7.5 sm:h-9 w-50 rounded-lg" tone="ground" />
          <skeleton class="h-4 w-30 my-0.5" tone="ground" />
        } @else if (error()) {
          <div class="flex items-center gap-2 text-muted">
            Couldn't load the price.
            <load-error compact source="item-header-price" message="Couldn't load the price." (retry)="retry.emit()" />
          </div>
        } @else if (price() === null) {
          <span class="text-3xl/none sm:text-4xl/none font-bold text-muted">–</span>
          <span class="text-muted">No recent trades</span>
        } @else {
          <span class="text-3xl/none sm:text-4xl/none font-bold text-strong tabular-nums">{{ priceText() }}</span>
          @if (averageLoading()) {
            <skeleton class="h-4 w-30 my-0.5" tone="ground" />
          } @else if (averageError()) {
            <span class="flex items-center gap-1 text-sm text-muted">
              Couldn't load yesterday's average.
              <load-error
                compact
                source="item-header-change"
                message="Couldn't load yesterday's average."
                (retry)="retryAverage.emit()"
              />
            </span>
          } @else if (change(); as change) {
            <span class="font-bold whitespace-nowrap tabular-nums" [class]="change.up ? 'text-up' : 'text-down'">
              {{ change.text }}
            </span>
          }
        }
      </div>

      <!-- Deferred because favourites are read from local storage, which isn't available during SSR -->
      @defer {
        <button
          type="button"
          class="flex items-center justify-center size-12 shrink-0 rounded-full border border-line bg-card hover:bg-row"
          [class]="isFavorite() ? 'text-amber' : 'text-muted'"
          [attr.aria-label]="isFavorite() ? 'Remove from favourites' : 'Add to favourites'"
          [attr.aria-pressed]="isFavorite()"
          [title]="isFavorite() ? 'Remove from favourites' : 'Add to favourites'"
          (click)="toggleFavorite()"
        >
          <svg
            class="size-5.5"
            viewBox="0 0 24 24"
            [attr.fill]="isFavorite() ? 'currentColor' : 'none'"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 17.3l-6.2 3.6 1.6-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7z" />
          </svg>
        </button>
      } @placeholder {
        <skeleton class="size-12 shrink-0 rounded-full" tone="ground" />
      }
    </div>
  `,
  host: { class: 'max-w-page mx-auto flex flex-wrap items-center gap-4 px-4 sm:px-6 py-2' },
  imports: [Icon, LoadError, Skeleton],
})
export class ItemHeader {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly priceTrackerStore = inject(PriceTrackerStore);

  readonly item: InputSignal<Item> = input.required();
  /** The latest instant sell price, `null` without recent trades */
  readonly price: InputSignal<number | null> = input<number | null>(null);
  /** Yesterday's (UTC) 24-hour average instant sell price, `null` without trades */
  readonly average: InputSignal<number | null> = input<number | null>(null);
  /** The price is loading */
  readonly loading: InputSignal<boolean> = input(false);
  /** Yesterday's average is loading, so the change isn't known yet */
  readonly averageLoading: InputSignal<boolean> = input(false);
  readonly error: InputSignal<boolean> = input(false);
  /** Yesterday's average failed to load, so the change can't be shown */
  readonly averageError: InputSignal<boolean> = input(false);

  readonly retry: OutputEmitterRef<void> = output();
  readonly retryAverage: OutputEmitterRef<void> = output();

  readonly wikiUrl: Signal<string> = computed(
    () => `${config.wikiBaseUrl}/w/${encodeURIComponent(this.item().name.replaceAll(' ', '_'))}`,
  );
  readonly priceText: Signal<string> = computed(() => formatWhole(this.price() ?? 0));
  /** E.g. "−8,402 (−0.6%)" */
  readonly change: Signal<{ text: string; up: boolean } | null> = computed(() => {
    const price = this.price();
    const average = this.average();
    if (price === null || !average) return null;

    const diff = price - average;
    const percent = (Math.abs(diff) / average) * 100;
    const sign = diff < 0 ? '−' : '+';
    return { text: `${formatWhole(diff, true)} (${sign}${percent.toFixed(1)}%)`, up: diff >= 0 };
  });

  readonly isFavorite: Signal<boolean> = computed(() => this.priceTrackerStore.isFavoriteItem(this.item().id));

  toggleFavorite(): void {
    this.analyticsService.trackEvent('toggle_favorite_item', 'price_tracker', this.item().id, this.isFavorite());

    const { id, name, icon } = this.item();
    this.priceTrackerStore.toggleFavoriteItem({ id, name, icon });
  }
}
