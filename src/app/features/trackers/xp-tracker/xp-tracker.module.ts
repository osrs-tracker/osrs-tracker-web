import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SpinnerComponent } from 'src/app/standalone/components/spinner/spinner.component';
import { IconDirective } from 'src/app/standalone/directives/icon/icon.directive';
import { CapitalizePipe } from 'src/app/standalone/pipes/capitalize.pipe';
import { DateOrdinalPipe } from 'src/app/standalone/pipes/date-ordinal.pipe';
import { PlayerXpWidgetComponent } from './components/player-xp-widget/player-xp-widget.component';
import { PlayerDetailWidgetComponent } from './player-detail/player-detail-widget/player-detail-widget.component';
import { PlayerDetailComponent } from './player-detail/player-detail.component';
import { playerDetailResolver } from './player-detail/player-detail.resolver';
import { playerDetailTitleResolver } from './player-detail/player-detail.title-resolver';
import { PlayerLogsComponent } from './player-detail/player-logs/player-logs.component';
import { XpTrackerComponent } from './xp-tracker.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([
      {
        title: 'XP Tracker - OSRS Tracker',
        path: '',
        pathMatch: 'full',
        component: XpTrackerComponent,
      },
      {
        title: playerDetailTitleResolver,
        path: ':username',
        component: PlayerDetailComponent,
        resolve: { player: playerDetailResolver },
      },
    ]),

    // Standalone
    CapitalizePipe,
    DateOrdinalPipe,
    IconDirective,
    SpinnerComponent,
  ],
  declarations: [
    XpTrackerComponent,
    PlayerDetailComponent,
    PlayerLogsComponent,
    PlayerDetailWidgetComponent,
    PlayerXpWidgetComponent,
  ],
})
export class XpTrackerModule {}
