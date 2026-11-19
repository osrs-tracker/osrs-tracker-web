import { Route } from '@angular/router';
import { PRICE_WORLD, PriceWorld, priceTrackerPath } from '@app/common/api/price-world';
import { PageMeta } from '@app/common/seo/page-meta-strategy';
import { faqPage } from '@app/common/seo/structured-data';
import { itemDetailResolver } from './item-detail/item-detail-resolver';
import { itemDetailMeta } from './item-detail/item-detail-meta';
import { itemTradedResolver } from './item-detail/item-traded-resolver';
import { browseItemsResolver } from './browse/browse-items-resolver';
import { browseMeta } from './browse/browse-meta';
import { HARDCORE_FAQ } from './hardcore-faq';
import { priceBreadcrumbs } from './price-breadcrumbs';
import { TableKind } from './tables/price-table';

/**
 * The price tracker's pages for one world. Hardcore Worlds have their own Grand Exchange, so the same pages are
 * mounted again under `hardcore`, each with its own title, description and canonical (they aren't duplicates).
 */
export const priceTrackerRoutes = (world: PriceWorld): Route[] => {
  const hardcore = world === 'hardcore';
  const path = priceTrackerPath(world);

  return [
    {
      title: hardcore
        ? 'OSRS Hardcore Worlds GE Prices: Live Grand Exchange prices'
        : 'OSRS Price Tracker: Live Grand Exchange prices',
      path: '',
      pathMatch: 'full',
      data: {
        meta: {
          description: hardcore
            ? 'Check live OSRS Hardcore Worlds prices for every Grand Exchange item: buy and sell prices, margins, buy limits, alch values and price history. Hardcore Worlds have their own Grand Exchange.'
            : 'Check live OSRS prices for every Grand Exchange item: buy and sell prices, margins, buy limits, alch values and price history, all in the OSRS Price Tracker.',
          canonicalPath: path,
          jsonLd: [priceBreadcrumbs(world), ...(hardcore ? [faqPage(HARDCORE_FAQ)] : [])],
        } satisfies PageMeta,
      },
      loadComponent: () => import('./price-tracker'),
    },
    // Before `:id`, which matches these too
    {
      title: hardcore ? 'OSRS Hardcore Worlds High Alch Profit' : 'OSRS High Alch Profit: Every item at live GE prices',
      path: 'high-alch',
      pathMatch: 'full',
      data: {
        kind: 'high-alch' satisfies TableKind,
        meta: {
          description: hardcore
            ? 'The high-alch profit of every item on the OSRS Hardcore Worlds Grand Exchange at live prices: alch value minus the buy price and a nature rune, with buy limits, profit per limit and daily volume.'
            : 'The high-alch profit of every OSRS item at live Grand Exchange prices: alch value minus the buy price and a nature rune, with buy limits, profit per limit and daily volume.',
          canonicalPath: `${path}/high-alch`,
          jsonLd: [priceBreadcrumbs(world, { name: 'High-alch profit', path: `${path}/high-alch` })],
        } satisfies PageMeta,
      },
      loadComponent: () => import('./tables/price-table-page'),
    },
    {
      title: hardcore
        ? 'OSRS Hardcore Worlds GE Margins: Flips after tax'
        : 'OSRS GE Margins: Flips after tax, per buy limit',
      path: 'margins',
      pathMatch: 'full',
      data: {
        kind: 'margins' satisfies TableKind,
        meta: {
          description: hardcore
            ? 'Grand Exchange margins for every OSRS Hardcore Worlds item at live prices: the spread between the instant-sell and instant-buy price after the GE tax, per buy limit, with daily volume.'
            : 'Grand Exchange margins for every OSRS item at live prices: the spread between the instant-sell and instant-buy price after the 2% GE tax, per buy limit, with daily volume.',
          canonicalPath: `${path}/margins`,
          jsonLd: [priceBreadcrumbs(world, { name: 'Margins', path: `${path}/margins` })],
        } satisfies PageMeta,
      },
      loadComponent: () => import('./tables/price-table-page'),
    },
    {
      title: hardcore
        ? 'New on the Hardcore Worlds GE'
        : 'New OSRS Items: The latest Grand Exchange additions and prices',
      path: 'new',
      pathMatch: 'full',
      data: {
        meta: {
          description: hardcore
            ? 'The newest items on the OSRS Hardcore Worlds Grand Exchange, under the day the game update added them, with their live instant-buy price and daily volume.'
            : 'The newest items on the OSRS Grand Exchange, under the day the game update added them, with their live instant-buy price and daily volume.',
          canonicalPath: `${path}/new`,
          jsonLd: [priceBreadcrumbs(world, { name: 'New on the GE', path: `${path}/new` })],
        } satisfies PageMeta,
      },
      loadComponent: () => import('./new-items/new-items-page'),
    },
    // The server answers this path with a 301 first (`server/routers/redirects.ts`); this covers client-side navigation
    { path: 'browse', pathMatch: 'full', redirectTo: 'browse/a' },
    {
      // The meta's title, or this one when there's no meta
      title: 'Letter not found - OSRS Tracker',
      path: 'browse/:letter',
      pathMatch: 'full',
      data: { meta: browseMeta(world) },
      loadComponent: () => import('./browse/browse-items'),
      resolve: { items: browseItemsResolver },
    },
    // Before `:id`, which would match `hardcore`. Not inside the Hardcore Worlds routes themselves.
    ...(hardcore
      ? []
      : [
          {
            path: 'hardcore',
            providers: [{ provide: PRICE_WORLD, useValue: 'hardcore' satisfies PriceWorld }],
            children: priceTrackerRoutes('hardcore'),
          },
        ]),
    {
      // The meta's title, or this one when there's no meta
      title: 'Item not found - OSRS Tracker',
      path: ':id',
      pathMatch: 'full',
      data: { meta: itemDetailMeta(world) },
      loadComponent: () => import('./item-detail/item-detail'),
      // Main's items all have a price; Hardcore Worlds list ones nobody has traded there yet
      resolve: { item: itemDetailResolver, ...(hardcore && { traded: itemTradedResolver }) },
    },
  ];
};

export default priceTrackerRoutes('main');
