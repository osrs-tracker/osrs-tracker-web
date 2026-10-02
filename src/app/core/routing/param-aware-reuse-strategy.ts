import { Service } from '@angular/core';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router';

/**
 * By default, Angular reuses the component when navigating between routes with the same config, ex. going from
 * `/trackers/price/1` to `/trackers/price/2`, which leaves components that load their data on init stale.
 * This strategy recreates the component whenever the route params change.
 */
@Service()
export class ParamAwareReuseStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig && this.paramsEqual(future.params, curr.params);
  }

  private paramsEqual(a: ActivatedRouteSnapshot['params'], b: ActivatedRouteSnapshot['params']): boolean {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key]);
  }
}
