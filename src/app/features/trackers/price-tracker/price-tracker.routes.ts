import { Route } from '@angular/router';
import { PageMeta, RouteMeta } from '@app/common/seo/page-meta-strategy';
import { breadcrumbList } from '@app/common/seo/structured-data';
import { itemDetailResolver } from './item-detail/item-detail-resolver';
import { itemDetailMeta } from './item-detail/item-detail-meta';
import { browseItemsResolver } from './browse/browse-items-resolver';
import { browseMeta } from './browse/browse-meta';
import { TableKind } from './tables/price-table';

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
  // Before `:id`, which matches these too
  {
    title: 'OSRS High Alch Profit: Every item at live GE prices',
    path: 'high-alch',
    pathMatch: 'full',
    data: {
      kind: 'high-alch' satisfies TableKind,
      meta: {
        description:
          'The high-alch profit of every OSRS item at live Grand Exchange prices: alch value minus the buy price and a nature rune, with buy limits, profit per limit and daily volume.',
        canonicalPath: '/trackers/price/high-alch',
        jsonLd: [
          breadcrumbList([
            { name: 'Price Tracker', path: '/trackers/price' },
            { name: 'High-alch profit', path: '/trackers/price/high-alch' },
          ]),
        ],
      } satisfies PageMeta,
    },
    loadComponent: () => import('./tables/price-table-page'),
  },
  {
    title: 'OSRS GE Margins: Flips after tax, per buy limit',
    path: 'margins',
    pathMatch: 'full',
    data: {
      kind: 'margins' satisfies TableKind,
      meta: {
        description:
          'Grand Exchange margins for every OSRS item at live prices: the spread between the instant-sell and instant-buy price after the 2% GE tax, per buy limit, with daily volume.',
        canonicalPath: '/trackers/price/margins',
        jsonLd: [
          breadcrumbList([
            { name: 'Price Tracker', path: '/trackers/price' },
            { name: 'Margins', path: '/trackers/price/margins' },
          ]),
        ],
      } satisfies PageMeta,
    },
    loadComponent: () => import('./tables/price-table-page'),
  },
  // The server answers this path with a 301 first (`server/routers/redirects.ts`); this covers client-side navigation
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
