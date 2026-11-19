import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlayerType } from '@osrs-tracker/models';
import { AveragePricesAtTime, LatestPrices } from '@app/common/api/osrs-prices-repo';
import { PRICE_WORLD, PriceWorld, priceTrackerPath } from '@app/common/api/price-world';
import { formatWhole } from '@app/common/format/number-format';
import { Icon } from '@app/common/icon/icon';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { dailyVolumes, PriceChange, priceChange } from './item-prices';

/** One world's side of the item, as the tiles show it */
export interface WorldTile {
  world: PriceWorld;
  /** The latest instant sell, as the header's price; `null` without trades */
  price: number | null;
  priceLoading: boolean;
  priceFailed: boolean;
  /** Over the last 7 days, as the price chart's legend; `undefined` without trades */
  week: PriceChange | undefined;
  /** Items bought and sold on the last finished UTC day, as the volume card counts them */
  traded: number;
  historyLoading: boolean;
  historyFailed: boolean;
}

export interface WorldPrices {
  /** `undefined` while loading or after a failed load */
  latest: LatestPrices | undefined;
  latestLoading: boolean;
  latestFailed: boolean;
  /** The hourly series of the last 7 days, empty while loading or after a failed load */
  hourly: AveragePricesAtTime[];
  hourlyLoading: boolean;
  hourlyFailed: boolean;
}

export function worldTile(world: PriceWorld, prices: WorldPrices, now: Date): WorldTile {
  const [yesterday] = dailyVolumes(prices.hourly, now, 2);
  return {
    world,
    price: prices.latest?.low || null,
    priceLoading: prices.latestLoading,
    priceFailed: prices.latestFailed,
    week: priceChange(prices.hourly.map(hour => hour.avgLowPrice)),
    traded: yesterday.bought + yesterday.sold,
    historyLoading: prices.hourlyLoading,
    historyFailed: prices.hourlyFailed,
  };
}

/**
 * The item in both worlds side by side, which also joins the two sets of pages for visitors and search engines. Always
 * Main first, as the world switch on the landing page.
 */
@Component({
  selector: 'nav[world-tiles]',
  template: `
    @for (tile of tiles(); track tile.world) {
      @let current = tile.world === world;
      <a
        class="flex flex-col gap-0.5 min-w-0 p-3 sm:px-4 rounded-xl bg-inner border-2 hover:bg-row"
        [class]="current ? 'border-accent' : 'border-line'"
        [routerLink]="path(tile.world)"
        [attr.aria-current]="current ? 'page' : null"
      >
        <span class="flex items-center gap-2 text-sm/5 font-bold text-strong">
          <img
            class="size-4.5 shrink-0"
            icon
            alt=""
            eager
            [name]="tile.world === 'hardcore' ? PlayerType.HardcoreMain : 'coin stack'"
          />
          <span class="truncate">{{ tile.world === 'hardcore' ? 'Hardcore Worlds' : 'Main' }}</span>
          <span class="ml-auto shrink-0 text-xs font-bold" [class]="current ? 'text-muted' : 'text-accent'">{{
            current ? 'This page' : 'View →'
          }}</span>
        </span>

        @if (tile.priceLoading) {
          <skeleton class="h-6 sm:h-8 w-28 my-1 rounded-lg" />
        } @else {
          <span class="text-xl/8 sm:text-2xl/8 font-bold text-strong tabular-nums">
            {{ tile.price === null ? '–' : formatWhole(tile.price) }}
            @if (tile.price !== null) {
              <span class="text-sm font-normal text-muted">gp</span>
            }
          </span>
        }

        @if (tile.priceFailed || tile.historyFailed) {
          <span class="text-sm/5 text-muted">Not loaded</span>
        } @else if (tile.historyLoading) {
          <skeleton class="h-4 w-32 my-0.5" />
        } @else {
          <span class="text-sm/5 text-muted">
            @if (tile.week; as week) {
              <span
                class="font-bold"
                [class]="week.tone === 'up' ? 'text-up' : week.tone === 'down' ? 'text-down' : 'text-muted'"
                >{{ week.percent }}</span
              >
              this week
              <span class="max-sm:hidden" aria-hidden="true"> · </span>
            }
            <span class="max-sm:block">{{ formatWhole(tile.traded) }} traded yesterday</span>
          </span>
        }
      </a>
    }
  `,
  host: {
    'class': 'grid grid-cols-2 gap-3 p-3 rounded-2xl bg-card',
    'aria-label': 'Game world',
  },
  imports: [Icon, RouterLink, Skeleton],
})
export class WorldTiles {
  protected readonly world = inject(PRICE_WORLD);
  protected readonly PlayerType = PlayerType;
  protected readonly formatWhole = formatWhole;

  readonly itemId = input.required<number>();
  readonly tiles = input.required<WorldTile[]>();

  protected path(world: PriceWorld): string {
    return `${priceTrackerPath(world)}/${this.itemId()}`;
  }
}
