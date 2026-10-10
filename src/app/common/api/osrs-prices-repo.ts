import { isPlatformServer } from '@angular/common';
import { HttpClient, HttpContext } from '@angular/common/http';
import { ApplicationRef, inject, makeStateKey, PLATFORM_ID, Service, TransferState } from '@angular/core';
import { fromUnixTime, getUnixTime } from 'date-fns';
import { finalize, map, Observable, of, share, shareReplay, tap } from 'rxjs';
import { BASE_URL_PREFIX } from '@app/core/interceptors/base-url-interceptor';
import { LOADING_INDICATOR } from '@app/core/interceptors/loading-indicator-interceptor';
import { SSR_TIMEOUT } from '@app/core/interceptors/ssr-timeout-interceptor';
import { config } from '@config/config';

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

/** How long the server reuses the Wiki's full `/latest` list, in ms: as long as the Wiki's CDN caches it */
const SERVER_LATEST_PRICES_TTL = 60_000;

/**
 * Server only: the full `/latest` list, shared by every render (unlike `OngoingRequests`) since it's public and the same
 * for everyone. The data, not the request: a render only waits for its own `HttpClient`'s requests.
 */
let latestPricesCache: { data: Record<string, Record<string, number>>; fetchedAt: number } | undefined;

@Service()
export class OsrsPricesRepo {
  private readonly httpClient = inject(HttpClient);
  private readonly transferState = inject(TransferState);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));

  /** Browser only: until the app is stable, single-item prices come from the server's render (like the transfer cache) */
  private useTransferredPrices = !this.isServer;
  /** Server only: the render's ongoing request for the full `/latest` list, while `latestPricesCache` is stale */
  private latestPricesRequest$?: Observable<Record<string, Record<string, number>>>;

  private averagePriceCache: Record<
    TimeSpan,
    Record<number, Observable<{ data: Record<string, AveragePrices>; timestamp: number }>>
  > = {
    [TimeSpan.FIVE_MINUTES]: {},
    [TimeSpan.HOUR]: {},
    [TimeSpan.SIX_HOURS]: {},
    [TimeSpan.DAY]: {},
  };

  constructor() {
    if (!this.isServer)
      void inject(ApplicationRef)
        .whenStable()
        .then(() => (this.useTransferredPrices = false));
  }

  /**
   * From the Wiki's full `/latest` list, which is nearly always in its CDN cache, where a single item (`?id=`) rarely is
   * and waits on the Wiki's own servers (seconds at the 90th percentile). The server keeps the list for every render and
   * hands each item it renders to the browser through `TransferState`, as the list is far too large to embed in the page.
   */
  getLatestPrices(id: number, options?: { loadingIndicator?: boolean }): Observable<LatestPrices> {
    const key = makeStateKey<Record<string, number> | null>(`wiki-latest-${id}`);
    if (this.isServer)
      return this.serverLatestPrices(options).pipe(
        map(data => data[id]),
        tap(price => this.transferState.set(key, price ?? null)),
        map(toLatestPrices),
      );
    if (this.useTransferredPrices && this.transferState.hasKey(key))
      return of(toLatestPrices(this.transferState.get(key, null) ?? {}));

    return this.fetchLatestPrices(options).pipe(map(data => toLatestPrices(data[id])));
  }

  getPriceTimeSeries(
    id: number,
    timeSpan: TimeSpan,
    options?: { loadingIndicator?: boolean },
  ): Observable<AveragePricesAtTime[]> {
    return this.httpClient
      .get<{ data: AveragePricesAtTime[]; itemId: string }>(`${config.pricesBaseUrl}/api/v1/osrs/timeseries`, {
        params: { id, timestep: timeSpan },
        context: new HttpContext()
          .set(BASE_URL_PREFIX, false)
          .set(SSR_TIMEOUT, true)
          .set(LOADING_INDICATOR, options?.loadingIndicator),
      })
      .pipe(map(response => response.data));
  }

  /** Average prices for the `timeSpan` period starting at `timestamp` (the latest period without one) */
  getPriceAverage(
    id: number,
    timeSpan: TimeSpan,
    timestamp?: Date,
  ): Observable<{ averagePrices?: AveragePrices; timestamp: Date }> {
    return this.mapAveragePriceResponse(id, this.fetchAveragePrice(timeSpan, timestamp));
  }

  /**
   * Same as `getPriceAverage`, but shares one request per time span and timestamp, since the response holds every item.
   * A failed request is retried by the next subscriber.
   */
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

  /** The full `/latest` list for the server: kept for every render, and requested once per render when stale */
  private serverLatestPrices(options?: {
    loadingIndicator?: boolean;
  }): Observable<Record<string, Record<string, number>>> {
    if (latestPricesCache && Date.now() - latestPricesCache.fetchedAt < SERVER_LATEST_PRICES_TTL)
      return of(latestPricesCache.data);

    return (this.latestPricesRequest$ ??= this.fetchLatestPrices({ ...options, transferCache: false }).pipe(
      tap(data => (latestPricesCache = { data, fetchedAt: Date.now() })),
      finalize(() => (this.latestPricesRequest$ = undefined)),
      share(),
    ));
  }

  private fetchLatestPrices(options?: {
    loadingIndicator?: boolean;
    transferCache?: boolean;
  }): Observable<Record<string, Record<string, number>>> {
    return this.httpClient
      .get<{ data: Record<string, Record<string, number>> }>(`${config.pricesBaseUrl}/api/v1/osrs/latest`, {
        transferCache: options?.transferCache,
        context: new HttpContext()
          .set(BASE_URL_PREFIX, false)
          .set(SSR_TIMEOUT, true)
          .set(LOADING_INDICATOR, options?.loadingIndicator),
      })
      .pipe(map(response => response.data));
  }

  private fetchAveragePrice(
    timeSpan: TimeSpan,
    timestamp?: Date,
  ): Observable<{ data: Record<string, AveragePrices>; timestamp: number }> {
    return this.httpClient.get<{ data: Record<string, AveragePrices>; timestamp: number }>(
      `${config.pricesBaseUrl}/api/v1/osrs/${timeSpan}`,
      {
        ...(timestamp && { params: { timestamp: getUnixTime(timestamp) } }), // Only add the timestamp param if it's defined
        context: new HttpContext().set(BASE_URL_PREFIX, false).set(SSR_TIMEOUT, true),
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

/** Maps an item's entry in the Wiki's `/latest` response (times in Unix seconds), which is missing without trades */
function toLatestPrices(price: Record<string, number>): LatestPrices {
  return {
    high: price?.['high'],
    low: price?.['low'],
    highTime: fromUnixTime(price?.['highTime']),
    lowTime: fromUnixTime(price?.['lowTime']),
  };
}
