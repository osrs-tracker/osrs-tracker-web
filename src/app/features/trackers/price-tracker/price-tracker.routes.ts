import { Route } from '@angular/router';
import { PageMeta } from '@app/common/seo/page-meta-strategy';
import { itemDetailResolver } from './item-detail/item-detail-resolver';
import { itemDetailTitleResolver } from './item-detail/item-detail-title-resolver';

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
  {
    title: itemDetailTitleResolver,
    path: ':id',
    pathMatch: 'full',
    loadComponent: () => import('./item-detail/item-detail'),
    resolve: { item: itemDetailResolver },
  },
] as Route[];
