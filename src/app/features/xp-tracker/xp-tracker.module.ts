import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { SpinnerComponent } from 'src/app/standalone/spinner.component';
import { PlayerDetailsComponent } from './player-details/player-details.component';
import { playerDetailsResolver } from './player-details/player-details.resolver';
import { PlayerLogsComponent } from './player-details/player-logs/player-logs.component';
import { PlayerWidgetComponent } from './player-details/player-widget/player-widget.component';
import { XpTrackerComponent } from './xp-tracker.component';

@NgModule({
  imports: [
    SharedModule,
    FormsModule,
    RouterModule.forChild([
      { path: '', pathMatch: 'full', component: XpTrackerComponent },
      { path: ':username', component: PlayerDetailsComponent, resolve: { player: playerDetailsResolver } },
    ]),
    // Standalone
    SpinnerComponent,
  ],
  declarations: [XpTrackerComponent, PlayerDetailsComponent, PlayerLogsComponent, PlayerWidgetComponent],
})
export class XpTrackerModule {}
