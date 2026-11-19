import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlayerType } from '@osrs-tracker/models';
import { Icon } from '@app/common/icon/icon';
import { PriceWorld, priceTrackerPath } from '@app/common/api/price-world';

/**
 * Main | Hardcore Worlds in the search box, styled as the slate `segmented` beside Home's search. Links to the other
 * world's landing instead of radios: each world is its own page with its own address, and the visitor's search comes
 * along.
 */
@Component({
  selector: 'nav[world-switch]',
  template: `
    @for (option of options; track option.world) {
      <a
        class="flex items-center justify-center gap-1.5 h-10 px-3.5 max-sm:flex-1 rounded-xl text-base font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent"
        [class]="option.world === current() ? 'bg-line text-strong' : 'text-muted hover:text-strong'"
        [routerLink]="option.path"
        [queryParams]="query() ? { q: query() } : null"
        [attr.aria-current]="option.world === current() ? 'page' : null"
      >
        <img class="h-4 w-auto" icon alt="" [name]="option.icon" />
        {{ option.label }}
      </a>
    }
  `,
  host: { 'class': 'flex gap-1 p-1 rounded-2xl bg-ground w-fit max-w-full', 'aria-label': 'Prices for' },
  imports: [RouterLink, Icon],
})
export class WorldSwitch {
  /** The world of the page the switch is on */
  readonly current = input.required<PriceWorld>();
  /** The search so far, so the other world's landing opens with it */
  readonly query = input('');

  readonly options: { world: PriceWorld; label: string; icon: string; path: string }[] = [
    { world: 'main', label: 'Main', icon: 'coin stack', path: priceTrackerPath('main') },
    { world: 'hardcore', label: 'Hardcore Worlds', icon: PlayerType.HardcoreMain, path: priceTrackerPath('hardcore') },
  ];
}
