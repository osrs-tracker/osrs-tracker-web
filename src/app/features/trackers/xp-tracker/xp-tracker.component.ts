import { DecimalPipe } from '@angular/common';
import { Component, ResourceRef, WritableSignal, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Player } from '@osrs-tracker/models';
import { TooltipComponent } from 'src/app/common/components/general/tooltip/tooltip.component';
import { PageHeaderComponent } from 'src/app/common/components/layout/page-header.component';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { SpinnerComponent } from '../../../common/components/general/spinner.component';
import { PlayerWidgetComponent } from './player-widget/player-widget.component';
import { XpTrackerStorageService } from './xp-tracker-storage.service';

@Component({
  selector: 'xp-tracker',
  templateUrl: './xp-tracker.component.html',
  imports: [
    DecimalPipe,
    FormsModule,
    RouterLink,
    TooltipComponent,
    PageHeaderComponent,
    PlayerWidgetComponent,
    SpinnerComponent,
  ],
})
export default class XpTrackerComponent {
  readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  readonly xpTrackerStorageService = inject(XpTrackerStorageService);

  readonly SCRAPING_OFFSETS = Array.from({ length: 24 }, (_, i) => i - 12); // -12 to 11
  readonly scrapingOffset: WritableSignal<number> = signal(this.xpTrackerStorageService.getScrapingOffset());

  readonly usernameQuery: WritableSignal<string> = signal('');

  get favoritePlayers(): string[] {
    return this.xpTrackerStorageService.getFavoritePlayers();
  }

  get recentPlayers(): string[] {
    return this.xpTrackerStorageService.getRecentPlayers();
  }

  readonly recentPlayerLookups: ResourceRef<Player[]> = rxResource({
    loader: () => this.osrsTrackerRepo.getRecentPlayerLookups(),
    defaultValue: [],
  });

  constructor() {
    effect(() => this.xpTrackerStorageService.setScrapingOffset(this.scrapingOffset()));
  }

  updateScrapingOffset(offset: number): void {
    this.scrapingOffset.set(offset);
  }
}
