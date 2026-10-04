// Kill switch for the Angular service worker that older versions of this site installed (disabled 2025/04/13, removed
// 2026/10/04). Browsers that still have it registered fetch this file as its update, install it, and it unregisters
// itself and deletes the old caches. Keep serving it at /ngsw-worker.js with no-cache headers.
//
// Copied from @angular/service-worker/safety-worker.js:
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());

  event.waitUntil(
    self.registration.unregister().then(() => {
      console.log('NGSW Safety Worker - unregistered old service worker');
    }),
  );

  event.waitUntil(
    caches.keys().then(cacheNames => {
      const ngswCacheNames = cacheNames.filter(name => /^ngsw:/.test(name));
      return Promise.all(ngswCacheNames.map(name => caches.delete(name)));
    }),
  );
});
