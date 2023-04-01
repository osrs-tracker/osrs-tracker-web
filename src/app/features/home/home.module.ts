// standard angular home module
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { HomeComponent } from './home.component';
import { OsrsNewsCardComponent } from './osrs-news-card/osrs-news-card.component';

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild([
      {
        title: 'Home - OSRS Tracker',
        path: '',
        pathMatch: 'full',
        component: HomeComponent,
      },
    ]),
  ],
  declarations: [HomeComponent, OsrsNewsCardComponent],
})
export class HomeModule {}
