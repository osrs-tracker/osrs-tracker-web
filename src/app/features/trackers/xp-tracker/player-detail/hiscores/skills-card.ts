import { Component, inject, input, output } from '@angular/core';
import { HiscoreEntry } from '@osrs-tracker/models';
import { Segmented, SegmentedOption } from '@app/common/ui/controls/segmented';
import { LoadError } from '@app/common/ui/loading/load-error';
import { BOSS_LAYOUT, RAID_LAYOUT } from '../activity-categories';
import { PlayerView, TopTab } from '../player-view';
import { ActivityGrid } from './activity-grid';
import { OtherGrids } from './other-grids';
import { SkillGrid } from './skill-grid';

const TABS: SegmentedOption<TopTab>[] = [
  { value: 'skills', label: 'Skills' },
  { value: 'bosses', label: 'Bosses' },
  { value: 'raids', label: 'Raids' },
  { value: 'other', label: 'Other', title: 'Clues and minigames' },
];

@Component({
  selector: 'article[skills-card]',
  imports: [ActivityGrid, LoadError, OtherGrids, Segmented, SkillGrid],
  template: `
    <div class="flex items-center min-h-14 px-5 py-1.5 border-b border-line">
      <segmented
        class="grow"
        stretch
        label="Hiscores category"
        [options]="tabs"
        [value]="playerView.top()"
        (picked)="playerView.showTop($event)"
      />
    </div>
    <!-- The grids run to the card's edges: its cells already have edges, a gutter around them is wasted width -->
    @if (failed()) {
      <div class="p-5">
        <load-error source="player-hiscore" message="Couldn't load the hiscores." (retry)="retry.emit()" />
      </div>
    } @else {
      @switch (playerView.top()) {
        @case ('skills') {
          <skill-grid [hiscore]="hiscore()" [gains]="skillGains()" />
        }
        @case ('bosses') {
          <activity-grid
            view="bosses"
            scoreLabel="Kill count"
            [layout]="bossLayout"
            [hiscore]="hiscore()"
            [gains]="activityGains()"
          />
        }
        @case ('raids') {
          <activity-grid
            view="raids"
            scoreLabel="Completed"
            [layout]="raidLayout"
            [hiscore]="hiscore()"
            [gains]="activityGains()"
          />
        }
        @case ('other') {
          <other-grids
            [username]="username()"
            [hiscore]="hiscore()"
            [gains]="activityGains()"
            [minigame]="minigame()"
          />
        }
      }
    }
  `,
  host: {
    class: 'min-w-0 rounded-2xl bg-card overflow-hidden',
  },
})
export class SkillsCard {
  readonly playerView = inject(PlayerView);

  readonly username = input.required<string>();
  /** `undefined` while the hiscores load */
  readonly hiscore = input.required<HiscoreEntry | undefined>();
  readonly skillGains = input.required<ReadonlyMap<string, number>>();
  readonly activityGains = input.required<ReadonlyMap<string, number>>();
  readonly minigame = input<string>();
  /** Neither the live hiscores nor a stored entry could be loaded */
  readonly failed = input(false);
  readonly retry = output();

  readonly tabs: SegmentedOption<TopTab>[] = TABS;
  readonly bossLayout: (string | null)[] = BOSS_LAYOUT;
  readonly raidLayout: (string | null)[] = RAID_LAYOUT;
}
