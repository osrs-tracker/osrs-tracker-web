import { inject } from '@angular/core';
import { Route } from '@angular/router';
import RootLayout from './core/layout/root-layout';
import { MetaService } from './common/seo/meta-service';

export default [
  {
    path: '',
    pathMatch: 'prefix',
    component: RootLayout,
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Home - OSRS Tracker',
        resolve: { metaDescription: () => inject(MetaService).setDefaultMeta() },
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
        resolve: { metaDescription: () => inject(MetaService).setDefaultMeta() },
        loadChildren: () => import('./features/about/about.routes'),
      },
      {
        path: 'error',
        title: 'Error - OSRS Tracker',
        resolve: { metaDescription: () => inject(MetaService).setDefaultMeta() },
        loadComponent: () => import('./features/error/error-page'),
      },
      {
        path: '**',
        pathMatch: 'full',
        title: '404 Not Found - OSRS Tracker',
        resolve: { metaDescription: () => inject(MetaService).setDefaultMeta() },
        loadComponent: () => import('./features/not-found/not-found'),
      },
    ],
  },
] as Route[];
