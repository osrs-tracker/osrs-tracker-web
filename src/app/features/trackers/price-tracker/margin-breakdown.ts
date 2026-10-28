import { Component, input } from '@angular/core';
import { formatWhole } from '@app/common/format/number-format';

/** How a flip's margin adds up, in the margins table's tooltip and the item page's margin tile */
@Component({
  selector: 'margin-breakdown',
  template: `
    <span class="flex justify-between gap-6"
      ><span>Buy at</span><span>−{{ formatWhole(buy()) }}</span></span
    >
    <span class="flex justify-between gap-6"
      ><span>Sell at</span><span>+{{ formatWhole(sell()) }}</span></span
    >
    <span class="flex justify-between gap-6"
      ><span>GE tax</span><span>{{ exempt() ? 'None' : '−' + formatWhole(tax()) }}</span></span
    >
    <span class="flex justify-between gap-6 mt-2 pt-2 border-t border-line font-bold text-strong"
      ><span>Margin</span><span>{{ formatWhole(margin(), true) }}</span></span
    >
  `,
  host: { class: 'flex flex-col min-w-48 tabular-nums' },
})
export class MarginBreakdown {
  readonly buy = input.required<number>();
  readonly sell = input.required<number>();
  readonly tax = input.required<number>();
  readonly exempt = input(false);
  readonly margin = input.required<number>();

  protected readonly formatWhole = formatWhole;
}
