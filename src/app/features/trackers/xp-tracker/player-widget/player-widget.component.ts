import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges, WritableSignal, signal } from '@angular/core';
import { SkillEnum, getOverallXpDiff } from '@osrs-tracker/hiscores';
import { Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { forkJoin } from 'rxjs';
import { SpinnerComponent } from 'src/app/common/components/general/spinner.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { CapitalizePipe } from 'src/app/common/pipes/capitalize.pipe';
import { OsrsProxyRepo } from 'src/app/common/repositories/osrs-proxy.repo';
import { OsrsTrackerRepo } from 'src/app/common/repositories/osrs-tracker.repo';

@Component({
  standalone: true,
  selector: 'player-widget',
  template: `
    <article
      class="
        flex rounded text-lg font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white
        cursor-pointer ring-2 ring-transparent hover:ring-emerald-500 dark:hover:ring-emerald-400
      "
    >
      <div class="flex-1 flex items-center justify-between  rounded-l bg-slate-300 dark:bg-slate-700 px-4 py-2">
        <h3>{{ username | capitalizeWords }}</h3>
        @if (playerDetails()) {
          <div class="relative flex items-center rounded-full gap-2">
            @if (playerDetails()!.type !== PlayerType.Normal) {
              <img
                icon
                [name]="
                  playerDetails()!.status === PlayerStatus.Default ? playerDetails()!.type : playerDetails()!.status
                "
                class="h-6 w-6"
              />
            }
            @if (playerDetails()!.diedAsHardcore) {
              <img icon name="dead" class="h-6 w-6" />
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
            <img icon [name]="SkillEnum.Overall" class="w-5 h-5 ml-2 mb-1" />
          }
        }
      </div>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CapitalizePipe, DecimalPipe, IconDirective, SpinnerComponent],
})
export class PlayerWidgetComponent implements OnChanges {
  readonly PlayerType: typeof PlayerType = PlayerType;
  readonly PlayerStatus: typeof PlayerStatus = PlayerStatus;
  readonly SkillEnum: typeof SkillEnum = SkillEnum;

  loading = signal(true);

  playerDetails: WritableSignal<Player | null> = signal(null);
  overallDiff: WritableSignal<number | null> = signal(null);

  @Input() username: string;
  @Input() scrapingOffset: number;

  constructor(
    private osrsProxyRepo: OsrsProxyRepo,
    private osrsTrackerRepo: OsrsTrackerRepo,
  ) {}

  ngOnChanges(): void {
    this.loading.set(true);

    forkJoin([
      this.osrsProxyRepo.getPlayerHiscore(this.username, this.scrapingOffset),
      this.osrsTrackerRepo.getPlayerInfo(this.username, this.scrapingOffset, { includeLatestHiscoreEntry: true }),
    ]).subscribe(([hiscore, player]) => {
      this.playerDetails.set(player);

      if (player.hiscoreEntries?.length) {
        this.overallDiff.set(getOverallXpDiff(hiscore, player.hiscoreEntries[0]));
      }

      this.loading.set(false);
    });
  }
}
