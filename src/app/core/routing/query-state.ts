import { Location } from '@angular/common';
import { ActivatedRoute, ParamMap, Params, Router } from '@angular/router';

/**
 * The query params in the URL as the browser has it, also the ones `replaceQueryParams` wrote, which the router never
 * sees. On the server, the request's.
 */
export function readQueryParams(router: Router, location: Location): ParamMap {
  return router.parseUrl(location.path()).queryParamMap;
}

/**
 * Puts params in the URL (`null` takes one out) without navigating: a navigation would scroll to the top and count as a
 * page view ("Compared days go in the URL without navigating", `docs/decisions.md`). Keeps the router's state, so Back to
 * the page still restores its scroll position.
 */
export function replaceQueryParams(router: Router, route: ActivatedRoute, location: Location, params: Params): void {
  const url = router.createUrlTree([], { relativeTo: route, queryParams: params, queryParamsHandling: 'merge' });
  location.replaceState(router.serializeUrl(url), '', location.getState());
}
