import { StorageKey } from './storage';
import { StorageService } from './storage-service';

// The recent and favourite lists the trackers keep on this device (items in the price tracker, usernames in the XP
// tracker): plain functions the stores call, since each store names its own state and methods.

/** A list stored as JSON; empty when there is none, or it was corrupted or edited by hand, instead of breaking the page */
export function readStoredList<T>(storageService: StorageService, key: StorageKey): T[] {
  const storedValue = storageService.getItem(key);
  if (!storedValue) return [];

  try {
    const list: unknown = JSON.parse(storedValue);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function writeStoredList(storageService: StorageService, key: StorageKey, list: readonly unknown[]): void {
  storageService.setItem(key, JSON.stringify(list));
}

/** `entry` first, without an earlier copy of it (`same`), and the oldest dropped beyond `max` */
export function pushToFront<T>(list: readonly T[], entry: T, same: (a: T, b: T) => boolean, max: number): T[] {
  return [entry, ...list.filter(other => !same(other, entry))].slice(0, max);
}

/** `entry` removed when the list has it (`same`), otherwise added first */
export function toggleInList<T>(list: readonly T[], entry: T, same: (a: T, b: T) => boolean): T[] {
  const without = list.filter(other => !same(other, entry));
  return without.length < list.length ? without : [entry, ...list];
}
