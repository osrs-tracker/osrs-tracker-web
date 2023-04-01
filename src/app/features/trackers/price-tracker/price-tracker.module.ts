import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { IconDirective } from 'src/app/standalone/components/icon/icon.directive';
import { SpinnerComponent } from 'src/app/standalone/components/spinner/spinner.component';
import { ItemDetailComponent } from './item-detail/item-detail.component';
import { itemDetailResolver } from './item-detail/item-detail.resolver';
import { itemDetailTitleResolver } from './item-detail/item-detail.title-resolver';
import { PriceTrackerComponent } from './price-tracker.component';

@NgModule({
  imports: [
    SharedModule,
    FormsModule,
    RouterModule.forChild([
      {
        title: 'Price Tracker - OSRS Tracker',
        path: '',
        pathMatch: 'full',
        component: PriceTrackerComponent,
      },
      {
        title: itemDetailTitleResolver,
        path: ':id',
        pathMatch: 'full',
        component: ItemDetailComponent,
        resolve: { item: itemDetailResolver },
      },
    ]),

    // Standalone
    IconDirective,
    SpinnerComponent,
  ],
  declarations: [PriceTrackerComponent],
})
export class PriceTrackerModule {}
