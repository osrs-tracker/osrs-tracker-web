import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BASE_URL_PREFIX } from 'src/app/core/interceptors/base-url.interceptors';
import { LOADING_INDICATOR } from 'src/app/core/interceptors/loading-indicator.interceptor';
import { config } from 'src/config/config';

export class LatestPrices {
  high: number;
  highTime: Date;
  low: number;
  lowTime: Date;
}

@Injectable({
  providedIn: 'root',
})
export class OsrsPricesRepo {
  constructor(private httpClient: HttpClient) {}

  getLatestPrices(id: string, options?: { loadingIndicator: boolean }): Observable<LatestPrices> {
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
