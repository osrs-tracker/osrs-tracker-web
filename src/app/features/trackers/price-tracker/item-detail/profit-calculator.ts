import { Component, WritableSignal, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Item } from '@osrs-tracker/models';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Segmented, SegmentedOption } from '@app/common/ui/controls/segmented';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { InfoTooltip } from '@app/common/ui/tooltip/info-tooltip';
import { LatestPrices, OsrsPricesRepo } from '@app/common/api/osrs-prices-repo';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { breakEvenSellPrice, geTax, isGeTaxExempt } from './ge-tax';
import { formatNumberLegible, formatSign, formatWhole } from '@app/common/format/number-format';
import { LucideRotateCw } from '@lucide/angular';

type Mode = 'flip' | 'alch';

const NATURE_RUNE_ID = 561;
const HIGH_ALCH_XP = 65;
/** Prices can pass 2,147,483,647 (platinum tokens), but stay well within whole-number precision */
const MAX_DIGITS = 15;

const percent = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Field {
  id: string;
  label: string;
  value: WritableSignal<number>;
}

interface ResultRow {
  label: string;
  value: string;
  tone?: 'down' | 'muted';
  info?: string;
}

@Component({
  selector: 'article[profit-calculator]',
  template: `
    <div class="card-header">
      <h2 class="text-xl/6 font-bold text-strong">Profit calculator</h2>
      <segmented label="Calculation" [options]="modeOptions()" [value]="mode()" (valueChange)="selectMode($event)" />
    </div>

    @if (loading()) {
      <div class="flex flex-col gap-4 p-card" aria-busy="true">
        <span class="sr-only">Loading the latest prices</span>
        <div class="grid grid-cols-3 gap-3">
          <skeleton class="h-16 rounded-xl" />
          <skeleton class="h-16 rounded-xl" />
          <skeleton class="h-16 rounded-xl" />
        </div>
        <skeleton class="h-40 rounded-xl" />
        <skeleton class="h-22 rounded-xl" />
      </div>
    } @else {
      <div class="flex flex-col flex-1 gap-5 p-card">
        <div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            @for (field of fields(); track field.id) {
              <label class="@container flex flex-col gap-1.5 text-sm text-muted last:col-span-full sm:last:col-span-1">
                {{ field.label }}
                <input
                  type="text"
                  inputmode="numeric"
                  autocomplete="off"
                  class="fit-input-digits h-11 min-w-0 px-3 rounded-xl border border-border bg-inner font-bold text-strong tabular-nums focus:border-accent focus:ring-0"
                  [style.--digits]="digitCount(field.value())"
                  [value]="format(field.value())"
                  (input)="onInput($event, field.value)"
                />
              </label>
            }
          </div>

          <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 mt-3">
            <button
              type="button"
              class="flex items-center gap-1.5 text-sm font-bold text-accent hover:text-accent-hover disabled:opacity-40"
              [disabled]="error() || noRecentPrices()"
              (click)="useLatestPrices()"
            >
              <svg lucideRotateCw class="size-3.5" strokeWidth="2.5" />
              Use latest prices
            </button>
            <p class="flex items-center gap-1 text-sm text-muted">
              @if (error()) {
                Couldn't load the latest prices.
                <load-error
                  compact
                  source="profit-calculator-latest"
                  message="Couldn't load the latest prices."
                  (retry)="retry.emit()"
                />
              } @else if (noRecentPrices()) {
                No recent trades to start from.
              } @else if (mode() === 'alch' && natureRune.error()) {
                Couldn't load the nature rune price.
                <load-error
                  compact
                  source="profit-calculator-nature-rune"
                  message="Couldn't load the nature rune price."
                  (retry)="natureRune.reload()"
                />
              } @else {
                {{ note() }}
              }
            </p>
          </div>
        </div>

        <dl class="flex flex-col">
          @for (row of rows(); track row.label) {
            <div class="flex justify-between gap-4 py-2.5 border-b border-line last:border-b-0">
              <dt class="flex items-center text-muted">
                {{ row.label }}
                @if (row.info) {
                  <info-tooltip [label]="'About ' + row.label"
                    ><ng-template>{{ row.info }}</ng-template></info-tooltip
                  >
                }
              </dt>
              <dd
                class="text-right font-bold tabular-nums"
                [class]="row.tone === 'down' ? 'text-down' : row.tone === 'muted' ? 'text-muted' : 'text-strong'"
              >
                {{ row.value }}
              </dd>
            </div>
          }
        </dl>

        <!-- Neutral without the prices, so a missing price doesn't read as a profit of 0 -->
        <div
          class="@container mt-auto flex flex-col gap-1 p-3 rounded-xl border"
          [class]="
            missingPrices()
              ? 'bg-inner border-line'
              : profit().total >= 0
                ? 'bg-up/12 border-up/35'
                : 'bg-down/12 border-down/35'
          "
          aria-live="polite"
        >
          <span class="text-sm text-text">{{ mode() === 'flip' ? 'Total profit' : 'Total alch profit' }}</span>
          <span class="flex items-baseline gap-1.5">
            @if (missingPrices()) {
              <span class="text-4xl/10 font-bold text-muted">–</span>
            } @else {
              <span
                class="fit-total-digits leading-10 font-bold tabular-nums wrap-anywhere"
                [class]="profit().total >= 0 ? 'text-up' : 'text-down'"
                [style.--digits]="totalDigits()"
                >{{ totalText() }}</span
              >
              <span class="font-bold text-text">gp</span>
            }
          </span>
          <span class="text-sm text-text">{{ profit().sub }}</span>
        </div>
      </div>
    }
  `,
  host: { class: 'flex flex-col rounded-2xl bg-card overflow-hidden' },
  imports: [InfoTooltip, LoadError, Segmented, Skeleton, LucideRotateCw],
})
export class ProfitCalculator {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly osrsPricesRepo = inject(OsrsPricesRepo);

  readonly item = input.required<Item>();
  readonly latestPrices = input<LatestPrices | undefined>();
  readonly loading = input(false);
  readonly error = input(false);

  readonly retry = output();

  readonly natureRune = rxResource({
    stream: () => this.osrsPricesRepo.getLatestPrices(NATURE_RUNE_ID),
  });

  readonly mode = signal<Mode>('flip');
  readonly modeOptions = computed<SegmentedOption<Mode>[]>(() => [
    { value: 'flip', label: 'Flip' },
    {
      value: 'alch',
      label: 'High alch',
      disabled: !this.highAlch(),
      title: this.highAlch() ? undefined : "This item can't be alched for coins.",
    },
  ]);

  private readonly highAlch = computed(() => this.item().highalch ?? 0);
  private readonly defaultQuantity = computed(() => this.item().limit || 1);
  private readonly natureRunePrice = computed(() =>
    this.natureRune.hasValue() ? (this.natureRune.value()?.high ?? 0) : 0,
  );

  // Flips buy at the instant sell price and sell at the instant buy price; alching buys at the instant buy price
  readonly buyAt = linkedSignal(() => this.latestPrices()?.low ?? 0);
  readonly sellAt = linkedSignal(() => this.latestPrices()?.high ?? 0);
  readonly flipQuantity = linkedSignal(() => this.defaultQuantity());
  readonly alchBuyAt = linkedSignal(() => this.latestPrices()?.high ?? 0);
  readonly natureRuneAt = linkedSignal(() => this.natureRunePrice());
  readonly alchQuantity = linkedSignal(() => this.defaultQuantity());

  readonly fields = computed<Field[]>(() =>
    this.mode() === 'flip'
      ? [
          { id: 'buy', label: 'Buy at', value: this.buyAt },
          { id: 'sell', label: 'Sell at', value: this.sellAt },
          { id: 'quantity', label: 'Quantity', value: this.flipQuantity },
        ]
      : [
          { id: 'alch-buy', label: 'Buy at', value: this.alchBuyAt },
          { id: 'nature-rune', label: 'Nature rune', value: this.natureRuneAt },
          { id: 'alch-quantity', label: 'Quantity', value: this.alchQuantity },
        ],
  );

  readonly noRecentPrices = computed(() => {
    const latest = this.latestPrices();
    return !!latest && (this.mode() === 'flip' ? !latest.low && !latest.high : !latest.high);
  });

  /** Not the nature rune's price, which is 0 for runes you already have (and while its price loads) */
  readonly missingPrices = computed(() =>
    this.mode() === 'flip' ? !this.buyAt() || !this.sellAt() : !this.alchBuyAt(),
  );

  private readonly taxPerItem = computed(() => geTax(this.item().id, this.sellAt()));

  readonly rows = computed<ResultRow[]>(() => {
    const missing = this.missingPrices();
    if (this.mode() === 'alch') {
      return [
        { label: 'High alch value', value: formatWhole(this.highAlch()) },
        missing
          ? { label: 'Cost per cast', value: '–', tone: 'muted' }
          : { label: 'Cost per cast', value: formatWhole(-(this.alchBuyAt() + this.natureRuneAt())), tone: 'down' },
        {
          label: 'Max buy price for profit',
          value: formatWhole(this.highAlch() - this.natureRuneAt()),
          info: 'The most you can pay for the item and still make a profit, after the nature rune.',
        },
        { label: 'Magic XP', value: formatWhole(HIGH_ALCH_XP * this.alchQuantity()) },
      ];
    }

    const id = this.item().id;
    const buy = this.buyAt();
    const perItem = this.profit().perItem;
    const roi = buy ? (perItem / buy) * 100 : 0;
    if (missing) {
      return ['Margin per item', 'GE tax per item', 'Return on investment', 'Break-even sell price'].map(label => ({
        label,
        value: '–',
        tone: 'muted',
      }));
    }
    return [
      { label: 'Margin per item', value: formatWhole(this.sellAt() - buy) },
      isGeTaxExempt(id)
        ? { label: 'GE tax per item', value: 'No tax on this item', tone: 'muted' }
        : {
            label: 'GE tax per item',
            value: formatWhole(-this.taxPerItem()),
            tone: 'down',
            info: 'GE tax is 2% of the sell price, rounded down and capped at 5M per item.',
          },
      {
        label: 'Return on investment',
        // Shortened past a million percent (a buy price of 1), so it fits beside its label on a phone
        value: `${formatSign(roi)}${Math.abs(roi) < 1e6 ? percent.format(Math.abs(roi)) : formatNumberLegible(Math.abs(roi))}%`,
      },
      {
        label: 'Break-even sell price',
        value: formatWhole(breakEvenSellPrice(id, buy)),
        info: 'The lowest sell price that gets the buy price back after tax.',
      },
    ];
  });

  readonly profit = computed(() => {
    const flip = this.mode() === 'flip';
    const perItem = flip
      ? this.sellAt() - this.buyAt() - this.taxPerItem()
      : this.highAlch() - this.alchBuyAt() - this.natureRuneAt();
    const quantity = flip ? this.flipQuantity() : this.alchQuantity();

    return {
      perItem,
      total: perItem * quantity,
      sub: this.missingPrices()
        ? flip
          ? 'Enter a buy and a sell price'
          : 'Enter a buy price'
        : quantity
          ? `${formatWhole(quantity)} × ${formatWhole(perItem, true)} gp ${flip ? 'after tax' : 'per cast'}`
          : 'Enter a quantity',
    };
  });

  /** Exact however large: a price times a quantity can pass what a number holds without rounding */
  readonly totalText = computed(() => {
    const { perItem } = this.profit();
    const total = BigInt(perItem) * BigInt(this.mode() === 'flip' ? this.flipQuantity() : this.alchQuantity());
    const sign = formatSign(Number(total), 'exceptZero');
    return sign + (total < 0n ? -total : total).toLocaleString('en-US');
  });
  readonly totalDigits = computed(() => this.totalText().replace(/\D/g, '').length);

  readonly note = computed(() => {
    const limit = this.item().limit ? `Buy limit ${formatWhole(this.item().limit)} per 4 hours.` : '';
    return this.mode() === 'flip' ? limit : `1 nature rune and ${HIGH_ALCH_XP} Magic XP per cast. ${limit}`.trim();
  });

  format(value: number, signed = false): string {
    return formatWhole(value, signed);
  }

  digitCount(value: number): number {
    return String(value).length;
  }

  /** Reformatting the text moves the caret, so it's put back after the same digit */
  onInput(event: Event, value: WritableSignal<number>): void {
    const input = event.target as HTMLInputElement;
    const caret = input.selectionStart ?? input.value.length;
    const digitsBeforeCaret = input.value.slice(0, caret).replace(/\D/g, '').length;
    const digits = input.value.replace(/\D/g, '').slice(0, MAX_DIGITS);

    value.set(Number(digits));

    const text = digits ? formatWhole(Number(digits)) : '';
    input.value = text;

    let position = 0;
    for (let seen = 0; position < text.length && seen < digitsBeforeCaret; position++) {
      if (/\d/.test(text[position])) seen++;
    }
    input.setSelectionRange(position, position);
  }

  selectMode(mode: Mode): void {
    this.mode.set(mode);
    this.analyticsService.trackOption('calculator_mode', mode);
  }

  useLatestPrices(): void {
    this.analyticsService.trackEvent('use_latest_prices');
    if (this.mode() === 'flip') {
      this.buyAt.set(this.latestPrices()?.low ?? 0);
      this.sellAt.set(this.latestPrices()?.high ?? 0);
    } else {
      this.alchBuyAt.set(this.latestPrices()?.high ?? 0);
      this.natureRuneAt.set(this.natureRunePrice());
    }
  }
}
