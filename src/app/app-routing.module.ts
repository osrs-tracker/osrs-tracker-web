import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotFound404Component } from './standalone/pages/not-found-404.component';
import { RootLayoutComponent } from './standalone/pages/root-layout/root-layout.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'prefix',
    component: RootLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadChildren: () => import('./features/home/home.module').then(m => m.HomeModule),
      },
      {
        path: 'trackers',
        pathMatch: 'prefix',
        children: [
          {
            path: 'price',
            loadChildren: () =>
              import('./features/trackers/price-tracker/price-tracker.module').then(m => m.PriceTrackerModule),
          },
          {
            path: 'xp',
            loadChildren: () => import('./features/trackers/xp-tracker/xp-tracker.module').then(m => m.XpTrackerModule),
          },
        ],
      },
      {
        path: 'about',
        pathMatch: 'prefix',
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
        component: NotFound404Component,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
