import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { SpinnerComponent } from 'src/app/standalone/components/spinner/spinner.component';
import { PriceTrackerComponent } from './price-tracker.component';

@NgModule({
  imports: [
    SharedModule,
    FormsModule,
    RouterModule.forChild([
      { title: 'Price Tracker - OSRS Tracker', path: '', pathMatch: 'full', component: PriceTrackerComponent },
    ]),

    // Standalone
    SpinnerComponent,
  ],
  declarations: [PriceTrackerComponent],
})
export class PriceTrackerModule {}
