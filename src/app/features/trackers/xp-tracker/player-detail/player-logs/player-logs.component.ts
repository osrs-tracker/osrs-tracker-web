import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input, InputSignal, Signal } from '@angular/core';
import { ActivityEnum, SkillEnum } from '@osrs-tracker/hiscores';
import { HiscoreDiffActivity, HiscoreDiffSkill } from '@osrs-tracker/models';
import { addDays } from 'date-fns';
import { SkeletonComponent } from 'src/app/common/components/general/skeleton.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { ShortDatePipe } from 'src/app/common/pipes/date-fns.pipe';
import { Gains } from '../player-summary';

/**
 * A day with gains (or the days a gap in the history covers, `to` its last), or a run of consecutive days in which
 * nothing happened.
 */
type LogGroup =
  | {
      type: 'day';
      date: Date;
      to?: Date;
      /** Today's gains so far: the hour they count from */
      since?: string;
      overall?: HiscoreDiffSkill;
      skills: (HiscoreDiffSkill & { name: string })[];
      activities: (HiscoreDiffActivity & { name: string })[];
    }
  | { type: 'empty'; from: Date; to: Date; days: number };

export interface LogNotice {
  date: Date;
  label: string;
  text: string;
}

/** The day log: per day the XP, levels and activity scores gained, newest first. */
@Component({
  selector: 'player-logs',
  templateUrl: './player-logs.component.html',
  host: { class: 'flex flex-col gap-6' },
  imports: [DatePipe, DecimalPipe, IconDirective, ShortDatePipe, SkeletonComponent],
})
export class PlayerLogsComponent {
  readonly SkillEnum: typeof SkillEnum = SkillEnum;
  /** The loading card's date: today's gains are dated by the live hiscores, not by the last check like until then */
  readonly now: Date = new Date();

  /** The daily diffs, newest first; empty while they load */
  readonly diffs: InputSignal<Gains[]> = input.required();
  readonly loading: InputSignal<boolean> = input(false);
  /** The live hiscores are loading: today's gains (the first diff) aren't known yet, so it's a skeleton until then */
  readonly todayLoading: InputSignal<boolean> = input(false);
  /** The hour today's gains count from (the first diff), unless the live hiscores failed and there are none */
  readonly todaySince: InputSignal<string | undefined> = input();
  /** Shown instead of the days while there are none: tracking just started, or the player isn't tracked */
  readonly notice: InputSignal<LogNotice | undefined> = input();

  readonly groups: Signal<LogGroup[]> = computed(() => {
    const groups: LogGroup[] = [];
    let run: Extract<LogGroup, { type: 'empty' }> | undefined;

    // merges each run of consecutive empty days (including a single day) into one group
    const flushRun = (): void => {
      if (run) groups.push(run);
      run = undefined;
    };

    const diffs = this.todayLoading() ? this.diffs().slice(1) : this.diffs();
    diffs.forEach((diff, i) => {
      const skills = Object.entries(diff.skills)
        .map(([name, skill]) => ({ name, ...skill }))
        .filter(skill => skill.xp > 0 && skill.name !== SkillEnum.Overall);
      // the total of all clue tiers would count them twice
      const activities = Object.entries(diff.activities)
        .map(([name, activity]) => ({ name, ...activity }))
        .filter(activity => activity.score > 0 && activity.name !== ActivityEnum.ClueScrollsAll);

      const to = diff.days > 1 ? addDays(diff.date, diff.days - 1) : undefined;

      if (!skills.length && !activities.length) {
        // newest first, so each diff extends the run back
        run = { type: 'empty', from: diff.date, to: run?.to ?? to ?? diff.date, days: (run?.days ?? 0) + diff.days };
      } else {
        flushRun();
        const overall = diff.skills[SkillEnum.Overall];
        // not on gains across a gap, which reach back before today
        const since = i === 0 && !to && !this.todayLoading() ? this.todaySince() : undefined;
        groups.push({ type: 'day', date: diff.date, to, since, overall, skills, activities });
      }
    });
    flushRun();

    return groups;
  });
}
