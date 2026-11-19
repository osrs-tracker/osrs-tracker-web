import { PriceWorld, priceTrackerPath } from '@app/common/api/price-world';
import { JsonLdNode } from '@app/common/seo/page-meta-strategy';
import { breadcrumbList } from '@app/common/seo/structured-data';

/** Price Tracker, then Hardcore Worlds on its pages, then the page's own crumbs (none on the landing page itself). */
export function priceBreadcrumbs(world: PriceWorld, ...crumbs: { name: string; path: string }[]): JsonLdNode {
  return breadcrumbList([
    { name: 'Price Tracker', path: priceTrackerPath('main') },
    ...(world === 'hardcore' ? [{ name: 'Hardcore Worlds', path: priceTrackerPath(world) }] : []),
    ...crumbs,
  ]);
}
