import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Player } from '@osrs-tracker/models';
import { forkJoin } from 'rxjs';
import { Hiscore } from 'src/app/services/hiscores/hiscore.model';
import { HiscoreService } from 'src/app/services/hiscores/hiscore.service';
import { OsrsProxyRepo } from 'src/app/services/repositories/osrs-proxy.repo';
import { OsrsTrackerRepo } from 'src/app/services/repositories/osrs-tracker.repo';
import { XpTrackerService } from '../xp-tracker.service';

@Component({
  selector: 'player-details',
  templateUrl: './player-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerDetailsComponent implements OnInit {
  today: Hiscore;
  history: Hiscore[] = [];

  get playerDetails(): Player | null {
    return this.activatedRoute.snapshot.data['player'];
  }

  constructor(
    private activatedRoute: ActivatedRoute,
    private cdRef: ChangeDetectorRef,
    private hiscoreService: HiscoreService,
    private osrsProxyRepo: OsrsProxyRepo,
    private osrsTrackerRepo: OsrsTrackerRepo,
    private xpTrackerService: XpTrackerService,
  ) {}

  ngOnInit(): void {
    if (!this.playerDetails) return;

    this.getPlayerHiscores();
    this.xpTrackerService.pushRecentPlayer(this.playerDetails.username);
  }

  getPlayerHiscores(scrapingOffset?: number, skip?: number): void {
    forkJoin([
      this.osrsProxyRepo.getPlayerHiscore(this.playerDetails!.username), // current hiscore
      this.osrsTrackerRepo.getPlayerHiscores(this.playerDetails!.username, scrapingOffset, skip), // scraped Hiscores
    ]).subscribe(([currentHiscore, scrapedHiscores]) => {
      this.today = this.hiscoreService.parseHiscores([currentHiscore])[0];
      this.history = this.hiscoreService.parseHiscores(scrapedHiscores ?? []);

      this.cdRef.markForCheck();
    });
  }
}
