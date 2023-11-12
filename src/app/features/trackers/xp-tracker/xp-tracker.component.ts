import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, WritableSignal, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from 'src/app/common/components/page-header.component';
import { InfoTooltipComponent } from 'src/app/common/components/tooltip/info-tooltip.component';
import { TooltipComponent } from 'src/app/common/components/tooltip/tooltip.component';
import { PlayerWidgetComponent } from './player-widget/player-widget.component';
import { XpTrackerStorageService } from './xp-tracker-storage.service';

@Component({
  standalone: true,
  selector: 'xp-tracker',
  templateUrl: './xp-tracker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    FormsModule,
    RouterLink,
    TooltipComponent,
    InfoTooltipComponent,
    PageHeaderComponent,
    PlayerWidgetComponent,
  ],
})
export default class XpTrackerComponent {
  readonly SCRAPING_OFFSETS = Array.from({ length: 24 }, (_, i) => i - 12); // -12 to 11

  username: string;
  scrapingOffset: WritableSignal<number>;

  get favoritePlayers(): string[] {
    return this.xpTrackerStorageService.getFavoritePlayers();
  }

  get recentPlayers(): string[] {
    return this.xpTrackerStorageService.getRecentPlayers();
  }

  constructor(private xpTrackerStorageService: XpTrackerStorageService) {
    this.scrapingOffset = signal(this.xpTrackerStorageService.getScrapingOffset());

    effect(() => this.xpTrackerStorageService.setScrapingOffset(this.scrapingOffset()));
  }

  updateScrapingOffset(offset: number): void {
    this.scrapingOffset.set(offset);
  }

  trackByUsername(_index: number, username: string): string {
    return username;
  }
}
