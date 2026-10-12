import { ActivatedRouteSnapshot } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { wikiIconUrl } from '@app/common/icon/icon';
import { PageImage, PageMeta } from '@app/common/seo/page-meta-strategy';
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
 * snippet for days. The image is the item's preview card, which the server draws (`src/server/routers/og-images.ts`).
 * The structured data describes the item as a `Thing`, never a `Product` or `Offer`: nothing is sold here.
 */
export function itemPageMeta(item: Item): PageMeta {
  const canonicalPath = `/trackers/price/${item.id}`;
  const description = itemDescription(item);
  return {
    title: itemTitle(item),
    description,
    canonicalPath,
    image: itemImage(item),
    card: 'summary_large_image',
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
 * The item's link preview card: its icon, name and static facts, never a price, as chat apps keep a preview for weeks.
 * `?v=` busts the caches of shared links when the card's design changes.
 */
function itemImage(item: Item): PageImage {
  return { url: `/og/item/${item.id}.png?v=2`, width: 1200, height: 630, alt: item.name };
}

/**
 * "Track Abyssal whip prices with OSRS Tracker: updated live, with charts of how they've moved over time · Buy limit 70
 * · High alch 72,000 gp". Search results show no line breaks, so a `·` separates the facts. Leaves out what the item
 * lacks, and the facts that don't fit 160 characters, last first.
 * Not whether it's members only: nearly every visitor is a member or doesn't care.
 */
export function itemDescription(item: Item): string {
  const facts = [
    item.limit ? `Buy limit ${formatWhole(item.limit)}` : '',
    item.highalch ? `High alch ${formatWhole(item.highalch)} gp` : '',
  ].filter(Boolean);
  const describe = (shown: string[]) =>
    [
      `Track ${item.name} prices with OSRS Tracker: updated live, with charts of how they've moved over time`,
      ...shown,
    ].join(' · ');

  while (facts.length && describe(facts).length > MAX_DESCRIPTION_LENGTH) facts.pop();
  return describe(facts);
}
