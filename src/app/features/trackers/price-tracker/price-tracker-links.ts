import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** The Price Tracker's lists, as pills under an item search: on Home and in the Price Tracker's hero */
@Component({
  selector: 'div[price-tracker-links]',
  template: `
    <a class="button--default button--rounded link-pill" routerLink="/trackers/price/browse/a">Items A–Z</a>
    <a class="button--default button--rounded link-pill" routerLink="/trackers/price/high-alch">High-alch profit</a>
    <a class="button--default button--rounded link-pill" routerLink="/trackers/price/margins">Margins</a>
    <a class="button--default button--rounded link-pill" routerLink="/trackers/price/new">New on the GE</a>
  `,
  host: { class: 'flex flex-wrap gap-2 -mt-2' },
  imports: [RouterLink],
})
export class PriceTrackerLinks {}
