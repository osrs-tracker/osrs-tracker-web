/** The price tracker links that leave Hardcore Worlds for the main game, the landing's exact path included */
export const mainPriceLinks = (hrefs: (string | null)[]): (string | null)[] =>
  hrefs.filter(
    href => /^\/trackers\/price(\/|$)/.test(href ?? '') && !/^\/trackers\/price\/hardcore(\/|$)/.test(href ?? ''),
  );
