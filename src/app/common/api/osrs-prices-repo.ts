import { isPlatformServer } from '@angular/common';
import { HttpClient, HttpContext } from '@angular/common/http';
import { ApplicationRef, inject, makeStateKey, PLATFORM_ID, Service, TransferState } from '@angular/core';
import { fromUnixTime, getUnixTime } from 'date-fns';
import { finalize, map, Observable, of, share, shareReplay, tap } from 'rxjs';
import { BASE_URL_PREFIX } from '@app/core/interceptors/base-url-interceptor';
import { LOADING_INDICATOR } from '@app/core/interceptors/loading-indicator-interceptor';
import { SSR_TIMEOUT } from '@app/core/interceptors/ssr-timeout-interceptor';
import { config } from '@config/config';
import { PriceWorld, worldKey } from './price-world';

export enum TimeSpan {
  DAY = '24h',
}

/** The Wiki picks the step (5 minutes for `24h`, hourly for `7d`, …) */
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

export interface ItemMapping {
  id: number;
  name: string;
  icon: string;
  members: boolean;
  highalch?: number;
  /** Per 4 hours, missing for some items */
  limit?: number;
}

/** Prices in gp, times in Unix seconds */
export type LatestPriceList = Record<string, Record<string, number>>;

/** How long each list stays fresh, in ms */
interface ServerLists {
  /** As long as the Wiki's CDN caches it */
  latest: LatestPriceList;
  /** Names, alch values and buy limits change with game updates only */
  mapping: ItemMapping[];
  /** A finished UTC day's `/24h` bucket doesn't change: the key (its timestamp) moves on the next day */
  day: Record<string, AveragePrices>;
  /**
   * The day before `day`, for yesterday's movers: in a list of its own, as a list holds and requests one key at
   * a time, so two days in `day` would evict each other and answer each other's requests
   */
  dayBefore: Record<string, AveragePrices>;
}
const SERVER_LIST_TTL: Record<keyof ServerLists, number> = {
  latest: 60_000,
  mapping: 6 * 3_600_000,
  day: 86_400_000,
  dayBefore: 86_400_000,
};

/**
 * Server only: the Wiki's full lists, shared by every render (unlike `OngoingRequests`) since they're public and the
 * same for everyone. The data, not the request: a render only waits for its own `HttpClient`'s requests.
 */
const serverLists: Record<
  PriceWorld,
  { [K in keyof ServerLists]?: { data: ServerLists[K]; key: string; fetchedAt: number } }
> = { main: {}, hardcore: {} };

/**
 * The OSRS Wiki's prices API (v2), as its guidelines ask: bulk lists over single items, and time series by `lookback`,
 * which its CDN caches for everyone, unlike the old `timestep` series that waited on its database (`docs/decisions.md`).
 */
const wikiContext = (loadingIndicator = false): HttpContext =>
  new HttpContext().set(BASE_URL_PREFIX, false).set(SSR_TIMEOUT, true).set(LOADING_INDICATOR, loadingIndicator);

@Service()
export class OsrsPricesRepo {
  private readonly httpClient = inject(HttpClient);
  private readonly transferState = inject(TransferState);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));

  /** Browser only: until the app is stable, the rendered items' prices come from the server (like the transfer cache) */
  private useTransferredPrices = !this.isServer;
  private readonly serverListRequests: Record<PriceWorld, Partial<Record<keyof ServerLists, Observable<unknown>>>> = {
    main: {},
    hardcore: {},
  };
  private readonly mapping$: Partial<Record<PriceWorld, Observable<ItemMapping[]>>> = {};

  /** By world, time span and timestamp */
  private readonly averagePriceCache = new Map<
    string,
    Observable<{ data: Record<string, AveragePrices>; timestamp: number }>
  >();

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
  getLatestPrices(
    id: number,
    world: PriceWorld = 'main',
    options?: { loadingIndicator?: boolean },
  ): Observable<LatestPrices> {
    const key = makeStateKey<Record<string, number> | null>(worldKey(world, `wiki-latest-${id}`));
    if (this.isServer)
      return this.serverLatestPrices(world, options).pipe(
        map(data => data[id]),
        tap(price => this.transferState.set(key, price ?? null)),
        map(toLatestPrices),
      );
    if (this.useTransferredPrices && this.transferState.hasKey(key))
      return of(toLatestPrices(this.transferState.get(key, null) ?? {}));

    return this.fetchLatestPrices(world, options).pipe(map(data => toLatestPrices(data[id])));
  }

  getItemMapping(world: PriceWorld = 'main'): Observable<ItemMapping[]> {
    if (this.isServer)
      return this.serverList(world, 'mapping', '', () => this.fetchItemMapping(world, { transferCache: false }));
    return (this.mapping$[world] ??= this.fetchItemMapping(world).pipe(shareReplay(1)));
  }

  getAllLatestPrices(world: PriceWorld = 'main'): Observable<LatestPriceList> {
    return this.isServer ? this.serverLatestPrices(world) : this.fetchLatestPrices(world);
  }

  /** The browser shares the request with `getCachedPriceAverage`; the server keeps the day for every render */
  getAveragePrices(
    timeSpan: TimeSpan,
    timestamp: Date,
    world: PriceWorld = 'main',
  ): Observable<Record<string, AveragePrices>> {
    if (this.isServer && timeSpan === TimeSpan.DAY) return this.serverDay(world, 'day', timestamp);
    return this.cachedAveragePrice(world, timeSpan, timestamp).pipe(map(response => response.data));
  }

  /** `getAveragePrices` for the day before the one it's asked for, which the server keeps as well */
  getDayBeforeAverages(timestamp: Date, world: PriceWorld = 'main'): Observable<Record<string, AveragePrices>> {
    if (this.isServer) return this.serverDay(world, 'dayBefore', timestamp);
    return this.cachedAveragePrice(world, TimeSpan.DAY, timestamp).pipe(map(response => response.data));
  }

  getPriceTimeSeries(
    id: number,
    lookback: Lookback,
    world: PriceWorld = 'main',
    options?: { loadingIndicator?: boolean },
  ): Observable<AveragePricesAtTime[]> {
    return this.httpClient
      .get<{ data: AveragePricesAtTime[]; itemId: string }>(`${config.pricesBaseUrl[world]}/timeseries`, {
        params: { id, lookback },
        context: wikiContext(options?.loadingIndicator),
      })
      .pipe(map(response => response.data));
  }

  getPriceAverage(
    id: number,
    timeSpan: TimeSpan,
    timestamp?: Date,
    world: PriceWorld = 'main',
  ): Observable<{ averagePrices?: AveragePrices; timestamp: Date }> {
    return this.mapAveragePriceResponse(id, this.fetchAveragePrice(world, timeSpan, timestamp));
  }

  /**
   * Shares one request per time span and timestamp, since the response holds every item. A failed request is retried by
   * the next subscriber.
   */
  getCachedPriceAverage(
    id: number,
    timeSpan: TimeSpan,
    timestamp: Date,
    world: PriceWorld = 'main',
  ): Observable<{ averagePrices?: AveragePrices; timestamp: Date }> {
    return this.mapAveragePriceResponse(id, this.cachedAveragePrice(world, timeSpan, timestamp));
  }

  private cachedAveragePrice(
    world: PriceWorld,
    timeSpan: TimeSpan,
    timestamp: Date,
  ): Observable<{ data: Record<string, AveragePrices>; timestamp: number }> {
    const key = `${world}/${timeSpan}/${getUnixTime(timestamp)}`;
    let cached = this.averagePriceCache.get(key);
    if (!cached)
      this.averagePriceCache.set(
        key,
        (cached = this.fetchAveragePrice(world, timeSpan, timestamp).pipe(shareReplay(1))),
      );
    return cached;
  }

  private serverLatestPrices(world: PriceWorld, options?: { loadingIndicator?: boolean }): Observable<LatestPriceList> {
    return this.serverList(world, 'latest', '', () =>
      this.fetchLatestPrices(world, { ...options, transferCache: false }),
    );
  }

  private serverDay(
    world: PriceWorld,
    list: 'day' | 'dayBefore',
    timestamp: Date,
  ): Observable<Record<string, AveragePrices>> {
    return this.serverList(world, list, String(getUnixTime(timestamp)), () =>
      this.fetchAveragePrice(world, TimeSpan.DAY, timestamp, { transferCache: false }).pipe(
        map(response => response.data),
      ),
    );
  }

  private serverList<K extends keyof ServerLists>(
    world: PriceWorld,
    name: K,
    key: string,
    fetch: () => Observable<ServerLists[K]>,
  ): Observable<ServerLists[K]> {
    const kept = serverLists[world][name];
    // A copy from the future is stale too: a clock set back, or another spec's fake time in the same test worker
    const age = kept ? Date.now() - kept.fetchedAt : -1;
    if (kept && kept.key === key && age >= 0 && age < SERVER_LIST_TTL[name]) return of(kept.data);

    return (this.serverListRequests[world][name] ??= fetch().pipe(
      tap(data => {
        // An unfinished day's bucket is empty: kept, it would blank every list that uses it for the whole day
        if (Object.keys(data).length)
          serverLists[world][name] = { data, key, fetchedAt: Date.now() } as (typeof serverLists)[PriceWorld][K];
      }),
      finalize(() => delete this.serverListRequests[world][name]),
      share(),
    )) as Observable<ServerLists[K]>;
  }

  private fetchItemMapping(world: PriceWorld, options?: { transferCache?: boolean }): Observable<ItemMapping[]> {
    return this.httpClient
      .get<(ItemMapping & Record<string, unknown>)[]>(`${config.pricesBaseUrl[world]}/mapping`, {
        transferCache: options?.transferCache,
        context: wikiContext(),
      })
      .pipe(
        // About a third of the response is `examine`, which nothing shows
        map(items =>
          items.map(({ id, name, icon, members, highalch, limit }) => ({ id, name, icon, members, highalch, limit })),
        ),
      );
  }

  private fetchLatestPrices(
    world: PriceWorld,
    options?: {
      loadingIndicator?: boolean;
      transferCache?: boolean;
    },
  ): Observable<LatestPriceList> {
    return this.httpClient
      .get<{ data: LatestPriceList }>(`${config.pricesBaseUrl[world]}/latest`, {
        transferCache: options?.transferCache,
        context: wikiContext(options?.loadingIndicator),
      })
      .pipe(map(response => response.data));
  }

  private fetchAveragePrice(
    world: PriceWorld,
    timeSpan: TimeSpan,
    timestamp?: Date,
    options?: { transferCache?: boolean },
  ): Observable<{ data: Record<string, AveragePrices>; timestamp: number }> {
    return this.httpClient.get<{ data: Record<string, AveragePrices>; timestamp: number }>(
      `${config.pricesBaseUrl[world]}/${timeSpan}`,
      {
        transferCache: options?.transferCache,
        ...(timestamp && { params: { timestamp: getUnixTime(timestamp) } }),
        context: wikiContext(),
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

/** An item's entry in `/latest` is missing without trades; times are in Unix seconds */
function toLatestPrices(price: Record<string, number>): LatestPrices {
  return {
    high: price?.['high'],
    low: price?.['low'],
    highTime: fromUnixTime(price?.['highTime']),
    lowTime: fromUnixTime(price?.['lowTime']),
  };
}
