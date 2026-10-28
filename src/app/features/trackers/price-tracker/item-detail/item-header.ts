import { Component, computed, inject, input, output } from '@angular/core';
import { Item } from '@osrs-tracker/models';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { Icon } from '@app/common/icon/icon';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { config } from '@config/config';
import { PriceTrackerStore } from '../price-tracker-store';
import { formatPercentChange, formatWhole } from '@app/common/format/number-format';
import { LucideExternalLink, LucideStar, LucideTriangle } from '@lucide/angular';

/** On phones the price and star move below the name, so a long name gets the full width */
@Component({
  selector: 'header[item-header]',
  template: `
    <span
      class="flex items-center justify-center size-16 shrink-0 rounded-2xl bg-deep border border-line"
      aria-hidden="true"
    >
      <img class="max-w-12 max-h-12" icon alt="" eager [name]="item().icon" [wiki]="true" [scale]="1.25" />
    </span>

    <div class="flex flex-col gap-1.5 flex-1 basis-0 min-w-0 sm:basis-65">
      <!-- The name links to the wiki, as the player page's name links to the hiscores. Inline, so the icon follows the
           last word when a long name wraps: the word joiner keeps them together (outside the h1, so copying the name
           leaves it out; prettier-ignore, as a line break around it would let them part). The icon's box is one line
           tall and 18px wide, and the SVG draws it centred in that box, so it stays on the line's middle at any font
           size. -->
      <!-- prettier-ignore -->
      <a
        class="self-start text-2xl/none sm:text-4xl/none font-bold text-balance text-strong hover:text-accent"
        [href]="wikiUrl()"
        target="_blank"
        rel="noopener"
        title="Open on the OSRS Wiki"
      ><h1 class="inline">{{ item().name }}</h1>&#8288;<svg
          lucideExternalLink
          class="inline w-4.5 h-lh ml-2.5 align-top text-muted"
        />
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
            <!-- The price chart or the volume card says the history didn't load, with a retry -->
            <span class="text-sm/4.5 text-muted">Change not loaded</span>
          } @else if (change(); as change) {
            <span
              class="flex items-center gap-1.5 font-bold whitespace-nowrap tabular-nums"
              [class]="change.tone === 'up' ? 'text-up' : change.tone === 'down' ? 'text-down' : 'text-muted'"
            >
              @if (change.tone !== 'flat') {
                <svg lucideTriangle class="size-2.5 fill-current" [class]="change.tone === 'up' ? '' : 'rotate-180'" />
                <span class="sr-only">{{ change.tone === 'up' ? 'Up' : 'Down' }}</span>
              }
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
          <svg lucideStar class="size-5.5" [attr.fill]="isFavorite() ? 'currentColor' : 'none'" />
        </button>
      } @placeholder {
        <skeleton class="size-12 shrink-0 rounded-full" tone="ground" />
      }
    </div>
  `,
  host: { class: 'max-w-page mx-auto flex flex-wrap items-center gap-4 px-4 sm:px-6 py-2' },
  imports: [Icon, LoadError, Skeleton, LucideExternalLink, LucideStar, LucideTriangle],
})
export class ItemHeader {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly priceTrackerStore = inject(PriceTrackerStore);

  readonly item = input.required<Item>();
  readonly price = input<number | null>(null);
  /** Yesterday's (UTC) 24-hour average */
  readonly average = input<number | null>(null);
  readonly loading = input(false);
  readonly averageLoading = input(false);
  readonly error = input(false);
  readonly averageError = input(false);

  readonly retry = output();

  readonly wikiUrl = computed(
    () => `${config.wikiBaseUrl}/w/${encodeURIComponent(this.item().name.replaceAll(' ', '_'))}`,
  );
  readonly priceText = computed(() => formatWhole(this.price() ?? 0));
  readonly change = computed(() => {
    const price = this.price();
    const average = this.average();
    if (price === null || !average) return null;

    const { percent, tone } = formatPercentChange(price, average);
    return { text: `${formatWhole(Math.abs(price - average))} (${percent})`, tone };
  });

  readonly isFavorite = computed(() => this.priceTrackerStore.isFavoriteItem(this.item().id));

  toggleFavorite(): void {
    const { id, name, icon } = this.item();
    this.priceTrackerStore.toggleFavoriteItem({ id, name, icon });

    this.analyticsService.trackEvent('toggle_favorite_item', { item_id: id, favorite: this.isFavorite() });
  }
}
