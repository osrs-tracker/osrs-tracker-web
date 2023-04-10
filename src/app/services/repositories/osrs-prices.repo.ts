import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { BASE_URL_PREFIX } from 'src/app/core/interceptors/base-url.interceptors';
import { LOADING_INDICATOR } from 'src/app/core/interceptors/loading-indicator.interceptor';
import { config } from 'src/config/config';

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
  // Cache this in memory, because this won't change, and it contains all the items
  private previousDayAverage$ = this.httpClient
    .get<{ data: { [key: string]: AveragePrices } }>(`${config.pricesBaseUrl}/api/v1/osrs/24h`, {
      params: {
        timestamp:
          Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 1, 0, 0, 0, 0) / 1000,
      },
      context: new HttpContext().set(BASE_URL_PREFIX, false),
    })
    .pipe(shareReplay(1));

  constructor(private httpClient: HttpClient) {}

  getPreviousDayAverage(id: number): Observable<AveragePrices> {
    return this.previousDayAverage$.pipe(map(response => response.data[id]));
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
          highTime: new Date(highTime * 1000),
          lowTime: new Date(lowTime * 1000),
        })),
      );
  }
}
