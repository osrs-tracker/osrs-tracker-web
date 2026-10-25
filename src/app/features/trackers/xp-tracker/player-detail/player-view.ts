import { inject, Service, signal } from '@angular/core';
import { SkillEnum } from '@osrs-tracker/models';
import { AnalyticsService } from '@app/common/analytics/analytics-service';

export type TopTab = 'skills' | 'bosses' | 'raids';
export type BottomTab = 'clues' | 'minigames';
export type ChartView = TopTab | BottomTab;
export type ActivityView = Exclude<ChartView, 'skills'>;
export type Period = 7 | 30 | 60 | 90;

@Service({ autoProvided: false })
export class PlayerView {
  private readonly analyticsService = inject(AnalyticsService);

  readonly top = signal<TopTab>('skills');
  readonly bottom = signal<BottomTab>('clues');
  readonly chart = signal<ChartView>('skills');
  readonly period = signal<Period>(7);
  /** Apart from the chart's period; 7 is what the page loads first */
  readonly milestonePeriod = signal<Period>(7);

  readonly skills = signal<ReadonlySet<string>>(new Set([SkillEnum.Overall]));
  readonly hidden = signal<ReadonlySet<string>>(new Set());
  readonly minigame = signal<string | undefined>(undefined);

  setPeriod(period: Period): void {
    this.period.set(period);
    this.analyticsService.trackOption('chart_period', period);
  }

  setMilestonePeriod(period: Period): void {
    this.milestonePeriod.set(period);
    this.analyticsService.trackOption('milestone_period', period);
  }

  showTop(tab: TopTab): void {
    this.analyticsService.trackOption('hiscores_tab', tab);
    this.top.set(tab);
    this.showChart(tab);
  }

  showBottom(tab: BottomTab): void {
    this.analyticsService.trackOption('hiscores_tab', tab);
    this.bottom.set(tab);
    this.showChart(tab);
  }

  toggleSkill(skill: string): void {
    if (skill === SkillEnum.Overall) this.setSkills(new Set());
    else this.setSkills(toggled(new Set([...this.skills()].filter(name => name !== SkillEnum.Overall)), skill));

    if (this.skills().has(skill)) this.analyticsService.trackOption('chart_skill', skill);
  }

  setSkills(skills: ReadonlySet<string>): void {
    this.skills.set(skills.size ? skills : new Set([SkillEnum.Overall]));
    this.chart.set('skills');
  }

  keepSkills(gains: ReadonlyMap<string, number>): void {
    const kept = [...this.skills()].filter(name => name === SkillEnum.Overall || gains.has(name));
    if (kept.length < this.skills().size) this.skills.set(new Set(kept.length ? kept : [SkillEnum.Overall]));
  }

  pickActivity(view: ActivityView, activity: string): void {
    if (view === 'minigames') {
      this.minigame.set(activity);
      this.chart.set(view);
    } else if (this.chart() === view) {
      this.hidden.update(hidden => toggled(hidden, activity));
    } else {
      this.showChart(view);
    }

    if (!this.hidden().has(activity)) this.analyticsService.trackOption('chart_activity', activity);
  }

  private showChart(view: ChartView): void {
    this.chart.set(view);
    this.hidden.set(new Set());
  }
}

function toggled(set: ReadonlySet<string>, name: string): ReadonlySet<string> {
  const next = new Set(set);
  if (!next.delete(name)) next.add(name);
  return next;
}
