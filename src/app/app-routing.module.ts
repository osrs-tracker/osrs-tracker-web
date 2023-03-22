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
      {
        path: 'xp-tracker',
        loadChildren: () => import('./features/xp-tracker/xp-tracker.module').then(m => m.XpTrackerModule),
      },
      {
        title: 'Privacy - OSRS Tracker',
        path: 'privacy',
        pathMatch: 'full',
        loadChildren: () => import('./features/privacy/privacy.module').then(m => m.PrivacyModule),
      },
      {
        title: 'Terms - OSRS Tracker',
        path: 'terms',
        pathMatch: 'full',
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
