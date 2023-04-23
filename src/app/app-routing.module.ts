import { NgModule, inject } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MetaService } from './services/meta.service';
import { RootLayoutComponent } from './standalone/root-layout/root-layout.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'prefix',
    component: RootLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        resolve: { metaDescription: () => inject(MetaService).setDefaultMeta() },
        loadChildren: () => import('./features/home/home.module').then(m => m.HomeModule),
      },
      {
        path: 'trackers',
        pathMatch: 'prefix',
        children: [
          {
            path: 'price',
            resolve: { metaDescription: () => inject(MetaService).setPriceTrackerMeta() },
            loadChildren: () =>
              import('./features/trackers/price-tracker/price-tracker.module').then(m => m.PriceTrackerModule),
          },
          {
            path: 'xp',
            resolve: { metaDescription: () => inject(MetaService).setXpTrackerMeta() },
            loadChildren: () => import('./features/trackers/xp-tracker/xp-tracker.module').then(m => m.XpTrackerModule),
          },
        ],
      },
      {
        path: 'about',
        pathMatch: 'prefix',
        resolve: { metaDescription: () => inject(MetaService).setDefaultMeta() },
        children: [
          {
            path: 'privacy',
            loadChildren: () => import('./features/about/privacy/privacy.module').then(m => m.PrivacyModule),
          },
          {
            path: 'terms',
            loadChildren: () => import('./features/about/terms/terms.module').then(m => m.TermsModule),
          },
        ],
      },
      {
        path: '**',
        title: '404 Not Found - OSRS Tracker',
        resolve: { metaDescription: () => inject(MetaService).setDefaultMeta() },
        loadComponent: () =>
          import('./standalone/components/not-found-404/not-found-404.component').then(c => c.NotFound404Component),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
