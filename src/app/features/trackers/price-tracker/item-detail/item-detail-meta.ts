import { ActivatedRouteSnapshot } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { wikiIconUrl } from '@app/common/icon/icon';
import { PageImage, PageMeta } from '@app/common/seo/page-meta-strategy';
import { breadcrumbList, webPage } from '@app/common/seo/structured-data';
import { formatWhole } from '@app/common/format/number-format';

const MAX_DESCRIPTION_LENGTH = 160;

/** None for an unknown item (`null`): its not-found state is titled by the route, without a canonical. */
export function itemDetailMeta(route: ActivatedRouteSnapshot): PageMeta | undefined {
  const item: Item | null = route.data['item'];
  return item ? itemPageMeta(item) : undefined;
}

/**
 * The item's name first, as most searches name only the item. Without the site name, which search results and link
 * previews show on their own (as the landing pages' titles do).
 */
export function itemTitle(item: Item): string {
  const facts = ['price', item.highalch ? 'high alch' : '', item.limit ? 'buy limit' : ''].filter(Boolean);
  const listed = facts.length > 1 ? `${facts.slice(0, -1).join(', ')} and ${facts.at(-1)}` : facts[0];
  return `${item.name} - OSRS ${listed}`;
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
  return { url: `/og/item/${item.id}.png?v=7`, width: 1200, height: 630, alt: item.name };
}

/**
 * The examine text first, as most searches name only the item. Search results show no line breaks, so a `·` separates
 * the facts. Leaves out what the item lacks, and what doesn't fit 160 characters: the facts
 * last first, or the examine text if even that alone is too long. Not whether it's members only: nearly every visitor is
 * a member or doesn't care.
 */
export function itemDescription(item: Item): string {
  const facts = [
    item.limit ? `Buy limit ${formatWhole(item.limit)}` : '',
    item.highalch ? `High alch ${formatWhole(item.highalch)} gp` : '',
  ].filter(Boolean);
  const examine = /[.!?]$/.test(item.examine) ? item.examine : `${item.examine}.`;
  const describe = (start: string) => {
    const shown = [...facts];
    const join = () =>
      [start, [...shown, 'Live Grand Exchange prices and price history.'].join(' · ')].filter(Boolean).join(' ');
    while (shown.length && join().length > MAX_DESCRIPTION_LENGTH) shown.pop();
    return join();
  };

  const description = describe(examine);
  return description.length <= MAX_DESCRIPTION_LENGTH ? description : describe('');
}
