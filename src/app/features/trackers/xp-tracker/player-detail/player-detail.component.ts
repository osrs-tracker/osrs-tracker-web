import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  Signal,
  WritableSignal,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Hiscore, parseHiscores } from '@osrs-tracker/hiscores';
import { Player } from '@osrs-tracker/models';
import { finalize } from 'rxjs';
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
  private readonly platformId = inject(PLATFORM_ID);

  readonly #DEFAULT_SIZE = 14;
  readonly #MORE_SIZE = 7;
  readonly #historyEntries: WritableSignal<Hiscore[][]> = signal([]);

  readonly player = input.required<Player>();

  readonly today: WritableSignal<Hiscore | undefined> = signal(undefined);
  readonly history: Signal<Hiscore[]> = computed(() => this.#historyEntries().flat());

  readonly loadingMore: WritableSignal<boolean> = signal(false);
  readonly hasMoreEntries: WritableSignal<boolean> = signal(false);

  ngOnInit(): void {
    this.loadInitialHiscores();
    if (isPlatformBrowser(this.platformId)) {
      this.getPlayerHiscore();
      this.xpTrackerStorageService.pushRecentPlayer(this.player().username);
    }
  }

  loadInitialHiscores(): void {
    this.osrsTrackerRepo
      .getPlayerHiscores(
        this.player()!.username,
        this.xpTrackerStorageService.getScrapingOffset(),
        this.#DEFAULT_SIZE,
        0,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(scrapedHiscores => {
        this.#historyEntries.update(entries => [...entries, parseHiscores(scrapedHiscores)]);
        this.hasMoreEntries.set(scrapedHiscores.length === this.#DEFAULT_SIZE);
      });
  }

  getPlayerHiscore(): void {
    this.osrsProxyRepo
      .getPlayerHiscore(this.player()!.username, this.xpTrackerStorageService.getScrapingOffset())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(currentHiscore => {
        this.today.set(parseHiscores([currentHiscore])[0]);
      });
  }

  loadMore(): void {
    this.loadingMore.set(true);

    this.osrsTrackerRepo
      .getPlayerHiscores(
        this.player()!.username,
        this.xpTrackerStorageService.getScrapingOffset(),
        this.#MORE_SIZE,
        this.history().flat().length,
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingMore.set(false)),
      )
      .subscribe(scrapedHiscores => {
        this.#historyEntries.update(entries => [...entries, parseHiscores(scrapedHiscores)]);
        this.hasMoreEntries.set(scrapedHiscores.length === this.#MORE_SIZE);
      });
  }
}
