import { InjectionToken } from '@angular/core';
import { config } from '@config/config';

/** Hardcore Worlds have their own Grand Exchange, so their prices differ from the main game's */
export type PriceWorld = keyof typeof config.pricesBaseUrl;

/** Provided as `'hardcore'` on the Hardcore Worlds routes; the components read it and hand it to the repository */
export const PRICE_WORLD = new InjectionToken<PriceWorld>('PRICE_WORLD', { factory: () => 'main' });

/**
 * A cache or `TransferState` key per world. Main's stays as it was; without the world in it, a Hardcore Worlds render
 * would serve main prices (the server's caches are shared by every render).
 */
export const worldKey = (world: PriceWorld, key: string): string => (world === 'main' ? key : `${world}-${key}`);

/** The price tracker's base path in a world, for links, canonicals and breadcrumbs */
export const priceTrackerPath = (world: PriceWorld): string =>
  world === 'main' ? '/trackers/price' : `/trackers/price/${world}`;
