import { Route } from '@angular/router';
import { PageMeta, RouteMeta } from '@app/common/seo/page-meta-strategy';
import { breadcrumbList } from '@app/common/seo/structured-data';
import { itemDetailResolver } from './item-detail/item-detail-resolver';
import { itemDetailMeta } from './item-detail/item-detail-meta';
import { browseItemsResolver } from './browse/browse-items-resolver';
import { browseMeta } from './browse/browse-meta';

export default [
  {
    title: 'OSRS Price Tracker: Live Grand Exchange prices',
    path: '',
    pathMatch: 'full',
    data: {
      meta: {
        description:
          'Check live OSRS prices for every Grand Exchange item: buy and sell prices, margins, buy limits, alch values and price history, all in the OSRS Price Tracker.',
        canonicalPath: '/trackers/price',
        jsonLd: [breadcrumbList([{ name: 'Price Tracker', path: '/trackers/price' }])],
      } satisfies PageMeta,
    },
    loadComponent: () => import('./price-tracker'),
  },
  // Before `:id`, which matches `browse` too
  { path: 'browse', pathMatch: 'full', redirectTo: 'browse/a' },
  {
    // The meta's title, or this one when there's no meta
    title: 'Letter not found - OSRS Tracker',
    path: 'browse/:letter',
    pathMatch: 'full',
    data: { meta: browseMeta satisfies RouteMeta },
    loadComponent: () => import('./browse/browse-items'),
    resolve: { items: browseItemsResolver },
  },
  {
    // The meta's title, or this one when there's no meta
    title: 'Item not found - OSRS Tracker',
    path: ':id',
    pathMatch: 'full',
    data: { meta: itemDetailMeta satisfies RouteMeta },
    loadComponent: () => import('./item-detail/item-detail'),
    resolve: { item: itemDetailResolver },
  },
] as Route[];
