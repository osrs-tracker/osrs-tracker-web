import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, WritableSignal, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Player } from '@osrs-tracker/models';
import { forkJoin } from 'rxjs';
import { OsrsProxyRepo } from 'src/app/repositories/osrs-proxy.repo';
import { OsrsTrackerRepo } from 'src/app/repositories/osrs-tracker.repo';
import { XpTrackerService } from '../xp-tracker.service';
import { PlayerDetailWidgetComponent } from './player-detail-widget/player-detail-widget.component';
import { PlayerLogsComponent } from './player-logs/player-logs.component';
import { Hiscore, parseHiscores } from '@osrs-tracker/hiscores';

@Component({
  standalone: true,
  selector: 'player-detail',
  templateUrl: './player-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlayerDetailWidgetComponent, PlayerLogsComponent],
})
export default class PlayerDetailComponent implements OnInit {
  today: WritableSignal<Hiscore | undefined> = signal(undefined);
  history: WritableSignal<Hiscore[] | undefined> = signal(undefined);

  @Input('player') playerDetail: Player;

  constructor(
    private destroyRef: DestroyRef,
    private osrsProxyRepo: OsrsProxyRepo,
    private osrsTrackerRepo: OsrsTrackerRepo,
    private xpTrackerService: XpTrackerService,
  ) {}

  ngOnInit(): void {
    if (!this.playerDetail) return;

    this.getPlayerHiscores();
    this.xpTrackerService.pushRecentPlayer(this.playerDetail.username);
  }

  getPlayerHiscores(scrapingOffset?: number, size?: number, skip?: number): void {
    forkJoin([
      this.osrsProxyRepo.getPlayerHiscore(this.playerDetail!.username), // current hiscore
      this.osrsTrackerRepo.getPlayerHiscores(this.playerDetail!.username, scrapingOffset, size, skip), // scraped Hiscores
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([currentHiscore, scrapedHiscores]) => {
        this.today.set(parseHiscores([currentHiscore])[0]);
        this.history.set(parseHiscores(scrapedHiscores));
      });
  }
}
