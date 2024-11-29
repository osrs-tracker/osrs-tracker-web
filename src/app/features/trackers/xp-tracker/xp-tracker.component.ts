import { DecimalPipe } from '@angular/common';
import { Component, WritableSignal, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TooltipComponent } from 'src/app/common/components/general/tooltip/tooltip.component';
import { PageHeaderComponent } from 'src/app/common/components/layout/page-header.component';
import { PlayerWidgetComponent } from './player-widget/player-widget.component';
import { XpTrackerStorageService } from './xp-tracker-storage.service';

@Component({
  selector: 'xp-tracker',
  templateUrl: './xp-tracker.component.html',
  imports: [DecimalPipe, FormsModule, RouterLink, TooltipComponent, PageHeaderComponent, PlayerWidgetComponent],
})
export default class XpTrackerComponent {
  readonly xpTrackerStorageService = inject(XpTrackerStorageService);

  readonly SCRAPING_OFFSETS = Array.from({ length: 24 }, (_, i) => i - 12); // -12 to 11

  readonly scrapingOffset: WritableSignal<number> = signal(this.xpTrackerStorageService.getScrapingOffset());

  usernameQuery: string;

  get favoritePlayers(): string[] {
    return this.xpTrackerStorageService.getFavoritePlayers();
  }

  get recentPlayers(): string[] {
    return this.xpTrackerStorageService.getRecentPlayers();
  }

  constructor() {
    effect(() => this.xpTrackerStorageService.setScrapingOffset(this.scrapingOffset()));
  }

  updateScrapingOffset(offset: number): void {
    this.scrapingOffset.set(offset);
  }
}
