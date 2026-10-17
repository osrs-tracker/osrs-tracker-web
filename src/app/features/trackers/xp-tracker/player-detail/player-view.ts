import { inject, Service, signal } from '@angular/core';
import { SkillEnum } from '@osrs-tracker/hiscores';
import { AnalyticsService } from '@app/common/analytics/analytics-service';

export type TopTab = 'skills' | 'bosses' | 'raids';
export type BottomTab = 'clues' | 'minigames';
/** What the chart shows: XP, or one activity category */
export type ChartView = TopTab | BottomTab;
export type ActivityView = Exclude<ChartView, 'skills'>;
/** Days the chart and the stat tiles cover */
export type Period = 7 | 30 | 60 | 90;

/**
 * What the player page shows: the tab of each hiscores card and what the chart follows, the last chartable pick (a tab,
 * a skill or an activity). Provided by the player page.
 */
@Service({ autoProvided: false })
export class PlayerView {
  private readonly analyticsService = inject(AnalyticsService);

  readonly top = signal<TopTab>('skills');
  readonly bottom = signal<BottomTab>('clues');
  readonly chart = signal<ChartView>('skills');
  readonly period = signal<Period>(7);
  /** Days the milestones card averages each skill's XP over, apart from the chart's; 7 is what the page loads first */
  readonly milestonePeriod = signal<Period>(7);

  /** Overall alone, or the skills being compared */
  readonly skills = signal<ReadonlySet<string>>(new Set([SkillEnum.Overall]));
  /** Activities of the charted category that are hidden */
  readonly hidden = signal<ReadonlySet<string>>(new Set());
  /** The charted minigame, one at a time; until one is picked, the chart shows the first with gains */
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

  /** Overall is exclusive; deselecting the last skill goes back to Overall */
  toggleSkill(skill: string): void {
    if (skill === SkillEnum.Overall) this.setSkills(new Set());
    else this.setSkills(toggled(new Set([...this.skills()].filter(name => name !== SkillEnum.Overall)), skill));

    if (this.skills().has(skill)) this.analyticsService.trackOption('chart_skill', skill);
  }

  /** Compares these skills; none goes back to Overall */
  setSkills(skills: ReadonlySet<string>): void {
    this.skills.set(skills.size ? skills : new Set([SkillEnum.Overall]));
    this.chart.set('skills');
  }

  /** Drops the picked skills without gains; Overall stays */
  keepSkills(gains: ReadonlyMap<string, number>): void {
    const kept = [...this.skills()].filter(name => name === SkillEnum.Overall || gains.has(name));
    if (kept.length < this.skills().size) this.skills.set(new Set(kept.length ? kept : [SkillEnum.Overall]));
  }

  /** An activity with gains: toggles its series when its category is charted, or charts its category */
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

/** A copy of the set with the name added, or removed if it was in it */
function toggled(set: ReadonlySet<string>, name: string): ReadonlySet<string> {
  const next = new Set(set);
  if (!next.delete(name)) next.add(name);
  return next;
}
