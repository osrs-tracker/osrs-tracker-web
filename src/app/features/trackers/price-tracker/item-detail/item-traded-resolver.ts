import { isPlatformServer } from '@angular/common';
import { PLATFORM_ID, TransferState, inject, makeStateKey } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, map, of, tap } from 'rxjs';
import { OsrsPricesRepo } from '@app/common/api/osrs-prices-repo';
import { PRICE_WORLD, worldKey } from '@app/common/api/price-world';

/**
 * Whether the item has traded at all in the world's `/latest`, which keeps an item's last trade however old: for the
 * page's `noindex` rule (`itemDetailMeta`). A buy-only item counts, though its price tile shows a dash. A failed load
 * counts as traded: a Wiki outage shouldn't drop pages from search.
 *
 * Only the server loads the list. It hands its answer to the browser, so hydration keeps the robots tag the server
 * rendered: a crawler that runs the page's scripts must read the same rule as one that doesn't. Without that answer (an
 * in-app navigation) the browser resolves at once instead of blocking on the whole list, as only crawlers read the
 * rule. The key holds the item id, so another item never takes this one's answer. It stays after hydration: a later
 * visit to the same item then keeps the rule the server sent instead of turning indexable.
 */
export const itemTradedResolver: ResolveFn<boolean> = (route: ActivatedRouteSnapshot) => {
  const id = Number(route.params['id']);
  const world = inject(PRICE_WORLD);
  const transferState = inject(TransferState);
  const key = makeStateKey<boolean>(worldKey(world, `item-traded-${id}`));

  if (!isPlatformServer(inject(PLATFORM_ID))) return of(transferState.get(key, true));

  return inject(OsrsPricesRepo)
    .getLatestPrices(id, world)
    .pipe(
      map(({ high, low }) => !!(high || low)),
      catchError(() => of(true)),
      tap(traded => transferState.set(key, traded)),
    );
};
