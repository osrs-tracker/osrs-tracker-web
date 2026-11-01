import { Component, computed, input } from '@angular/core';
import { formatNumberLegible, formatPercentChange, formatWhole } from '@app/common/format/number-format';
import { Icon } from '@app/common/icon/icon';
import { ChangePill } from '../change-pill';
import { PriceMover } from './price-movers';

/** Everything comes with the list, so unlike `item-row` it renders on the server. */
@Component({
  selector: 'a[price-mover-row]',
  template: `
    <span class="relative flex items-center justify-center size-10 shrink-0 rounded-xl bg-deep border border-line">
      <img class="max-w-7.5 max-h-7.5" icon alt="" [name]="mover().icon" [wiki]="true" />
      <span
        class="absolute -left-1.5 -top-1.5 flex items-center justify-center min-w-5 h-5 px-1 rounded-full border border-line bg-deep text-xs/none font-bold text-strong tabular-nums"
        >{{ rank() }}</span
      >
    </span>

    <!-- On phones only the new price shows, beside the change, so a row is one line -->
    <span class="flex flex-1 flex-col gap-1 min-w-0">
      <span class="truncate text-lg/5 max-sm:text-base/5 font-bold text-strong" [title]="mover().name">{{
        mover().name
      }}</span>
      <span class="max-sm:hidden truncate text-sm/4 text-muted tabular-nums" [title]="priceTitle()">
        {{ from() }} <span aria-hidden="true">→</span><span class="sr-only">to</span> {{ to() }} gp
      </span>
    </span>
    <span class="sm:hidden shrink-0 text-sm text-muted tabular-nums" [title]="priceTitle()">{{ to() }} gp</span>
    <span change-pill [change]="change()"></span>
  `,
  host: {
    class:
      'flex items-center gap-3 px-card py-3 border-b border-row bg-card hover:bg-row focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
  },
  imports: [ChangePill, Icon],
})
export class PriceMoverRow {
  readonly mover = input.required<PriceMover>();
  readonly rank = input.required<number>();

  // whole gp, as in the game: the averages have decimals
  readonly from = computed(() => formatNumberLegible(Math.round(this.mover().from)));
  readonly to = computed(() => formatNumberLegible(Math.round(this.mover().to)));
  readonly change = computed(() => formatPercentChange(this.mover().to, this.mover().from));
  readonly priceTitle = computed(
    () => `Average ${formatWhole(this.mover().from)} gp the day before, ${formatWhole(this.mover().to)} gp yesterday`,
  );
}
