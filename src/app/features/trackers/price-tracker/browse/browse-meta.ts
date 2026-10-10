import { ActivatedRouteSnapshot } from '@angular/router';
import { PageMeta } from '@app/common/seo/page-meta-strategy';
import { breadcrumbList } from '@app/common/seo/structured-data';
import { isBrowseLetter, startingWith } from './browse-letters';

/**
 * From the letter alone, so it doesn't wait for the API. None for a letter there's no page for: it's a 404, titled by
 * the route, without a canonical. The title is "OSRS items starting with A: Grand Exchange prices", like the landing
 * pages' titles, without the site name.
 */
export function browseMeta(route: ActivatedRouteSnapshot): PageMeta | undefined {
  const letter: string = route.params['letter'];
  if (!isBrowseLetter(letter)) return undefined;

  const canonicalPath = `/trackers/price/browse/${letter}`;
  return {
    title: `OSRS items ${startingWith(letter)}: Grand Exchange prices`,
    description:
      `Every OSRS Grand Exchange item ${startingWith(letter)}, sorted by name, with its latest price and change ` +
      'since yesterday. Open one for its price history, margin and buy limit.',
    canonicalPath,
    jsonLd: [
      breadcrumbList([
        { name: 'Price Tracker', path: '/trackers/price' },
        { name: `Items ${startingWith(letter)}`, path: canonicalPath },
      ]),
    ],
  };
}
