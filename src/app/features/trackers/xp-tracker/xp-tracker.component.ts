import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MetaService } from 'src/app/services/meta.service';
import { XpTrackerService } from './xp-tracker.service';

@Component({
  selector: 'xp-tracker',
  templateUrl: './xp-tracker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class XpTrackerComponent implements OnInit {
  username: string;

  get favoritePlayers(): string[] {
    return this.xpTrackerService.getFavoritePlayers();
  }

  get recentPlayers(): string[] {
    return this.xpTrackerService.getRecentPlayers();
  }

  constructor(private router: Router, private metaService: MetaService, private xpTrackerService: XpTrackerService) {}

  ngOnInit(): void {
    this.metaService.setXpTrackerMeta();
  }

  searchUser(username: string) {
    if (!username) return;

    this.router.navigate(['/trackers/xp', username]);
  }

  trackByUsername(_index: number, username: string): string {
    return username;
  }
}
