import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { PageMeta } from '@app/common/seo/page-meta-strategy';
import { isBrowseLetter, startingWith } from './browse-letters';

// From the letter alone, so neither waits for the API.

/** "OSRS items starting with A: Grand Exchange prices", like the landing pages' titles, without the site name */
export const browseTitleResolver: ResolveFn<string> = (route: ActivatedRouteSnapshot) => {
  const letter: string = route.params['letter'];
  return isBrowseLetter(letter)
    ? `OSRS items ${startingWith(letter)}: Grand Exchange prices`
    : 'Letter not found - OSRS Tracker';
};

/** No meta for a letter there's no page for: it's a 404, without a canonical. */
export const browseMetaResolver: ResolveFn<PageMeta | undefined> = (route: ActivatedRouteSnapshot) => {
  const letter: string = route.params['letter'];
  if (!isBrowseLetter(letter)) return undefined;

  return {
    description:
      `Every OSRS Grand Exchange item ${startingWith(letter)}, sorted by name, with its latest price and change ` +
      'since yesterday. Open one for its price history, margin and buy limit.',
    canonicalPath: `/trackers/price/browse/${letter}`,
  };
};
