import { Route } from '@angular/router';
import { PageMeta } from '@app/common/seo/page-meta-strategy';
import { itemDetailResolver } from './item-detail/item-detail-resolver';
import { itemDetailMetaResolver, itemDetailTitleResolver } from './item-detail/item-detail-meta';
import { browseItemsResolver } from './browse/browse-items-resolver';
import { browseMetaResolver, browseTitleResolver } from './browse/browse-meta';

export default [
  {
    title: 'OSRS Price Tracker: live Grand Exchange prices',
    path: '',
    pathMatch: 'full',
    data: {
      meta: {
        description:
          'Check live OSRS prices for every Grand Exchange item: buy and sell prices, margins, buy limits, alch values and price history, all in the OSRS Price Tracker.',
        canonicalPath: '/trackers/price',
      } satisfies PageMeta,
    },
    loadComponent: () => import('./price-tracker'),
  },
  // Before `:id`, which matches `browse` too
  { path: 'browse', pathMatch: 'full', redirectTo: 'browse/a' },
  {
    title: browseTitleResolver,
    path: 'browse/:letter',
    pathMatch: 'full',
    loadComponent: () => import('./browse/browse-items'),
    resolve: { items: browseItemsResolver, meta: browseMetaResolver },
  },
  {
    title: itemDetailTitleResolver,
    path: ':id',
    pathMatch: 'full',
    loadComponent: () => import('./item-detail/item-detail'),
    resolve: { item: itemDetailResolver, meta: itemDetailMetaResolver },
  },
] as Route[];
