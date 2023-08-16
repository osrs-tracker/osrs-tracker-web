import { inject } from '@angular/core';
import { Route } from '@angular/router';
import { RootLayoutComponent } from './common/root-layout/root-layout.component';
import { MetaService } from './common/services/meta.service';

export default [
  {
    path: '',
    pathMatch: 'prefix',
    component: RootLayoutComponent,
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
        pathMatch: 'prefix',
        resolve: { metaDescription: () => inject(MetaService).setDefaultMeta() },
        loadComponent: () => import('./features/changelog/changelog.component'),
      },
      {
        path: '**',
        title: '404 Not Found - OSRS Tracker',
        resolve: { metaDescription: () => inject(MetaService).setDefaultMeta() },
        loadComponent: () => import('./features/not-found/not-found.component').then(c => c.NotFoundComponent),
      },
    ],
  },
] as Route[];
