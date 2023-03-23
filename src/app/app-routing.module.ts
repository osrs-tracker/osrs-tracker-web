import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RootLayoutComponent } from './core/root-layout/root-layout.component';

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
        title: 'Price Tracker - OSRS Tracker',
        path: 'price-tracker',
        loadChildren: () => import('./features/coming-soon/coming-soon.module').then(m => m.ComingSoonModule),
      },
      // {
      //   path: 'price-tracker',
      //   loadChildren: () => import('./features/price-tracker/price-tracker.module').then(m => m.PriceTrackerModule),
      // },
      {
        path: 'xp-tracker',
        loadChildren: () => import('./features/xp-tracker/xp-tracker.module').then(m => m.XpTrackerModule),
      },
      {
        path: 'privacy',
        loadChildren: () => import('./features/privacy/privacy.module').then(m => m.PrivacyModule),
      },
      {
        path: 'terms',
        loadChildren: () => import('./features/terms/terms.module').then(m => m.TermsModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
