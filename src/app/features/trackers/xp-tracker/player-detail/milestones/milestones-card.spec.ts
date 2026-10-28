import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HiscoreEntry, HiscoreSkill, SkillEnum } from '@osrs-tracker/models';
import { beforeEach, describe, expect, it } from 'vitest';
import { GTAG_TOKEN } from '@app/common/analytics/gtag-token';
import { localIcons } from '@app/common/icon/local-icons.generated';
import { LOCAL_ICONS } from '@app/common/icon/local-icons-token';
import { PlayerView } from '../player-view';
import { MilestonesCard } from './milestones-card';

const DAY = 24 * 60 * 60 * 1000;

const entry = (daysAgo: number, skills: Record<string, [level: number, xp: number]>): HiscoreEntry => ({
  date: new Date(Date.UTC(2026, 9, 17) - daysAgo * DAY),
  scrapingOffset: 0,
  skills: Object.fromEntries(
    Object.entries(skills).map(([name, [level, xp]]): [string, HiscoreSkill] => [name, { level, xp, rank: 1 }]),
  ),
  activities: {},
});

/** Seven skills at 99 gaining XP over the last week, so 200M has more rows than are shown at first */
const SKILLS = [
  SkillEnum.Attack,
  SkillEnum.Strength,
  SkillEnum.Defence,
  SkillEnum.Ranged,
  SkillEnum.Magic,
  SkillEnum.Slayer,
  SkillEnum.Hunter,
];
const week = (): HiscoreEntry[] => [
  entry(0, Object.fromEntries(SKILLS.map((name, i) => [name, [99, 20_000_000 + i]]))),
  entry(7, Object.fromEntries(SKILLS.map((name, i) => [name, [99, 19_000_000 + i]]))),
];

@Component({
  selector: 'host',
  template: `<milestones-card
    username="zezima"
    [current]="entries()[0]"
    [entries]="entries()"
    [loaded]="true"
    [lastCheckedAt]="entries()[0].date"
  />`,
  imports: [MilestonesCard],
  providers: [PlayerView, { provide: LOCAL_ICONS, useValue: localIcons }],
})
class HostComponent {
  readonly entries = signal(week());
}

describe('MilestonesCard', () => {
  let fixture: ComponentFixture<HostComponent>;
  const element = (): HTMLElement => fixture.nativeElement;
  const checked = (): string | undefined =>
    element().querySelector('[role="radio"][aria-checked="true"]')?.textContent?.trim();
  const rows = (): number => element().querySelectorAll('li').length;
  const button = (label: string): HTMLButtonElement =>
    [...element().querySelectorAll('button')].find(button => button.textContent?.trim().startsWith(label))!;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: GTAG_TOKEN, useValue: null }],
    });
    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
  });

  it('starts on the first target with milestones: 200M when every skill is 99', () => {
    expect(checked()).toBe('200M');
    expect(rows()).toBe(6);
    expect(element().querySelector('li')?.textContent).toContain('20M → 200M');
    expect(element().textContent).toContain('At Zezima’s pace');
  });

  // The page loads more history for a longer chart period, and the live hiscores replace the newest entry
  it('keeps the picked target when the history changes', async () => {
    button('99').click();
    await fixture.whenStable();
    expect(checked()).toBe('99');

    fixture.componentInstance.entries.set(week());
    await fixture.whenStable();

    expect(checked()).toBe('99');
    expect(element().textContent).toContain('is 99 already. Pick 200M.');
  });

  it('shows fewer again after another period is picked', async () => {
    button('Show all 7 milestones').click();
    await fixture.whenStable();
    expect(rows()).toBe(7);

    fixture.debugElement.children[0].injector.get(PlayerView).setMilestonePeriod(30);
    await fixture.whenStable();

    expect(rows()).toBe(6);
    expect(button('Show all').getAttribute('aria-expanded')).toBe('false');
  });
});
