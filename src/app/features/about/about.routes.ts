import { Route } from '@angular/router';

export default [
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
