import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { catchError, map, of } from 'rxjs';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { PageMeta } from '@app/common/seo/page-meta-strategy';
import { formatWhole } from './item-prices';

const MAX_DESCRIPTION_LENGTH = 160;

// Both resolvers ask for the item like `itemDetailResolver`; the shared-request interceptor makes it one request.
// They fall back instead of using `resolverErrorHandler`: `itemDetailResolver` already shows the error page.

export const itemDetailTitleResolver: ResolveFn<string> = (route: ActivatedRouteSnapshot) =>
  inject(OsrsTrackerRepo)
    .getItemInfo(route.params['id'], { loadingIndicator: true })
    .pipe(
      map(itemTitle),
      catchError((err: unknown) =>
        of(isNotFound(err) ? 'Item not found - OSRS Tracker' : 'OSRS Price Tracker - OSRS Tracker'),
      ),
    );

/** No meta for an unknown item or a failed load: the page is a 404 or the error page, neither has a canonical. */
export const itemDetailMetaResolver: ResolveFn<PageMeta | undefined> = (route: ActivatedRouteSnapshot) =>
  inject(OsrsTrackerRepo)
    .getItemInfo(route.params['id'], { loadingIndicator: true })
    .pipe(
      map(itemPageMeta),
      catchError(() => of(undefined)),
    );

/** "Abyssal whip price - OSRS Grand Exchange - OSRS Tracker": the words people search for come first */
export function itemTitle(item: Item): string {
  return `${item.name} price - OSRS Grand Exchange - OSRS Tracker`;
}

/**
 * From the item alone, so it doesn't depend on the Wiki's prices, and without a live price: search engines show a
 * snippet for days. The image is the site's default, as the Wiki's icons are below the 144px a `summary` card needs.
 */
export function itemPageMeta(item: Item): PageMeta {
  return {
    description: itemDescription(item),
    canonicalPath: `/trackers/price/${item.id}`,
    card: 'summary',
  };
}

/**
 * "Abyssal whip (members) Grand Exchange price: live instant buy and sell prices, margin after tax, buy limit 70 and
 * high alch 72,000 gp." Leaves out what the item lacks, and the details that don't fit 160 characters, last first.
 */
export function itemDescription(item: Item): string {
  const parts = [
    'live instant buy and sell prices',
    'margin after tax',
    item.limit ? `buy limit ${formatWhole(item.limit)}` : '',
    item.highalch ? `high alch ${formatWhole(item.highalch)} gp` : '',
  ].filter(Boolean);
  const describe = (shown: string[]) =>
    `${item.name} (${item.members ? 'members' : 'free to play'}) Grand Exchange price: ` +
    `${shown.slice(0, -1).join(', ')} and ${shown.at(-1)}.`;

  while (parts.length > 2 && describe(parts).length > MAX_DESCRIPTION_LENGTH) parts.pop();
  return describe(parts);
}

function isNotFound(err: unknown): boolean {
  return err instanceof HttpErrorResponse && [400, 404].includes(err.status);
}
