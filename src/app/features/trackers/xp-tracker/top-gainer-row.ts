import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { CapitalizePipe } from '@app/common/format/capitalize-pipe';
import { TopGainer } from '@app/common/api/osrs-tracker-repo';

/** Everything comes with the list, so unlike `player-row` it renders on the server. */
@Component({
  selector: 'a[top-gainer-row]',
  template: `
    <!-- The list is an <ol>, which gives screen readers the rank -->
    <span
      class="flex items-center justify-center size-10 max-sm:size-8 shrink-0 rounded-xl border border-line bg-deep text-base/5 max-sm:text-sm font-bold text-strong tabular-nums"
      aria-hidden="true"
      >{{ rank() }}</span
    >
    <span class="flex-1 min-w-0 truncate text-lg/5 max-sm:text-base/5 font-bold text-strong">{{
      gainer().username | capitalizeWords
    }}</span>
    <span class="shrink-0 font-bold text-strong tabular-nums">+{{ gainer().gain | number }} XP</span>
  `,
  host: {
    class:
      'flex items-center gap-3.5 max-sm:gap-3 px-5 max-sm:px-4 py-3 max-sm:py-2.5 border-b border-row bg-card hover:bg-row focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
  },
  imports: [CapitalizePipe, DecimalPipe],
})
export class TopGainerRow {
  readonly gainer = input.required<TopGainer>();
  readonly rank = input.required<number>();
}
