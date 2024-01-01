import { inject } from '@angular/core';
import { Route } from '@angular/router';
import { MetaService } from './common/services/meta.service';

export default [
  {
    path: '',
    pathMatch: 'prefix',
    loadComponent: () => import('./common/components/layout/root-layout/root-layout.component'),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Home - OSRS Tracker',
        resolve: { metaDescription: () => inject(MetaService).setDefaultMeta() },
        loadComponent: () => import('./features/home/home.component'),
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
        path: 'changelog',
        pathMatch: 'full',
        redirectTo: '/about/changelog',
      },
      {
        path: '**',
        pathMatch: 'full',
        title: '404 Not Found - OSRS Tracker',
        resolve: { metaDescription: () => inject(MetaService).setDefaultMeta() },
        loadComponent: () => import('./features/not-found/not-found.component'),
      },
    ],
  },
] as Route[];
