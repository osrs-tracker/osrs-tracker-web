import { Route } from '@angular/router';

export default [
  {
    path: 'price',
    loadChildren: () => import('./price-tracker/price-tracker.routes'),
  },
  {
    path: 'xp',
    loadChildren: () => import('./xp-tracker/xp-tracker.routes'),
  },
] as Route[];
