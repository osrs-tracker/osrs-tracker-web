import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  Injector,
  InputSignal,
  OnInit,
  Signal,
  WritableSignal,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { SkillEnum, getOverallXpDiff } from '@osrs-tracker/hiscores';
import { Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { EMPTY, catchError, forkJoin } from 'rxjs';
import { SpinnerComponent } from 'src/app/common/components/general/spinner.component';
import { TooltipComponent } from 'src/app/common/components/general/tooltip/tooltip.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { CapitalizePipe } from 'src/app/common/pipes/capitalize.pipe';
import { TimeAgoPipe } from 'src/app/common/pipes/time-ago.pipe';
import { OsrsProxyRepo } from 'src/app/common/repositories/osrs-proxy.repo';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';
import { AnalyticsService } from 'src/app/common/services/analytics/analytics.service';
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
        <h3 class="flex">
          {{ _username() | capitalizeWords }}
        </h3>
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
      <div class="flex-1 flex px-4 py-2 justify-end">
        <div class="flex items-center">
          @if (loading()) {
            <spinner />
          } @else {
            @if (overallDiff() === null) {
              &mdash;
            } @else {
              <div [tooltip]="!!this.player()" [tooltipTemplate]="tooltip">
                +&nbsp;{{ overallDiff() | number }}&nbsp;XP
              </div>
              <ng-template #tooltip>
                The XP for this player is calculated since they were last scraped, which is
                {{ this.player()?.hiscoreEntries?.[0]?.date | timeAgo }}.
              </ng-template>

              <img class="w-5 h-5 ml-2 mb-1" icon [name]="SkillEnum.Overall" />
            }
          }
        </div>
      </div>
    </article>
  `,
  imports: [CapitalizePipe, DecimalPipe, TimeAgoPipe, IconDirective, SpinnerComponent, TooltipComponent],
})
export class PlayerWidgetComponent implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly injector = inject(Injector);
  private readonly osrsProxyRepo = inject(OsrsProxyRepo);
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly xpTrackerStorageService = inject(XpTrackerStorageService);

  readonly PlayerType: typeof PlayerType = PlayerType;
  readonly PlayerStatus: typeof PlayerStatus = PlayerStatus;
  readonly SkillEnum: typeof SkillEnum = SkillEnum;

  readonly username: InputSignal<string | null> = input<string | null>(null);
  readonly player: InputSignal<Player | null> = input<Player | null>(null);
  readonly scrapingOffset: InputSignal<number> = input.required();

  readonly _username: Signal<string> = computed(() => (this.player()?.username ?? this.username())!);
  readonly formattedOffset: Signal<string> = computed(() => {
    const offset = this.player()?.hiscoreEntries?.[0]?.scrapingOffset ?? this.scrapingOffset();
    return offset > 0 ? `+${offset}` : offset.toString();
  });

  readonly playerDetails: WritableSignal<Player | null> = signal(null);
  readonly overallDiff: WritableSignal<number | null> = signal(null);

  readonly loading = signal(true);

  constructor() {
    afterNextRender(() =>
      runInInjectionContext(this.injector, () => {
        effect(() => this.username() && this.fetchFromUsername(this.username()!));
        effect(() => this.player() && (this.playerDetails.set(this.player()), this.fetchFromPlayer(this.player()!)));
      }),
    );
  }

  ngOnInit(): void {
    if (this.player() === null && this.username() === null) {
      throw new Error('Either player or username must be provided');
    }
  }

  private fetchFromUsername(username: string): void {
    this.loading.set(true);

    forkJoin([
      this.osrsProxyRepo.getPlayerHiscore(username, this.scrapingOffset()),
      this.osrsTrackerRepo.getPlayerInfo(username, this.scrapingOffset(), { includeLatestHiscoreEntry: true }),
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

  private fetchFromPlayer(player: Player): void {
    this.loading.set(true);

    this.osrsProxyRepo.getPlayerHiscore(player.username, this.scrapingOffset()).subscribe(hiscore => {
      this.overallDiff.set(getOverallXpDiff(hiscore, player.hiscoreEntries![0]));
      this.loading.set(false);
    });
  }

  private removeMissingPlayer(): void {
    if (this.xpTrackerStorageService.getRecentPlayers().includes(this._username())) {
      this.xpTrackerStorageService.removeRecentPlayer(this._username());
    }

    if (this.xpTrackerStorageService.getFavoritePlayers().includes(this._username())) {
      this.xpTrackerStorageService.toggleFavoritePlayer(this._username());
    }

    this.analyticsService.trackEvent('remove-missing-player', 'xp-tracker', this._username(), true);

    this.changeDetectorRef.markForCheck();
  }
}
