import { Route } from '@angular/router';
import { DEFAULT_DESCRIPTION, PageMeta } from './common/seo/page-meta-strategy';
import { webSite } from './common/seo/structured-data';
import RootLayout from './core/layout/root-layout';

export default [
  {
    path: '',
    pathMatch: 'prefix',
    component: RootLayout,
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'OSRS Tracker: XP tracker and Grand Exchange prices',
        data: {
          meta: { description: DEFAULT_DESCRIPTION, canonicalPath: '/', jsonLd: [webSite()] } satisfies PageMeta,
        },
        loadComponent: () => import('./features/home/home'),
      },
      {
        path: 'trackers',
        pathMatch: 'prefix',
        loadChildren: () => import('./features/trackers/trackers.routes'),
      },
      {
        path: 'about',
        pathMatch: 'prefix',
        loadChildren: () => import('./features/about/about.routes'),
      },
      {
        path: 'error',
        title: 'Error - OSRS Tracker',
        loadComponent: () => import('./features/error/error-page'),
      },
      {
        path: '**',
        pathMatch: 'full',
        title: '404 Not Found - OSRS Tracker',
        loadComponent: () => import('./features/not-found/not-found'),
      },
    ],
  },
] as Route[];
