import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { IconDirective } from 'src/app/standalone/components/icon/icon.component';
import { SpinnerComponent } from 'src/app/standalone/components/spinner/spinner.component';
import { CapitalizeWordsPipe } from 'src/app/standalone/pipes/capitalize.pipe';
import { DateOrdinalPipe } from 'src/app/standalone/pipes/date-ordinal.pipe';
import { PlayerXpWidgetComponent } from './components/player-xp-widget/player-xp-widget.component';
import { PlayerDetailsWidgetComponent } from './player-details/player-details-widget/player-details-widget.component';
import { PlayerDetailsComponent } from './player-details/player-details.component';
import { playerDetailsResolver } from './player-details/player-details.resolver';
import { playerDetailsTitleResolver } from './player-details/player-details.title-resolver';
import { PlayerLogsComponent } from './player-details/player-logs/player-logs.component';
import { XpTrackerComponent } from './xp-tracker.component';

@NgModule({
  imports: [
    SharedModule,
    FormsModule,
    RouterModule.forChild([
      {
        title: 'XP Tracker - OSRS Tracker',
        path: '',
        pathMatch: 'full',
        component: XpTrackerComponent,
      },
      {
        title: playerDetailsTitleResolver,
        path: ':username',
        component: PlayerDetailsComponent,
        resolve: { player: playerDetailsResolver },
      },
    ]),

    // Standalone
    CapitalizeWordsPipe,
    DateOrdinalPipe,
    IconDirective,
    SpinnerComponent,
  ],
  declarations: [
    XpTrackerComponent,
    PlayerDetailsComponent,
    PlayerLogsComponent,
    PlayerDetailsWidgetComponent,
    PlayerXpWidgetComponent,
  ],
})
export class XpTrackerModule {}
