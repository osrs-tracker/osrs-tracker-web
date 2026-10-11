import { ActivatedRouteSnapshot } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { wikiIconUrl } from '@app/common/icon/icon';
import { ICON_IMAGE, PageMeta } from '@app/common/seo/page-meta-strategy';
import { breadcrumbList, webPage } from '@app/common/seo/structured-data';
import { formatWhole } from './item-prices';

const MAX_DESCRIPTION_LENGTH = 160;

/**
 * The item page's meta, from the item `itemDetailResolver` resolved. None for an unknown item (`null`): the page shows
 * its not-found state, titled by the route, without a canonical. Other failures show the error page.
 */
export function itemDetailMeta(route: ActivatedRouteSnapshot): PageMeta | undefined {
  const item: Item | null = route.data['item'];
  return item ? itemPageMeta(item) : undefined;
}

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
    title: itemTitle(item),
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
 * "Track Abyssal whip prices with OSRS Tracker: updated live, with charts of how they've moved over time. Buy limit 70,
 * high alch 72,000 gp." Leaves out what the item lacks, and the facts that don't fit 160 characters, last first.
 * Not whether it's members only: nearly every visitor is a member or doesn't care.
 */
export function itemDescription(item: Item): string {
  const facts = [
    item.limit ? `buy limit ${formatWhole(item.limit)}` : '',
    item.highalch ? `high alch ${formatWhole(item.highalch)} gp` : '',
  ].filter(Boolean);
  const describe = (shown: string[]) =>
    `Track ${item.name} prices with OSRS Tracker: updated live, with charts of how they've moved over time.` +
    (shown.length ? ` ${capitalize(shown.join(', '))}.` : '');

  while (facts.length && describe(facts).length > MAX_DESCRIPTION_LENGTH) facts.pop();
  return describe(facts);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
