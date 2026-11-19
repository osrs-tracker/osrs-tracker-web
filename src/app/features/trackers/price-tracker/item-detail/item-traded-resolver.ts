import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { OsrsPricesRepo } from '@app/common/api/osrs-prices-repo';
import { PRICE_WORLD } from '@app/common/api/price-world';

/**
 * Whether the item has a trade in the world's `/latest`, which keeps an item's last trade however old: for the page's
 * `noindex` rule (`itemDetailMeta`). The page loads the same list, which the server keeps for every render and hands the
 * item on to the browser, so hydration asks for nothing more. A failed load counts as traded: a Wiki outage shouldn't drop pages from search.
 */
export const itemTradedResolver: ResolveFn<boolean> = (route: ActivatedRouteSnapshot) =>
  inject(OsrsPricesRepo)
    .getLatestPrices(Number(route.params['id']), inject(PRICE_WORLD))
    .pipe(
      map(({ high, low }) => !!(high || low)),
      catchError(() => of(true)),
    );
