import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  /** Ends the text with a link to the How it works page */
  howItWorks?: boolean;
}

@Component({
  selector: 'player-logs',
  templateUrl: './player-logs.html',
  host: { class: 'flex flex-col gap-6' },
  imports: [DatePipe, DecimalPipe, Icon, RouterLink, ShortDatePipe, Skeleton],
})
export class PlayerLogs {
  readonly SkillEnum: typeof SkillEnum = SkillEnum;
  /** The loading card's date: today's gains are dated by the live hiscores, not by the last check like until then */
  readonly now: Date = new Date();

  readonly diffs = input.required<Gains[]>();
  readonly loading = input(false);
  readonly todayLoading = input(false);
  readonly todaySince = input<string>();
  readonly notice = input<LogNotice>();

  readonly groups = computed(() => dayLogGroups(this.diffs(), this.todayLoading(), this.todaySince()));
}
