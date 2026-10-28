import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { CapitalizePipe } from '@app/common/format/capitalize-pipe';
import { TopGainer } from '@app/common/api/osrs-tracker-repo';
import { AccountTile } from './account-tile';

/** Everything comes with the list, so unlike `player-row` it renders on the server. */
@Component({
  selector: 'a[top-gainer-row]',
  template: `
    <!-- The list is an <ol>, which gives screen readers the rank: the tile's label names only the account type -->
    <account-tile [account]="gainer()" [rank]="rank()" />
    <span class="flex-1 min-w-0 truncate text-lg/5 max-sm:text-base/5 font-bold text-strong">{{
      gainer().username | capitalizeWords
    }}</span>
    <span class="shrink-0 font-bold text-strong tabular-nums">+{{ gainer().gain | number }} XP</span>
  `,
  host: {
    class:
      'flex items-center gap-3 px-card py-3 border-b border-row bg-card hover:bg-row focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
  },
  imports: [AccountTile, CapitalizePipe, DecimalPipe],
})
export class TopGainerRow {
  readonly gainer = input.required<TopGainer>();
  readonly rank = input.required<number>();
}
