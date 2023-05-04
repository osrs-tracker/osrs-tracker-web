import { DecimalPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit, WritableSignal, signal } from '@angular/core';
import { Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { forkJoin } from 'rxjs';
import { SpinnerComponent } from 'src/app/common/components/spinner.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { CapitalizePipe } from 'src/app/common/pipes/capitalize.pipe';
import { SkillEnum } from 'src/app/common/services/hiscores/hiscore.enum';
import { HiscoreService } from 'src/app/common/services/hiscores/hiscore.service';
import { OsrsProxyRepo } from 'src/app/common/services/repositories/osrs-proxy.repo';
import { OsrsTrackerRepo } from 'src/app/common/services/repositories/osrs-tracker.repo';

@Component({
  standalone: true,
  selector: 'player-widget',
  template: `
    <article
      class="
        flex rounded text-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white
        cursor-pointer ring-2 ring-transparent hover:ring-emerald-500 dark:hover:ring-emerald-400
      "
    >
      <div class="flex-1 flex items-center justify-between  rounded-l bg-slate-300 dark:bg-slate-700 px-4 py-2">
        <h3>{{ username | capitalizeWords }}</h3>
        <div *ngIf="playerDetails()" class="relative flex items-center rounded-full gap-2">
          <img
            *ngIf="playerDetails()!.type !== PlayerType.Normal"
            icon
            [name]="playerDetails()!.status === PlayerStatus.Default ? playerDetails()!.type : playerDetails()!.status"
            class="h-6 w-6"
          />
          <img *ngIf="playerDetails()!.diedAsHardcore" icon name="dead" class="h-6 w-6" />
        </div>
      </div>
      <div class="flex-1 flex items-center justify-end px-4 py-2">
        <spinner *ngIf="loading(); else content" />
        <ng-template #content>
          <div *ngIf="overallDiff() === null; else diff">&mdash;</div>
          <ng-template #diff>
            <div>+&nbsp;{{ overallDiff() | number }}&nbsp;XP</div>
            <img icon [name]="SkillEnum.Overall" class="w-5 h-5 ml-2 mb-1" />
          </ng-template>
        </ng-template>
      </div>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, CapitalizePipe, DecimalPipe, IconDirective, SpinnerComponent],
})
export class PlayerWidgetComponent implements OnInit {
  readonly PlayerType: typeof PlayerType = PlayerType;
  readonly PlayerStatus: typeof PlayerStatus = PlayerStatus;
  readonly SkillEnum: typeof SkillEnum = SkillEnum;

  loading = signal(true);

  playerDetails: WritableSignal<Player | null> = signal(null);
  overallDiff: WritableSignal<number | null> = signal(null);

  @Input() username: string;

  constructor(
    private hiscoreService: HiscoreService,
    private osrsProxyRepo: OsrsProxyRepo,
    private osrsTrackerRepo: OsrsTrackerRepo,
  ) {}

  ngOnInit(): void {
    forkJoin([
      this.osrsProxyRepo.getPlayerHiscore(this.username),
      this.osrsTrackerRepo.getPlayerInfo(this.username, { includeLatestHiscoreEntry: true }),
    ]).subscribe(([hiscore, player]) => {
      this.playerDetails.set(player);

      if (player.hiscoreEntries?.length) {
        this.overallDiff.set(this.hiscoreService.getOverallXpDiff(hiscore, player.hiscoreEntries[0]));
      }

      this.loading.set(false);
    });
  }
}
