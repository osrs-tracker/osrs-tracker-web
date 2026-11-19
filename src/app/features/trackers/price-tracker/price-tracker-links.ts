import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PRICE_WORLD, priceTrackerPath } from '@app/common/api/price-world';

@Component({
  selector: 'div[price-tracker-links]',
  template: `
    <a class="button--default button--rounded link-pill" [routerLink]="base + '/browse/a'">Items A–Z</a>
    <a class="button--default button--rounded link-pill" [routerLink]="base + '/high-alch'">High-alch profit</a>
    <a class="button--default button--rounded link-pill" [routerLink]="base + '/margins'">Margins</a>
    <a class="button--default button--rounded link-pill" [routerLink]="base + '/new'">New on the GE</a>
  `,
  host: { class: 'flex flex-wrap gap-2 -mt-2' },
  imports: [RouterLink],
})
export class PriceTrackerLinks {
  protected readonly base = priceTrackerPath(inject(PRICE_WORLD));
}
