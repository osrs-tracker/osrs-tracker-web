import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input, InputSignal, Signal } from '@angular/core';
import { ActivityEnum, SkillEnum } from '@osrs-tracker/hiscores';
import { HiscoreActivity, HiscoreEntry, HiscoreSkill } from '@osrs-tracker/models';
import { SkeletonComponent } from 'src/app/common/components/general/skeleton.component';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';
import { ShortDatePipe } from 'src/app/common/pipes/date-fns.pipe';

/** A day with gains, or a run of consecutive days in which nothing happened. */
type LogGroup =
  | { type: 'day'; date: Date; overall?: HiscoreSkill; skills: HiscoreSkill[]; activities: HiscoreActivity[] }
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

  /** The daily diffs, newest first; empty while they load */
  readonly diffs: InputSignal<HiscoreEntry[]> = input.required();
  readonly loading: InputSignal<boolean> = input(false);
  /** Shown instead of the days while there are none: tracking just started, or the player isn't tracked */
  readonly notice: InputSignal<LogNotice | undefined> = input();

  readonly groups: Signal<LogGroup[]> = computed(() => {
    const groups: LogGroup[] = [];
    let run: Date[] = [];

    // merges each run of consecutive empty days (including a single day) into one group
    const flushRun = (): void => {
      if (run.length) groups.push({ type: 'empty', from: run[run.length - 1], to: run[0], days: run.length });
      run = [];
    };

    this.diffs().forEach(diff => {
      const skills = diff.skills.filter(skill => skill.xp > 0 && skill.name !== SkillEnum.Overall);
      // the total of all clue tiers would count them twice
      const activities = diff.activities.filter(
        activity => activity.score > 0 && activity.name !== ActivityEnum.ClueScrollsAll,
      );

      if (!skills.length && !activities.length) {
        run.push(diff.date);
      } else {
        flushRun();
        const overall = diff.skills.find(skill => skill.name === SkillEnum.Overall);
        groups.push({ type: 'day', date: diff.date, overall, skills, activities });
      }
    });
    flushRun();

    return groups;
  });
}
