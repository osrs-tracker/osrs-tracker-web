import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Player } from '@osrs-tracker/models';
import { forkJoin } from 'rxjs';
import { Hiscore } from 'src/app/services/hiscores/hiscore.model';
import { HiscoreService } from 'src/app/services/hiscores/hiscore.service';
import { OsrsProxyRepo } from 'src/app/services/repositories/osrs-proxy.repo';
import { OsrsTrackerRepo } from 'src/app/services/repositories/osrs-tracker.repo';

@Component({
  selector: 'player-details',
  templateUrl: './player-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerDetailsComponent implements OnInit {
  get playerDetails(): Player | null {
    return this.activatedRoute.snapshot.data['player'];
  }

  today: Hiscore;
  history: Hiscore[] = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    private cdRef: ChangeDetectorRef,
    private hiscoreService: HiscoreService,
    private osrsProxyRepo: OsrsProxyRepo,
    private osrsTrackerRepo: OsrsTrackerRepo,
  ) {}

  ngOnInit(): void {
    if (this.playerDetails) {
      this.getPlayerHiscores();
    }
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
