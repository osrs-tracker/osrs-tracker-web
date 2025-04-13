import { inject, Injectable } from '@angular/core';
import { WINDOW } from 'src/app/core/platform/window.token';
import { StorageKey } from './storage';

@Injectable({
  providedIn: 'root',
})
export class StorageService implements Storage {
  readonly window: Window | null = inject(WINDOW);

  getItem(key: StorageKey): string | null {
    return this.window && this.window.localStorage.getItem(key);
  }

  setItem(key: StorageKey, value: string): void {
    return this.window?.localStorage.setItem(key, value);
  }

  removeItem(key: StorageKey): void {
    this.window?.localStorage.removeItem(key);
  }

  clear(): void {
    this.window?.localStorage.clear();
  }

  key(index: number): string | null {
    return this.window && this.window.localStorage.key(index);
  }

  get length(): number {
    return this.window?.localStorage.length || 0;
  }
}
