import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { fromUnixTime, getUnixTime, subDays } from 'date-fns';
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

@Injectable({
  providedIn: 'root',
})
export class OsrsPricesRepo {
  private previousDayAverage$: Observable<{ data: { [key: string]: AveragePrices }; timestamp: number }>;

  constructor(private httpClient: HttpClient) {}

  /** Cache this in memory, because this won't change, and it contains all the items. */
  getPreviousDayAverage(id: number): Observable<{ averagePrices: AveragePrices; timestamp: Date }> {
    if (!this.previousDayAverage$) {
      const utcStartOfDay = new Date(Date.now() - (Date.now() % (86400 * 10000))); // Round down to the utc start of the day.

      this.previousDayAverage$ = this.httpClient
        .get<{ data: { [key: string]: AveragePrices }; timestamp: number }>(
          `${config.pricesBaseUrl}/api/v1/osrs/${TimeSpan.DAY}`,
          {
            params: { timestamp: getUnixTime(subDays(utcStartOfDay, 1)) },
            context: new HttpContext().set(BASE_URL_PREFIX, false),
          },
        )
        .pipe(shareReplay(1));
    }

    return this.mapAveragePriceResponse(id, this.previousDayAverage$);
  }

  getPriceAverage(id: number, timeSpan: TimeSpan): Observable<{ averagePrices: AveragePrices; timestamp: Date }> {
    const request$ = this.httpClient.get<{ data: { [key: string]: AveragePrices }; timestamp: number }>(
      `${config.pricesBaseUrl}/api/v1/osrs/${timeSpan}`,
      { context: new HttpContext().set(BASE_URL_PREFIX, false) },
    );
    return this.mapAveragePriceResponse(id, request$);
  }

  getLatestPrices(id: number, options?: { loadingIndicator: boolean }): Observable<LatestPrices> {
    return this.httpClient
      .get<{ data: { [key: string]: { [key: string]: number } } }>(`${config.pricesBaseUrl}/api/v1/osrs/latest`, {
        params: { id },
        context: new HttpContext().set(BASE_URL_PREFIX, false).set(LOADING_INDICATOR, options?.loadingIndicator),
      })
      .pipe(
        map(response => response.data[id]),
        map(({ high, low, highTime, lowTime }) => ({
          high: high,
          low: low,
          highTime: fromUnixTime(highTime),
          lowTime: fromUnixTime(lowTime),
        })),
      );
  }

  private mapAveragePriceResponse(
    id: number,
    response: Observable<{ data: { [key: string]: AveragePrices }; timestamp: number }>,
  ): Observable<{ averagePrices: AveragePrices; timestamp: Date }> {
    return response.pipe(
      map(response => ({ averagePrices: response.data[id], timestamp: fromUnixTime(response.timestamp) })),
    );
  }
}
