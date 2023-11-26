import { Route } from '@angular/router';

export default [
  {
    path: 'changelog',
    pathMatch: 'prefix',
    loadComponent: () => import('./changelog/changelog.component'),
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
