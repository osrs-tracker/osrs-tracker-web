import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { catchError, map, of } from 'rxjs';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { wikiIconUrl } from '@app/common/icon/icon';
import { ICON_IMAGE, PageMeta } from '@app/common/seo/page-meta-strategy';
import { breadcrumbList, webPage } from '@app/common/seo/structured-data';
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

/**
 * "Abyssal whip - OSRS Grand Exchange price": the words people search for, without the site name, which search results
 * and link previews show on their own (as the landing pages' titles do)
 */
export function itemTitle(item: Item): string {
  return `${item.name} - OSRS Grand Exchange price`;
}

/**
 * From the item alone, so it doesn't depend on the Wiki's prices, and without a live price: search engines show a
 * snippet for days. The image is the app icon, as the Wiki's icons are below the 144px a `summary` card needs.
 * The structured data describes the item as a `Thing`, never a `Product` or `Offer`: nothing is sold here.
 */
export function itemPageMeta(item: Item): PageMeta {
  const canonicalPath = `/trackers/price/${item.id}`;
  const description = itemDescription(item);
  return {
    description,
    canonicalPath,
    image: ICON_IMAGE,
    card: 'summary',
    jsonLd: [
      breadcrumbList([
        { name: 'Price Tracker', path: '/trackers/price' },
        { name: item.name, path: canonicalPath },
      ]),
      webPage({
        path: canonicalPath,
        title: itemTitle(item),
        description,
        about: { '@type': 'Thing', 'name': item.name, 'description': item.examine, 'image': wikiIconUrl(item.icon) },
      }),
    ],
  };
}

/**
 * "Live OSRS Grand Exchange prices for Abyssal whip: instant buy and sell, margin after tax, price history. Members
 * item, buy limit 70, high alch 72,000 gp." Leaves out what the item lacks, and the facts that don't fit 160
 * characters, last first.
 */
export function itemDescription(item: Item): string {
  const facts = [
    item.members ? 'Members item' : 'Free-to-play item',
    item.limit ? `buy limit ${formatWhole(item.limit)}` : '',
    item.highalch ? `high alch ${formatWhole(item.highalch)} gp` : '',
  ].filter(Boolean);
  const describe = (shown: string[]) =>
    `Live OSRS Grand Exchange prices for ${item.name}: instant buy and sell, margin after tax, price history. ` +
    `${shown.join(', ')}.`;

  while (facts.length > 1 && describe(facts).length > MAX_DESCRIPTION_LENGTH) facts.pop();
  return describe(facts);
}

function isNotFound(err: unknown): boolean {
  return err instanceof HttpErrorResponse && [400, 404].includes(err.status);
}
