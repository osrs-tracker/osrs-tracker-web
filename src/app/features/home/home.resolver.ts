import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { of } from 'rxjs';
import { StorageKey } from 'src/app/core/storage/storage';
import { OsrsNewsItem, OsrsProxyRepo } from 'src/app/services/repositories/osrs-proxy.repo';

export const osrsNewItemResolver: ResolveFn<OsrsNewsItem[]> = () => {
  if (localStorage.getItem(StorageKey.OsrsNews)) {
    return of(JSON.parse(localStorage.getItem(StorageKey.OsrsNews) || '[]'));
  }
  return inject(OsrsProxyRepo).getOSRSNews();
};
