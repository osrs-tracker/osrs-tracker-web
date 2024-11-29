import { Component, DestroyRef, OnInit, Signal, WritableSignal, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Hiscore, parseHiscores } from '@osrs-tracker/hiscores';
import { Player } from '@osrs-tracker/models';
import { finalize, forkJoin } from 'rxjs';
import { SpinnerComponent } from 'src/app/common/components/general/spinner.component';
import { PlayerSkillsWidgetComponent } from 'src/app/common/components/player/player-skills.component';
import { OsrsProxyRepo } from 'src/app/common/repositories/osrs-proxy.repo';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { XpTrackerStorageService } from '../xp-tracker-storage.service';
import { PlayerDetailWidgetComponent } from './player-detail-widget/player-detail-widget.component';
import { PlayerLogsComponent } from './player-logs/player-logs.component';

@Component({
  selector: 'player-detail',
  templateUrl: './player-detail.component.html',
  imports: [PlayerSkillsWidgetComponent, PlayerDetailWidgetComponent, PlayerLogsComponent, SpinnerComponent],
})
export default class PlayerDetailComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly osrsProxyRepo = inject(OsrsProxyRepo);
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly xpTrackerStorageService = inject(XpTrackerStorageService);

  #DEFAULT_SIZE = 14;
  #MORE_SIZE = 7;

  readonly #historyEntries: WritableSignal<Hiscore[][]> = signal([]);

  readonly today: WritableSignal<Hiscore | undefined> = signal(undefined);
  readonly history: Signal<Hiscore[]> = computed(() => this.#historyEntries().flat());

  readonly loadingMore: WritableSignal<boolean> = signal(false);
  readonly hasMoreEntries: WritableSignal<boolean> = signal(false);

  readonly playerDetail = input.required<Player>({ alias: 'player' });

  ngOnInit(): void {
    const playerDetail = this.playerDetail();
    if (!playerDetail) return;

    this.loadInitialHiscores();
    this.xpTrackerStorageService.pushRecentPlayer(playerDetail.username);
  }

  loadInitialHiscores(): void {
    forkJoin([
      this.osrsProxyRepo.getPlayerHiscore(
        this.playerDetail()!.username,
        this.xpTrackerStorageService.getScrapingOffset(),
      ), // current hiscore
      this.osrsTrackerRepo.getPlayerHiscores(
        this.playerDetail()!.username,
        this.xpTrackerStorageService.getScrapingOffset(),
        this.#DEFAULT_SIZE,
        0,
      ), // scraped Hiscores
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([currentHiscore, scrapedHiscores]) => {
        this.today.set(parseHiscores([currentHiscore])[0]);
        this.#historyEntries.update(entries => [...entries, parseHiscores(scrapedHiscores)]);

        this.hasMoreEntries.set(scrapedHiscores.length === this.#DEFAULT_SIZE);
      });
  }

  loadMore(): void {
    this.loadingMore.set(true);

    this.osrsTrackerRepo
      .getPlayerHiscores(
        this.playerDetail()!.username,
        this.xpTrackerStorageService.getScrapingOffset(),
        this.#MORE_SIZE,
        this.history().flat().length,
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingMore.set(false)),
      )
      .subscribe(scrapedHiscores => {
        this.#historyEntries.update(entries => [...entries, parseHiscores(scrapedHiscores)]),
          this.hasMoreEntries.set(scrapedHiscores.length === this.#MORE_SIZE);
      });
  }
}
