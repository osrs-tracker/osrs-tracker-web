import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { SkillEnum } from '@osrs-tracker/models';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { Icon } from '@app/common/icon/icon';
import { ShortDatePipe } from './charts/short-date-pipe';
import { dayLogGroups } from './day-log-groups';
import { Gains } from './player-summary';

export interface LogNotice {
  date: Date;
  label: string;
  text: string;
}

/** The day log: per day the XP, levels and activity scores gained, newest first. */
@Component({
  selector: 'player-logs',
  templateUrl: './player-logs.html',
  host: { class: 'flex flex-col gap-6' },
  imports: [DatePipe, DecimalPipe, Icon, ShortDatePipe, Skeleton],
})
export class PlayerLogs {
  readonly SkillEnum: typeof SkillEnum = SkillEnum;
  /** The loading card's date: today's gains are dated by the live hiscores, not by the last check like until then */
  readonly now: Date = new Date();

  /** The daily diffs, newest first; empty while they load */
  readonly diffs = input.required<Gains[]>();
  readonly loading = input(false);
  /** The live hiscores are loading: today's gains (the first diff) aren't known yet, so it's a skeleton until then */
  readonly todayLoading = input(false);
  /** The hour today's gains count from (the first diff), unless the live hiscores failed and there are none */
  readonly todaySince = input<string>();
  /** Shown instead of the days while there are none: tracking just started, or the player isn't tracked */
  readonly notice = input<LogNotice>();

  readonly groups = computed(() => dayLogGroups(this.diffs(), this.todayLoading(), this.todaySince()));
}
