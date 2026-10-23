import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { readQueryParams, replaceQueryParams } from '@app/core/routing/query-state';

/** The query params of the compared days: `?day=2026-10-12&vs=2026-09-12` */
export const DAY_PARAM = 'day';
const VS_PARAM = 'vs';
/** The `vs` value for no second day */
export const NO_DAY = 'none';

/** The days picked by key (the check's UTC date), or `NO_DAY` for no second day */
export interface ComparePicks {
  day?: string;
  vs?: string;
}

/**
 * The picks in the URL as the browser has it: they're written without navigating, so the router never sees them
 * ("Compared days go in the URL without navigating", `docs/decisions.md`).
 */
export function readComparePicks(router: Router, location: Location): ComparePicks {
  const params = readQueryParams(router, location);
  return { day: params.get(DAY_PARAM) ?? undefined, vs: params.get(VS_PARAM) ?? undefined };
}

/** Puts the picks in the URL, or takes them out (`null`), without navigating */
export function writeComparePicks(
  router: Router,
  route: ActivatedRoute,
  location: Location,
  picks: ComparePicks | null,
): void {
  replaceQueryParams(router, route, location, { [DAY_PARAM]: picks?.day ?? null, [VS_PARAM]: picks?.vs ?? null });
}
