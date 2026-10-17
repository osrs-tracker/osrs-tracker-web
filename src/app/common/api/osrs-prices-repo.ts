import { isPlatformServer } from '@angular/common';
import { HttpClient, HttpContext } from '@angular/common/http';
import { ApplicationRef, inject, makeStateKey, PLATFORM_ID, Service, TransferState } from '@angular/core';
import { fromUnixTime, getUnixTime } from 'date-fns';
import { finalize, map, Observable, of, share, shareReplay, tap } from 'rxjs';
import { BASE_URL_PREFIX } from '@app/core/interceptors/base-url-interceptor';
import { LOADING_INDICATOR } from '@app/core/interceptors/loading-indicator-interceptor';
import { SSR_TIMEOUT } from '@app/core/interceptors/ssr-timeout-interceptor';
import { config } from '@config/config';

/** The Wiki's average price lists (`/5m`, `/1h`, `/6h`, `/24h`), each holding every item */
export enum TimeSpan {
  FIVE_MINUTES = '5m',
  HOUR = '1h',
  SIX_HOURS = '6h',
  DAY = '24h',
}

/** How far back an item's time series goes; the Wiki picks the step (5 minutes for `24h`, hourly for `7d`, …) */
export type Lookback = '6h' | '24h' | '7d' | '30d' | '6m' | '1y';

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

/** An item from the Wiki's `/mapping`, cut down to the fields the site uses */
export interface ItemMapping {
  id: number;
  name: string;
  icon: string;
  members: boolean;
  highalch?: number;
  /** The GE buy limit per 4 hours, missing for some items */
  limit?: number;
}

/** The full `/latest` list, by item id: prices in gp, times in Unix seconds */
export type LatestPriceList = Record<string, Record<string, number>>;

/** The lists the server keeps for every render, and how long each stays fresh, in ms */
interface ServerLists {
  /** As long as the Wiki's CDN caches it */
  latest: LatestPriceList;
  /** Names, alch values and buy limits change with game updates only */
  mapping: ItemMapping[];
  /** A finished UTC day's `/24h` bucket doesn't change: the key (its timestamp) moves on the next day */
  day: Record<string, AveragePrices>;
}
const SERVER_LIST_TTL: Record<keyof ServerLists, number> = {
  latest: 60_000,
  mapping: 6 * 3_600_000,
  day: 86_400_000,
};

/**
 * Server only: the Wiki's full lists, shared by every render (unlike `OngoingRequests`) since they're public and the
 * same for everyone. The data, not the request: a render only waits for its own `HttpClient`'s requests.
 */
const serverLists: { [K in keyof ServerLists]?: { data: ServerLists[K]; key: string; fetchedAt: number } } = {};

/**
 * The OSRS Wiki's prices API (v2), as its guidelines ask: bulk lists over single items, and time series by `lookback`,
 * which its CDN caches for everyone, unlike the old `timestep` series that waited on its database (`docs/decisions.md`).
 */
@Service()
export class OsrsPricesRepo {
  private readonly httpClient = inject(HttpClient);
  private readonly transferState = inject(TransferState);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));

  /** Browser only: until the app is stable, the rendered items' prices come from the server (like the transfer cache) */
  private useTransferredPrices = !this.isServer;
  /** Server only: the render's ongoing request for each list in `serverLists` that is stale */
  private readonly serverListRequests: Partial<Record<keyof ServerLists, Observable<unknown>>> = {};
  /** Browser only: `/mapping` for the session */
  private mapping$?: Observable<ItemMapping[]>;

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

  /** Every item's name, icon, membership, alch value and buy limit */
  getItemMapping(): Observable<ItemMapping[]> {
    if (this.isServer) return this.serverList('mapping', '', () => this.fetchItemMapping({ transferCache: false }));
    return (this.mapping$ ??= this.fetchItemMapping().pipe(shareReplay(1)));
  }

  /** The full `/latest` list, by item id; times in Unix seconds */
  getAllLatestPrices(): Observable<LatestPriceList> {
    return this.isServer ? this.serverLatestPrices() : this.fetchLatestPrices();
  }

  /**
   * Every item's average prices for the `timeSpan` period starting at `timestamp`, by item id. The browser shares the
   * request with `getCachedPriceAverage`; the server keeps the day (`TimeSpan.DAY`) for every render.
   */
  getAveragePrices(timeSpan: TimeSpan, timestamp: Date): Observable<Record<string, AveragePrices>> {
    if (this.isServer && timeSpan === TimeSpan.DAY)
      return this.serverList('day', String(getUnixTime(timestamp)), () =>
        this.fetchAveragePrice(timeSpan, timestamp, { transferCache: false }).pipe(map(response => response.data)),
      );
    return this.cachedAveragePrice(timeSpan, timestamp).pipe(map(response => response.data));
  }

  getPriceTimeSeries(
    id: number,
    lookback: Lookback,
    options?: { loadingIndicator?: boolean },
  ): Observable<AveragePricesAtTime[]> {
    return this.httpClient
      .get<{ data: AveragePricesAtTime[]; itemId: string }>(`${config.pricesBaseUrl}/timeseries`, {
        params: { id, lookback },
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
    return this.mapAveragePriceResponse(id, this.cachedAveragePrice(timeSpan, timestamp));
  }

  private cachedAveragePrice(
    timeSpan: TimeSpan,
    timestamp: Date,
  ): Observable<{ data: Record<string, AveragePrices>; timestamp: number }> {
    return (this.averagePriceCache[timeSpan][getUnixTime(timestamp)] ??= this.fetchAveragePrice(
      timeSpan,
      timestamp,
    ).pipe(shareReplay(1)));
  }

  /** The full `/latest` list for the server: kept for every render, and requested once per render when stale */
  private serverLatestPrices(options?: { loadingIndicator?: boolean }): Observable<LatestPriceList> {
    return this.serverList('latest', '', () => this.fetchLatestPrices({ ...options, transferCache: false }));
  }

  /** A list in `serverLists`, or the render's one request for it while it's missing, stale or for another `key` */
  private serverList<K extends keyof ServerLists>(
    name: K,
    key: string,
    fetch: () => Observable<ServerLists[K]>,
  ): Observable<ServerLists[K]> {
    const kept = serverLists[name];
    // A copy from the future is stale too: a clock set back, or another spec's fake time in the same test worker
    const age = kept ? Date.now() - kept.fetchedAt : -1;
    if (kept && kept.key === key && age >= 0 && age < SERVER_LIST_TTL[name]) return of(kept.data);

    return (this.serverListRequests[name] ??= fetch().pipe(
      tap(data => (serverLists[name] = { data, key, fetchedAt: Date.now() } as (typeof serverLists)[K])),
      finalize(() => delete this.serverListRequests[name]),
      share(),
    )) as Observable<ServerLists[K]>;
  }

  private fetchItemMapping(options?: { transferCache?: boolean }): Observable<ItemMapping[]> {
    return this.httpClient
      .get<(ItemMapping & Record<string, unknown>)[]>(`${config.pricesBaseUrl}/mapping`, {
        transferCache: options?.transferCache,
        context: new HttpContext().set(BASE_URL_PREFIX, false).set(SSR_TIMEOUT, true),
      })
      .pipe(
        // About a third of the response is `examine`, which nothing shows
        map(items =>
          items.map(({ id, name, icon, members, highalch, limit }) => ({ id, name, icon, members, highalch, limit })),
        ),
      );
  }

  private fetchLatestPrices(options?: {
    loadingIndicator?: boolean;
    transferCache?: boolean;
  }): Observable<LatestPriceList> {
    return this.httpClient
      .get<{ data: LatestPriceList }>(`${config.pricesBaseUrl}/latest`, {
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
    options?: { transferCache?: boolean },
  ): Observable<{ data: Record<string, AveragePrices>; timestamp: number }> {
    return this.httpClient.get<{ data: Record<string, AveragePrices>; timestamp: number }>(
      `${config.pricesBaseUrl}/${timeSpan}`,
      {
        transferCache: options?.transferCache,
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
