import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  InputSignal,
  OnChanges,
  WritableSignal,
  inject,
  input,
  signal,
} from '@angular/core';
import { SkillEnum, getOverallXpDiff } from '@osrs-tracker/hiscores';
import { Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { EMPTY, catchError, forkJoin } from 'rxjs';
import { SpinnerComponent } from 'src/app/common/components/general/spinner.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { CapitalizePipe } from 'src/app/common/pipes/capitalize.pipe';
import { OsrsProxyRepo } from 'src/app/common/repositories/osrs-proxy.repo';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { GoogleAnalyticsService } from 'src/app/common/services/google-analytics.service';
import { XpTrackerStorageService } from '../xp-tracker-storage.service';

@Component({
  selector: 'player-widget',
  template: `
    <article
      class="
        flex rounded text-lg font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white
        cursor-pointer ring-2 ring-transparent hover:ring-emerald-500 dark:hover:ring-emerald-400
      "
    >
      <div class="flex-1 flex items-center justify-between  rounded-l bg-slate-300 dark:bg-slate-700 px-4 py-2">
        <h3>{{ username() | capitalizeWords }}</h3>
        @if (playerDetails()) {
          <div class="relative flex items-center rounded-full gap-2">
            @if (playerDetails()!.type !== PlayerType.Normal) {
              <img
                class="h-6 w-6"
                icon
                [name]="
                  playerDetails()!.status === PlayerStatus.Default ? playerDetails()!.type : playerDetails()!.status
                "
              />
            }
            @if (playerDetails()!.diedAsHardcore) {
              <img class="h-6 w-6" icon name="dead" />
            }
          </div>
        }
      </div>
      <div class="flex-1 flex items-center justify-end px-4 py-2">
        @if (loading()) {
          <spinner />
        } @else {
          @if (overallDiff() === null) {
            &mdash;
          } @else {
            <div>+&nbsp;{{ overallDiff() | number }}&nbsp;XP</div>
            <img class="w-5 h-5 ml-2 mb-1" icon [name]="SkillEnum.Overall" />
          }
        }
      </div>
    </article>
  `,
  imports: [CapitalizePipe, DecimalPipe, IconDirective, SpinnerComponent],
})
export class PlayerWidgetComponent implements OnChanges {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly googlAnalyticsService = inject(GoogleAnalyticsService);
  private readonly osrsProxyRepo = inject(OsrsProxyRepo);
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly xpTrackerStorageService = inject(XpTrackerStorageService);

  readonly PlayerType: typeof PlayerType = PlayerType;
  readonly PlayerStatus: typeof PlayerStatus = PlayerStatus;
  readonly SkillEnum: typeof SkillEnum = SkillEnum;

  readonly loading = signal(true);

  readonly playerDetails: WritableSignal<Player | null> = signal(null);
  readonly overallDiff: WritableSignal<number | null> = signal(null);

  readonly username: InputSignal<string> = input.required();
  readonly scrapingOffset: InputSignal<number> = input.required();

  ngOnChanges(): void {
    this.loading.set(true);

    forkJoin([
      this.osrsProxyRepo.getPlayerHiscore(this.username(), this.scrapingOffset()),
      this.osrsTrackerRepo.getPlayerInfo(this.username(), this.scrapingOffset(), { includeLatestHiscoreEntry: true }),
    ])
      .pipe(
        catchError(err => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            this.removeMissingPlayer();
          }
          return EMPTY;
        }),
      )
      .subscribe(([hiscore, player]) => {
        this.playerDetails.set(player);

        if (player.hiscoreEntries?.length) {
          this.overallDiff.set(getOverallXpDiff(hiscore, player.hiscoreEntries[0]));
        }

        this.loading.set(false);
      });
  }

  private removeMissingPlayer(): void {
    if (this.xpTrackerStorageService.getRecentPlayers().includes(this.username())) {
      this.xpTrackerStorageService.removeRecentPlayer(this.username());
    }

    if (this.xpTrackerStorageService.getFavoritePlayers().includes(this.username())) {
      this.xpTrackerStorageService.toggleFavoritePlayer(this.username());
    }

    this.googlAnalyticsService.trackEvent('remove-missing-player', 'xp-tracker', this.username(), true);

    this.changeDetectorRef.markForCheck();
  }
}
