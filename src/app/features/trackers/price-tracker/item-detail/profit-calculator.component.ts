import {
  Component,
  InputSignal,
  ResourceRef,
  Signal,
  WritableSignal,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Item } from '@osrs-tracker/models';
import { LoadErrorComponent } from 'src/app/common/components/general/load-error.component';
import { SegmentedComponent, SegmentedOption } from 'src/app/common/components/general/segmented.component';
import { SkeletonComponent } from 'src/app/common/components/general/skeleton.component';
import { InfoTooltipComponent } from 'src/app/common/components/general/tooltip/info-tooltip.component';
import { LatestPrices, OsrsPricesRepo } from 'src/app/common/repositories/osrs-prices.repo';
import { breakEvenSellPrice, geTax, isGeTaxExempt } from './ge-tax';
import { formatWhole } from './item-prices';

type Mode = 'flip' | 'alch';

const NATURE_RUNE_ID = 561;
const HIGH_ALCH_XP = 65;
/** Prices can pass 2,147,483,647 (platinum tokens), but stay well within whole-number precision */
const MAX_DIGITS = 15;

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

/**
 * Profit of flipping the item (buy at one price, sell at another, minus GE tax) or of high alching it (minus the item
 * and a nature rune), for a quantity. Prices start at the latest ones; "Use latest prices" resets them.
 */
@Component({
  selector: 'article[profit-calculator]',
  template: `
    <div class="flex flex-wrap items-center justify-between gap-2 min-h-14 px-5 py-1.5 border-b border-line">
      <h2 class="text-xl/6 font-bold text-strong">Profit calculator</h2>
      <segmented label="Calculation" [options]="modeOptions()" [(value)]="mode" />
    </div>

    @if (loading()) {
      <div class="flex flex-col gap-4 p-5" aria-busy="true">
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
      <div class="flex flex-col flex-1 gap-5 p-5">
        <div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            @for (field of fields(); track field.id) {
              <label class="flex flex-col gap-1.5 text-sm text-muted last:col-span-full sm:last:col-span-1">
                {{ field.label }}
                <input
                  type="text"
                  inputmode="numeric"
                  autocomplete="off"
                  class="h-11 min-w-0 px-3.5 rounded-xl border border-line bg-inner text-base font-bold text-strong tabular-nums focus:border-accent focus:ring-0"
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
              [disabled]="error()"
              (click)="useLatestPrices()"
            >
              <svg
                class="size-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M21 12a9 9 0 1 1-2.6-6.4" />
                <path d="M21 3v6h-6" />
              </svg>
              Use latest prices
            </button>
            <p class="flex items-center gap-1 text-sm text-muted">
              @if (error()) {
                Couldn't load the latest prices.
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
                  <info-tooltip>{{ row.info }}</info-tooltip>
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

        <div
          class="mt-auto flex flex-col gap-1 px-4.5 py-4 rounded-xl border"
          [class]="profit().total >= 0 ? 'bg-up/12 border-up/35' : 'bg-down/12 border-down/35'"
          aria-live="polite"
        >
          <span class="text-sm text-text">{{ mode() === 'flip' ? 'Total profit' : 'Total alch profit' }}</span>
          <span class="flex items-baseline gap-1.5">
            <span
              class="text-4xl/10 font-bold tabular-nums break-all"
              [class]="profit().total >= 0 ? 'text-up' : 'text-down'"
              >{{ format(profit().total, true) }}</span
            >
            <span class="font-bold text-muted">gp</span>
          </span>
          <span class="text-sm text-muted">{{ profit().sub }}</span>
        </div>
      </div>
    }
  `,
  host: { class: 'flex flex-col rounded-2xl bg-card overflow-hidden' },
  imports: [InfoTooltipComponent, LoadErrorComponent, SegmentedComponent, SkeletonComponent],
})
export class ProfitCalculatorComponent {
  private readonly osrsPricesRepo = inject(OsrsPricesRepo);

  readonly item: InputSignal<Item> = input.required();
  readonly latestPrices: InputSignal<LatestPrices | undefined> = input<LatestPrices | undefined>();
  readonly loading: InputSignal<boolean> = input(false);
  readonly error: InputSignal<boolean> = input(false);

  readonly natureRune: ResourceRef<LatestPrices | undefined> = rxResource({
    stream: () => this.osrsPricesRepo.getLatestPrices(NATURE_RUNE_ID, { fetchSingle: true }),
  });

  readonly mode: WritableSignal<Mode> = signal('flip');
  readonly modeOptions: Signal<SegmentedOption<Mode>[]> = computed(() => [
    { value: 'flip', label: 'Flip' },
    {
      value: 'alch',
      label: 'High alch',
      disabled: !this.highAlch(),
      title: this.highAlch() ? undefined : "This item can't be alched for coins.",
    },
  ]);

  private readonly highAlch: Signal<number> = computed(() => this.item().highalch ?? 0);
  private readonly defaultQuantity: Signal<number> = computed(() => this.item().limit || 1);
  private readonly natureRunePrice: Signal<number> = computed(() =>
    this.natureRune.hasValue() ? (this.natureRune.value()?.high ?? 0) : 0,
  );

  // Flips buy at the instant sell price and sell at the instant buy price; alching buys at the instant buy price
  readonly buyAt: WritableSignal<number> = linkedSignal(() => this.latestPrices()?.low ?? 0);
  readonly sellAt: WritableSignal<number> = linkedSignal(() => this.latestPrices()?.high ?? 0);
  readonly flipQuantity: WritableSignal<number> = linkedSignal(() => this.defaultQuantity());
  readonly alchBuyAt: WritableSignal<number> = linkedSignal(() => this.latestPrices()?.high ?? 0);
  readonly natureRuneAt: WritableSignal<number> = linkedSignal(() => this.natureRunePrice());
  readonly alchQuantity: WritableSignal<number> = linkedSignal(() => this.defaultQuantity());

  readonly fields: Signal<Field[]> = computed(() =>
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

  private readonly taxPerItem: Signal<number> = computed(() => geTax(this.item().id, this.sellAt()));

  readonly rows: Signal<ResultRow[]> = computed(() => {
    if (this.mode() === 'alch') {
      return [
        { label: 'High alch value', value: formatWhole(this.highAlch()) },
        { label: 'Cost per cast', value: formatWhole(-(this.alchBuyAt() + this.natureRuneAt())), tone: 'down' },
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
        // a true minus, as in the other numbers
        value: buy ? `${((perItem / buy) * 100).toFixed(2).replace('-', '−')}%` : '–',
      },
      {
        label: 'Break-even sell price',
        value: formatWhole(breakEvenSellPrice(id, buy)),
        info: 'The lowest sell price that gets the buy price back after tax.',
      },
    ];
  });

  readonly profit: Signal<{ perItem: number; total: number; sub: string }> = computed(() => {
    const flip = this.mode() === 'flip';
    const perItem = flip
      ? this.sellAt() - this.buyAt() - this.taxPerItem()
      : this.highAlch() - this.alchBuyAt() - this.natureRuneAt();
    const quantity = flip ? this.flipQuantity() : this.alchQuantity();

    return {
      perItem,
      total: perItem * quantity,
      sub: quantity
        ? `${formatWhole(quantity)} × ${formatWhole(perItem, true)} gp ${flip ? 'after tax' : 'per cast'}`
        : 'Enter a quantity',
    };
  });

  readonly note: Signal<string> = computed(() => {
    const limit = this.item().limit ? `Buy limit ${formatWhole(this.item().limit)} per 4 hours.` : '';
    return this.mode() === 'flip' ? limit : `1 nature rune and ${HIGH_ALCH_XP} Magic XP per cast. ${limit}`.trim();
  });

  format(value: number, signed = false): string {
    return formatWhole(value, signed);
  }

  /** Keeps only the digits and shows them with thousands separators, leaving the caret after the same digit. */
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

  useLatestPrices(): void {
    if (this.mode() === 'flip') {
      this.buyAt.set(this.latestPrices()?.low ?? 0);
      this.sellAt.set(this.latestPrices()?.high ?? 0);
    } else {
      this.alchBuyAt.set(this.latestPrices()?.high ?? 0);
      this.natureRuneAt.set(this.natureRunePrice());
    }
  }
}
