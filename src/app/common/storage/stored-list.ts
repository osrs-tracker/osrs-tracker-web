import { StorageKey } from './storage';
import { StorageService } from './storage-service';

export function readStoredList<T>(storageService: StorageService, key: StorageKey): T[] {
  const storedValue = storageService.getItem(key);
  if (!storedValue) return [];

  try {
    const list: unknown = JSON.parse(storedValue);
    return Array.isArray(list) ? list : [];
  } catch {
    // Corrupted or edited by hand
    return [];
  }
}

export function writeStoredList(storageService: StorageService, key: StorageKey, list: readonly unknown[]): void {
  storageService.setItem(key, JSON.stringify(list));
}

export function pushToFront<T>(list: readonly T[], entry: T, same: (a: T, b: T) => boolean, max: number): T[] {
  return [entry, ...list.filter(other => !same(other, entry))].slice(0, max);
}

export function toggleInList<T>(list: readonly T[], entry: T, same: (a: T, b: T) => boolean): T[] {
  const without = list.filter(other => !same(other, entry));
  return without.length < list.length ? without : [entry, ...list];
}
