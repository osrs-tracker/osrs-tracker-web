import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { PlayerDetailsComponent } from './player-details/player-details.component';
import { playerDetailsResolver } from './player-details/player-details.resolver';
import { XpTrackerComponent } from './xp-tracker.component';

@NgModule({
  imports: [
    SharedModule,
    FormsModule,
    RouterModule.forChild([
      { path: '', pathMatch: 'full', component: XpTrackerComponent },
      { path: ':username', component: PlayerDetailsComponent, resolve: { player: playerDetailsResolver } },
    ]),
  ],
  declarations: [XpTrackerComponent, PlayerDetailsComponent],
})
export class XpTrackerModule {}
