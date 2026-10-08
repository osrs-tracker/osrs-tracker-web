import { Service, signal, WritableSignal } from '@angular/core';
import { SkillEnum } from '@osrs-tracker/hiscores';
import { toggled } from './player-logs/log-chart-options';

export type TopTab = 'skills' | 'bosses' | 'raids';
export type BottomTab = 'clues' | 'minigames';
/** What the chart shows: XP, or one activity category */
export type ChartView = TopTab | BottomTab;
export type ActivityView = Exclude<ChartView, 'skills'>;
/** Days the chart and the stat tiles cover */
export type Period = 7 | 30 | 60;

/**
 * What the player page shows: the tab of each hiscores card and what the chart follows, the last chartable pick (a tab,
 * a skill or an activity). Provided by the player page.
 */
@Service({ autoProvided: false })
export class PlayerView {
  readonly top: WritableSignal<TopTab> = signal('skills');
  readonly bottom: WritableSignal<BottomTab> = signal('clues');
  readonly chart: WritableSignal<ChartView> = signal('skills');
  readonly period: WritableSignal<Period> = signal(7);

  /** Overall alone, or the skills being compared */
  readonly skills: WritableSignal<ReadonlySet<string>> = signal(new Set([SkillEnum.Overall]));
  /** Activities of the charted category that are hidden */
  readonly hidden: WritableSignal<ReadonlySet<string>> = signal(new Set());
  /** The charted minigame, one at a time; until one is picked, the chart shows the first with gains */
  readonly minigame: WritableSignal<string | undefined> = signal(undefined);

  showTop(tab: TopTab): void {
    this.top.set(tab);
    this.showChart(tab);
  }

  showBottom(tab: BottomTab): void {
    this.bottom.set(tab);
    this.showChart(tab);
  }

  /** Overall is exclusive; deselecting the last skill goes back to Overall */
  toggleSkill(skill: string): void {
    if (skill === SkillEnum.Overall) return this.setSkills(new Set());
    this.setSkills(toggled(new Set([...this.skills()].filter(name => name !== SkillEnum.Overall)), skill));
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
  }

  private showChart(view: ChartView): void {
    this.chart.set(view);
    this.hidden.set(new Set());
  }
}
