import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import { XpTrackerService } from './xp-tracker.service';

@Component({
  selector: 'xp-tracker',
  templateUrl: './xp-tracker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class XpTrackerComponent {
  loading: boolean;
  username: string;

  get favoritePlayers(): string[] {
    return this.xpTrackerService.getFavoritePlayers();
  }

  get recentPlayers(): string[] {
    return this.xpTrackerService.getRecentPlayers();
  }

  constructor(private cdRef: ChangeDetectorRef, private router: Router, private xpTrackerService: XpTrackerService) {}

  searchUser(username: string) {
    if (!username) return;

    this.setLoading(true);

    this.router.navigate(['/trackers/xp', username]);
  }

  private setLoading(loading: boolean) {
    this.loading = loading;
    this.cdRef.detectChanges();
  }
}
