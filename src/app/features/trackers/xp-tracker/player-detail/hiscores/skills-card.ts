import { Component, inject, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { HiscoreEntry } from '@osrs-tracker/models';
import { Segmented, SegmentedOption } from '@app/common/ui/controls/segmented';
import { LoadError } from '@app/common/ui/loading/load-error';
import { BOSS_LAYOUT, RAID_LAYOUT } from '../activity-categories';
import { PlayerView, TopTab } from '../player-view';
import { ActivityGrid } from './activity-grid';
import { SkillGrid } from './skill-grid';

const TABS: SegmentedOption<TopTab>[] = [
  { value: 'skills', label: 'Skills' },
  { value: 'bosses', label: 'Bosses' },
  { value: 'raids', label: 'Raids' },
];

/** The player page's main hiscores card: skills, bosses or raids, whichever tab `PlayerView` has open. */
@Component({
  selector: 'article[skills-card]',
  imports: [ActivityGrid, LoadError, Segmented, SkillGrid],
  template: `
    <div class="flex items-center min-h-14 px-4 py-1.5 border-b border-line">
      <segmented
        class="grow"
        stretch
        label="Hiscores category"
        [options]="tabs"
        [value]="playerView.top()"
        (valueChange)="playerView.showTop($event)"
      />
    </div>
    <div class="px-4 pt-4">
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
    class: 'min-w-0 pb-4 rounded-2xl bg-card overflow-hidden',
  },
})
export class SkillsCard {
  readonly playerView = inject(PlayerView);

  /** `undefined` while the hiscores load */
  readonly hiscore: InputSignal<HiscoreEntry | undefined> = input.required();
  readonly skillGains: InputSignal<ReadonlyMap<string, number>> = input.required();
  readonly activityGains: InputSignal<ReadonlyMap<string, number>> = input.required();
  /** Neither the live hiscores nor a stored entry could be loaded */
  readonly failed: InputSignal<boolean> = input(false);
  readonly retry: OutputEmitterRef<void> = output();

  readonly tabs: SegmentedOption<TopTab>[] = TABS;
  readonly bossLayout: (string | null)[] = BOSS_LAYOUT;
  readonly raidLayout: (string | null)[] = RAID_LAYOUT;
}
