import { Route } from '@angular/router';
import { itemDetailResolver } from './item-detail/item-detail.resolver';
import { itemDetailTitleResolver } from './item-detail/item-detail.title-resolver';

export default [
  {
    title: 'Price Tracker - OSRS Tracker',
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./price-tracker.component'),
  },
  {
    title: itemDetailTitleResolver,
    path: ':id',
    pathMatch: 'full',
    loadComponent: () => import('./item-detail/item-detail.component'),
    resolve: { item: itemDetailResolver },
  },
] as Route[];
