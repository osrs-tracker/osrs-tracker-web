import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from 'src/app/common/components/page-header.component';
import { PlayerWidgetComponent } from './player-widget/player-widget.component';
import { XpTrackerService } from './xp-tracker.service';

@Component({
  standalone: true,
  selector: 'xp-tracker',
  templateUrl: './xp-tracker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, NgFor, FormsModule, RouterLink, PageHeaderComponent, PlayerWidgetComponent],
})
export default class XpTrackerComponent {
  username: string;

  get favoritePlayers(): string[] {
    return this.xpTrackerService.getFavoritePlayers();
  }

  get recentPlayers(): string[] {
    return this.xpTrackerService.getRecentPlayers();
  }

  constructor(private xpTrackerService: XpTrackerService) {}

  trackByUsername(_index: number, username: string): string {
    return username;
  }
}
