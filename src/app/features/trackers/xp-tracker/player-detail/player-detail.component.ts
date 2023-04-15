import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Player } from '@osrs-tracker/models';
import { forkJoin } from 'rxjs';
import { trackChanges } from 'src/app/core/decorators/track-changes.decorator';
import { Hiscore } from 'src/app/services/hiscores/hiscore.model';
import { HiscoreService } from 'src/app/services/hiscores/hiscore.service';
import { OsrsProxyRepo } from 'src/app/services/repositories/osrs-proxy.repo';
import { OsrsTrackerRepo } from 'src/app/services/repositories/osrs-tracker.repo';
import { XpTrackerService } from '../xp-tracker.service';

@Component({
  selector: 'player-detail',
  templateUrl: './player-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerDetailComponent implements OnInit {
  @trackChanges today: Hiscore;
  @trackChanges history: Hiscore[];

  get playerDetail(): Player {
    return this.activatedRoute.snapshot.data['player'];
  }

  constructor(
    private activatedRoute: ActivatedRoute,
    public cdRef: ChangeDetectorRef,
    private hiscoreService: HiscoreService,
    private osrsProxyRepo: OsrsProxyRepo,
    private osrsTrackerRepo: OsrsTrackerRepo,
    private xpTrackerService: XpTrackerService,
  ) {}

  ngOnInit(): void {
    if (!this.playerDetail) return;

    this.getPlayerHiscores();
    this.xpTrackerService.pushRecentPlayer(this.playerDetail.username);
  }

  getPlayerHiscores(scrapingOffset?: number, skip?: number): void {
    forkJoin([
      this.osrsProxyRepo.getPlayerHiscore(this.playerDetail!.username), // current hiscore
      this.osrsTrackerRepo.getPlayerHiscores(this.playerDetail!.username, scrapingOffset, skip), // scraped Hiscores
    ]).subscribe(([currentHiscore, scrapedHiscores]) => {
      this.today = this.hiscoreService.parseHiscores([currentHiscore])[0];
      this.history = this.hiscoreService.parseHiscores(scrapedHiscores);
    });
  }
}
