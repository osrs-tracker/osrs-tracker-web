import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, InputSignal, Signal } from '@angular/core';
import { hiscoreDiff, SkillEnum } from '@osrs-tracker/hiscores';
import { HiscoreEntry, HiscoreSkill, Player } from '@osrs-tracker/models';
import { isToday } from 'date-fns';
import { CardComponent } from 'src/app/common/components/general/card.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { ShortDatePipe } from 'src/app/common/pipes/date-fns.pipe';
import { XpTrackerViewType } from '../../xp-tracker-view-type';
import { XpTrackerStore } from '../../xp-tracker.store';

/** A single day's diff, or a run of consecutive days in which nothing happened. */
type LogGroup = { type: 'day'; diff: HiscoreEntry } | { type: 'empty'; from: Date; to: Date; days: number };

@Component({
  selector: 'player-logs',
  templateUrl: './player-logs.component.html',
  imports: [CardComponent, DecimalPipe, IconDirective, ShortDatePipe],
})
export class PlayerLogsComponent {
  private readonly XpTrackerStore = inject(XpTrackerStore);

  readonly XpTrackerViewType: typeof XpTrackerViewType = XpTrackerViewType;
  readonly SkillEnum: typeof SkillEnum = SkillEnum;
  readonly xpTrackerViewType = this.XpTrackerStore.viewType;

  readonly playerDetail: InputSignal<Player> = input.required();

  get isPlayerTracked(): boolean {
    return !!this.playerDetail().scrapingOffsets?.length;
  }

  readonly today: InputSignal<HiscoreEntry | undefined> = input();
  readonly history: InputSignal<HiscoreEntry[]> = input.required();

  readonly hiscoreDiffs: Signal<HiscoreEntry[]> = computed(() => {
    let previousHiscore = this.today() ?? this.history()[0];

    return this.history()!.map(hiscore => {
      const diff = hiscoreDiff(previousHiscore, hiscore);
      previousHiscore = hiscore;
      return diff;
    });
  });

  readonly skillLogs: Signal<LogGroup[]> = computed(() =>
    this.groupEmptyDays(this.hiscoreDiffs(), diff => this.hasXpDiff(diff)),
  );

  readonly otherLogs: Signal<LogGroup[]> = computed(() =>
    this.groupEmptyDays(this.hiscoreDiffs(), diff => this.hasActivityDiff(diff)),
  );

  /** Merges runs of 2+ consecutive empty days into one group. Today always keeps its own card. */
  private groupEmptyDays(diffs: HiscoreEntry[], hasDiff: (diff: HiscoreEntry) => boolean): LogGroup[] {
    const groups: LogGroup[] = [];
    let run: HiscoreEntry[] = [];

    const flushRun = (): void => {
      if (run.length === 1) groups.push({ type: 'day', diff: run[0] });
      else if (run.length > 1)
        groups.push({ type: 'empty', from: run[run.length - 1].date, to: run[0].date, days: run.length });
      run = [];
    };

    diffs.forEach(diff => {
      if (hasDiff(diff) || isToday(new Date(diff.date))) {
        flushRun();
        groups.push({ type: 'day', diff });
      } else {
        run.push(diff);
      }
    });
    flushRun();

    return groups;
  }

  overall(hiscore: HiscoreEntry): HiscoreSkill | undefined {
    return hiscore.skills.find(skill => skill.name === SkillEnum.Overall);
  }

  hasXpDiff(hiscore: HiscoreEntry): boolean {
    return hiscore.skills.some(skill => skill.xp > 0);
  }

  hasActivityDiff(hiscore: HiscoreEntry): boolean {
    return hiscore.activities.some(activity => activity.score > 0);
  }

  setView(viewType: XpTrackerViewType): void {
    this.XpTrackerStore.setViewType(viewType);
  }
}
