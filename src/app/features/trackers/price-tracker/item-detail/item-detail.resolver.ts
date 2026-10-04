import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { catchError, forkJoin } from 'rxjs';
import {
  AveragePricesAtTime,
  LatestPrices,
  OsrsPricesRepo,
  TimeSpan,
} from 'src/app/common/repositories/osrs-prices.repo';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { resolverErrorHandler } from 'src/app/core/routing/resolver-error';

export interface ItemDetail {
  item: Item;
  latestPrices: LatestPrices;
  dailyVolume: number;
  timeSeriesToday: AveragePricesAtTime[];
}

export const itemDetailResolver: ResolveFn<ItemDetail | null> = (route: ActivatedRouteSnapshot) => {
  const osrsTrackerRepo = inject(OsrsTrackerRepo);
  const osrsPricesRepo = inject(OsrsPricesRepo);

  return forkJoin({
    item: osrsTrackerRepo.getItemInfo(route.params['id'], { loadingIndicator: true }),
    latestPrices: osrsPricesRepo.getLatestPrices(route.params['id'], { fetchSingle: true, loadingIndicator: true }),
    dailyVolume: osrsPricesRepo.getVolume(route.params['id'], { loadingIndicator: true }),
    timeSeriesToday: osrsPricesRepo.getPriceTimeSeries(route.params['id'], TimeSpan.FIVE_MINUTES, {
      loadingIndicator: true,
    }),
  }).pipe(catchError(resolverErrorHandler('/trackers/price/' + route.params['id'])));
};
