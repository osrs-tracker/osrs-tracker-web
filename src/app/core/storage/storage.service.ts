import { Injectable } from '@angular/core';
import { StorageKey } from './storage';

@Injectable({
  providedIn: 'root',
})
export class StorageService implements Storage {
  getItem(key: StorageKey): string | null {
    return localStorage.getItem(key);
  }

  setItem(key: StorageKey, value: string): void {
    return localStorage.setItem(key, value);
  }

  removeItem(key: StorageKey): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }

  key(index: number): string | null {
    return localStorage.key(index);
  }

  get length(): number {
    return localStorage.length;
  }
}
