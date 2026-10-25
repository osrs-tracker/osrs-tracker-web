import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { readQueryParams, replaceQueryParams } from '@app/core/routing/query-state';

export const DAY_PARAM = 'day';
const VS_PARAM = 'vs';
export const NO_DAY = 'none';

export interface ComparePicks {
  day?: string;
  vs?: string;
}

/** Read from the browser's URL: the picks are written without navigating, so the router never sees them (`docs/decisions.md`). */
export function readComparePicks(router: Router, location: Location): ComparePicks {
  const params = readQueryParams(router, location);
  return { day: params.get(DAY_PARAM) ?? undefined, vs: params.get(VS_PARAM) ?? undefined };
}

export function writeComparePicks(
  router: Router,
  route: ActivatedRoute,
  location: Location,
  picks: ComparePicks | null,
): void {
  replaceQueryParams(router, route, location, { [DAY_PARAM]: picks?.day ?? null, [VS_PARAM]: picks?.vs ?? null });
}
