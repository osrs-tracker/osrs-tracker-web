import { Component, inject, input, output } from '@angular/core';
import { HiscoreEntry } from '@osrs-tracker/models';
import { Segmented, SegmentedOption } from '@app/common/ui/controls/segmented';
import { LoadError } from '@app/common/ui/loading/load-error';
import { InfoTooltip } from '@app/common/ui/tooltip/info-tooltip';
import { BOSS_LAYOUT, RAID_LAYOUT } from '../activity-categories';
import { PlayerView, TopTab } from '../player-view';
import { ActivityGrid } from './activity-grid';
import { SkillGrid } from './skill-grid';

const TABS: SegmentedOption<TopTab>[] = [
  { value: 'skills', label: 'Skills' },
  { value: 'bosses', label: 'Bosses' },
  { value: 'raids', label: 'Raids' },
];

@Component({
  selector: 'article[skills-card]',
  imports: [ActivityGrid, InfoTooltip, LoadError, Segmented, SkillGrid],
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
      @if (!failed()) {
        <info-tooltip label="About the coloured rings"
          ><ng-template>{{ ringTip[playerView.top()] }}</ng-template></info-tooltip
        >
      }
    </div>
    <div class="px-5 pt-5">
      @if (failed()) {
        <load-error source="player-hiscore" message="Couldn't load the hiscores." (retry)="retry.emit()" />
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
        }
      }
    </div>
  `,
  host: {
    class: 'min-w-0 pb-5 rounded-2xl bg-card overflow-hidden',
  },
})
export class SkillsCard {
  readonly playerView = inject(PlayerView);

  readonly ringTip: Record<TopTab, string> = {
    skills: 'A coloured ring marks a skill that gained XP in these days: pick it to show it on the chart.',
    bosses: 'A coloured ring marks a boss killed in these days: pick it to show it on the chart.',
    raids: 'A coloured ring marks a raid completed in these days: pick it to show it on the chart.',
  };

  /** `undefined` while the hiscores load */
  readonly hiscore = input.required<HiscoreEntry | undefined>();
  readonly skillGains = input.required<ReadonlyMap<string, number>>();
  readonly activityGains = input.required<ReadonlyMap<string, number>>();
  /** Neither the live hiscores nor a stored entry could be loaded */
  readonly failed = input(false);
  readonly retry = output();

  readonly tabs: SegmentedOption<TopTab>[] = TABS;
  readonly bossLayout: (string | null)[] = BOSS_LAYOUT;
  readonly raidLayout: (string | null)[] = RAID_LAYOUT;
}
