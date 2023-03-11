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
        loadChildren: () => import('./features/home/home.module').then((m) => m.HomeModule),
      },
      {
        path: 'price-tracker',
        pathMatch: 'full',
        loadChildren: () => import('./features/coming-soon/coming-soon.module').then((m) => m.ComingSoonModule),
      },
      {
        path: 'xp-tracker',
        pathMatch: 'full',
        loadChildren: () => import('./features/coming-soon/coming-soon.module').then((m) => m.ComingSoonModule),
      },
      {
        path: 'privacy',
        pathMatch: 'full',
        loadChildren: () => import('./features/coming-soon/coming-soon.module').then((m) => m.ComingSoonModule),
      },
      {
        path: 'terms',
        pathMatch: 'full',
        loadChildren: () => import('./features/coming-soon/coming-soon.module').then((m) => m.ComingSoonModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
