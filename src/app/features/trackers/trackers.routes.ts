import { inject } from '@angular/core';
import { Route } from '@angular/router';
import { MetaService } from 'src/app/common/services/meta.service';

export default [
  {
    path: 'price',
    resolve: { metaDescription: () => inject(MetaService).setPriceTrackerMeta() },
    loadChildren: () => import('./price-tracker/price-tracker.routes'),
  },
  {
    path: 'xp',
    resolve: { metaDescription: () => inject(MetaService).setXpTrackerMeta() },
    loadChildren: () => import('./xp-tracker/xp-tracker.routes'),
  },
] as Route[];
