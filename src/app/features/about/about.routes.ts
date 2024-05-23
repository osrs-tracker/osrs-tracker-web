import { HttpClient, HttpContext } from '@angular/common/http';
import { inject } from '@angular/core';
import { Route } from '@angular/router';
import { BASE_URL_PREFIX } from 'src/app/core/interceptors/base-url.interceptors';

export default [
  {
    path: 'changelog',
    pathMatch: 'prefix',
    loadComponent: () => import('./changelog/changelog.component'),
    resolve: {
      changelog: () => {
        const CHANGELOG_URL = 'https://raw.githubusercontent.com/osrs-tracker/osrs-tracker-web/main/CHANGELOG.md';
        return inject(HttpClient).get(CHANGELOG_URL, {
          responseType: 'text',
          context: new HttpContext().set(BASE_URL_PREFIX, false),
        });
      },
    },
  },
  {
    path: 'privacy',
    title: 'Privacy - OSRS Tracker',
    loadComponent: () => import('./privacy/privacy.component'),
  },
  {
    path: 'terms',
    title: 'Terms - OSRS Tracker',
    loadComponent: () => import('./terms/terms.component'),
  },
] as Route[];
