import { ActivatedRouteSnapshot } from '@angular/router';
import { PriceWorld, priceTrackerPath } from '@app/common/api/price-world';
import { PageMeta, RouteMeta } from '@app/common/seo/page-meta-strategy';
import { priceBreadcrumbs } from '../price-breadcrumbs';
import { isBrowseLetter, startingWith } from './browse-letters';

/**
 * From the letter alone, so it doesn't wait for the API. None for a letter there's no page for: it's a 404, titled by
 * the route, without a canonical.
 */
export const browseMeta =
  (world: PriceWorld): RouteMeta =>
  (route: ActivatedRouteSnapshot): PageMeta | undefined => {
    const letter: string = route.params['letter'];
    if (!isBrowseLetter(letter)) return undefined;

    const canonicalPath = `${priceTrackerPath(world)}/browse/${letter}`;
    const hardcore = world === 'hardcore';
    return {
      title: hardcore
        ? `OSRS Hardcore Worlds items ${startingWith(letter)}`
        : `OSRS items ${startingWith(letter)}: Grand Exchange prices`,
      description:
        `Every OSRS ${hardcore ? 'Hardcore Worlds ' : ''}Grand Exchange item ${startingWith(letter)}, sorted by name, ` +
        'with its latest price and change since yesterday. Open one for its price history, margin and buy limit.',
      canonicalPath,
      jsonLd: [priceBreadcrumbs(world, { name: `Items ${startingWith(letter)}`, path: canonicalPath })],
    };
  };
