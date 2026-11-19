import { isPlatformServer } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { OsrsPricesRepo } from '@app/common/api/osrs-prices-repo';
import { PRICE_WORLD } from '@app/common/api/price-world';

/**
 * Whether the item has traded at all in the world's `/latest`, which keeps an item's last trade however old: for the
 * page's `noindex` rule (`itemDetailMeta`). A buy-only item counts, though its price tile shows a dash. Only crawlers read that rule,
 * so the browser resolves at once instead of blocking in-app navigation on the whole list; the page loads the same list
 * itself. On the server the list is kept for every render and handed on to the browser, so hydration asks for nothing
 * more. A failed load counts as traded: a Wiki outage shouldn't drop pages from search.
 */
export const itemTradedResolver: ResolveFn<boolean> = (route: ActivatedRouteSnapshot) =>
  isPlatformServer(inject(PLATFORM_ID))
    ? inject(OsrsPricesRepo)
        .getLatestPrices(Number(route.params['id']), inject(PRICE_WORLD))
        .pipe(
          map(({ high, low }) => !!(high || low)),
          catchError(() => of(true)),
        )
    : of(true);
