import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { fromUnixTime, getUnixTime } from 'date-fns';
import { Observable, map, shareReplay } from 'rxjs';
import { BASE_URL_PREFIX } from 'src/app/core/interceptors/base-url.interceptors';
import { LOADING_INDICATOR } from 'src/app/core/interceptors/loading-indicator.interceptor';
import { config } from 'src/config/config';

export enum TimeSpan {
  FIVE_MINUTES = '5m',
  HOUR = '1h',
  SIX_HOURS = '6h',
  DAY = '24h',
}

export interface LatestPrices {
  high: number;
  highTime: Date;
  low: number;
  lowTime: Date;
}

export interface AveragePrices {
  avgHighPrice: number;
  highPriceVolume: number;
  avgLowPrice: number;
  lowPriceVolume: number;
}

export interface AveragePricesAtTime extends AveragePrices {
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class OsrsPricesRepo {
  private readonly httpClient = inject(HttpClient);

  private averagePriceCache: Record<
    TimeSpan,
    Record<number, Observable<{ data: Record<string, AveragePrices>; timestamp: number }>>
  > = {
    [TimeSpan.FIVE_MINUTES]: {},
    [TimeSpan.HOUR]: {},
    [TimeSpan.SIX_HOURS]: {},
    [TimeSpan.DAY]: {},
  };

  getLatestPrices(
    id: number,
    options?: { fetchSingle?: boolean; loadingIndicator?: boolean },
  ): Observable<LatestPrices> {
    return this.httpClient
      .get<{ data: Record<string, Record<string, number>> }>(`${config.pricesBaseUrl}/api/v1/osrs/latest`, {
        ...(options?.fetchSingle && { params: { id } }),
        context: new HttpContext().set(BASE_URL_PREFIX, false).set(LOADING_INDICATOR, options?.loadingIndicator),
      })
      .pipe(
        map(response => response.data[id]),
        map(price => ({
          high: price?.['high'],
          low: price?.['low'],
          highTime: fromUnixTime(price?.['highTime']),
          lowTime: fromUnixTime(price?.['lowTime']),
        })),
      );
  }

  getVolume(id: number, options?: { loadingIndicator?: boolean }): Observable<number> {
    return this.httpClient
      .get<{ data: Record<string, number> }>(`${config.pricesBaseUrl}/api/v1/osrs/volumes`, {
        context: new HttpContext().set(BASE_URL_PREFIX, false).set(LOADING_INDICATOR, options?.loadingIndicator),
      })
      .pipe(map(response => response.data[id]));
  }

  getPriceTimeSeries(
    id: number,
    timeSpan: TimeSpan,
    options?: { loadingIndicator?: boolean },
  ): Observable<AveragePricesAtTime[]> {
    return this.httpClient
      .get<{ data: AveragePricesAtTime[]; itemId: string }>(`${config.pricesBaseUrl}/api/v1/osrs/timeseries`, {
        params: { id, timestep: timeSpan },
        context: new HttpContext().set(BASE_URL_PREFIX, false).set(LOADING_INDICATOR, options?.loadingIndicator),
      })
      .pipe(map(response => response.data));
  }

  getPriceAverage(
    id: number,
    timeSpan: TimeSpan,
    timestamp?: Date,
  ): Observable<{ averagePrices?: AveragePrices; timestamp: Date }> {
    return this.mapAveragePriceResponse(id, this.fetchAveragePrice(timeSpan, timestamp));
  }

  getCachedPriceAverage(
    id: number,
    timeSpan: TimeSpan,
    timestamp: Date,
  ): Observable<{ averagePrices?: AveragePrices; timestamp: Date }> {
    const cachedRequest$ = this.averagePriceCache[timeSpan][getUnixTime(timestamp)];
    if (cachedRequest$) return this.mapAveragePriceResponse(id, cachedRequest$);

    const request$ = this.fetchAveragePrice(timeSpan, timestamp).pipe(shareReplay(1));
    this.averagePriceCache[timeSpan][getUnixTime(timestamp)] = request$;

    return this.mapAveragePriceResponse(id, request$);
  }

  private fetchAveragePrice(
    timeSpan: TimeSpan,
    timestamp?: Date,
  ): Observable<{ data: Record<string, AveragePrices>; timestamp: number }> {
    return this.httpClient.get<{ data: Record<string, AveragePrices>; timestamp: number }>(
      `${config.pricesBaseUrl}/api/v1/osrs/${timeSpan}`,
      {
        ...(timestamp && { params: { timestamp: getUnixTime(timestamp) } }), // Only add the timestamp param if it's defined
        context: new HttpContext().set(BASE_URL_PREFIX, false),
      },
    );
  }

  private mapAveragePriceResponse(
    id: number,
    request$: Observable<{ data: Record<string, AveragePrices>; timestamp: number }>,
  ): Observable<{ averagePrices?: AveragePrices; timestamp: Date }> {
    return request$.pipe(
      map(response => ({ averagePrices: response.data[id], timestamp: fromUnixTime(response.timestamp) })),
    );
  }
}
