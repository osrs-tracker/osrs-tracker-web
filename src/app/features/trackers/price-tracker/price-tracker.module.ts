import {} from '@angular/cdk';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SpinnerComponent } from 'src/app/standalone/components/spinner/spinner.component';
import { InfoTooltipComponent } from 'src/app/standalone/components/tooltip/info-tooltip.component';
import { TooltipComponent } from 'src/app/standalone/components/tooltip/tooltip.component';
import { IconDirective } from 'src/app/standalone/directives/icon/icon.directive';
import { TimeAgoPipe } from 'src/app/standalone/pipes/time-ago.pipe';
import { ItemAnalyticsComponent } from './item-detail/item-analytics/item-analytics.component';
import { ItemDetailWidgetComponent } from './item-detail/item-detail-widget/item-detail.widget.component';
import { ItemDetailComponent } from './item-detail/item-detail.component';
import { itemDetailResolver } from './item-detail/item-detail.resolver';
import { itemDetailTitleResolver } from './item-detail/item-detail.title-resolver';
import { PriceTrackerComponent } from './price-tracker.component';
import { ItemWidgetComponent } from './item-widget/item-widget.component';

@NgModule({
  imports: [
    CommonModule,
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
    TimeAgoPipe,
    TooltipComponent,
    InfoTooltipComponent,
  ],
  declarations: [
    PriceTrackerComponent,
    ItemAnalyticsComponent,
    ItemDetailComponent,
    ItemWidgetComponent,
    ItemDetailWidgetComponent,
  ],
})
export class PriceTrackerModule {}
