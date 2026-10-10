import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fromJagex } from '@osrs-tracker/hiscores';
import { HiscoreEntry } from '@osrs-tracker/models';
import { GTAG_TOKEN } from 'src/app/common/services/analytics/analytics.token';
import { describe, expect, it } from 'vitest';
import { TOXSICK } from '../../testing/jagex-hiscores';
import { ChartLegendComponent, LegendItem } from '../player-logs/chart-legend.component';
import { PlayerView } from '../player-view';
import { ActivityGridComponent } from './activity-grid.component';
import { SkillGridComponent } from './skill-grid.component';

@Component({
  selector: 'host',
  template: `
    <skill-grid [hiscore]="undefined" [gains]="gains" />
    <activity-grid view="raids" [layout]="layout" [hiscore]="undefined" [gains]="gains" />
    <chart-legend kind="skill" [items]="items" [collapseAfter]="1" />
  `,
  imports: [ActivityGridComponent, ChartLegendComponent, SkillGridComponent],
  providers: [PlayerView],
})
class HostComponent {
  readonly gains: ReadonlyMap<string, number> = new Map();
  readonly layout: (string | null)[] = ['Chambers of Xeric', 'Theatre of Blood', null];
  readonly items: LegendItem[] = [
    { name: 'Attack', color: 'red', on: true },
    { name: 'Strength', color: 'green', on: false },
  ];
}

// @angular/aria sets the Tab stop in afterRenderEffects, which never run on the server; the grids and the legend set it
// through aria's internal `_pattern` in an effect (see docs/decisions.md). This guards that on every aria update.
describe('hiscores grids and chart legend before render hooks run (as on the server)', () => {
  it('have exactly one Tab stop each', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: GTAG_TOKEN, useValue: null }],
    });
    const fixture = TestBed.createComponent(HostComponent);
    // Only change detection: unlike fixture.detectChanges() or whenStable(), it runs no afterRender hooks
    fixture.componentRef.changeDetectorRef.detectChanges();

    for (const host of ['skill-grid', 'activity-grid', 'chart-legend']) {
      const buttons: HTMLButtonElement[] = [...fixture.nativeElement.querySelectorAll(`${host} button`)];
      expect(
        buttons.filter(button => button.getAttribute('tabindex') === '0'),
        host,
      ).toHaveLength(1);
    }
  });
});

describe('SkillGridComponent keyboard', () => {
  const SKILLS = ['Attack', 'Hitpoints', 'Mining', 'Overall'];

  async function render(): Promise<{
    playerView: PlayerView;
    buttons: HTMLButtonElement[];
    ready: () => Promise<void>;
  }> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), PlayerView, { provide: GTAG_TOKEN, useValue: null }],
    });
    const fixture = TestBed.createComponent(SkillGridComponent);
    const hiscore: HiscoreEntry = {
      date: new Date(),
      scrapingOffset: 0,
      skills: Object.fromEntries(SKILLS.map(name => [name, { rank: 1, level: 50, xp: 101_333 }])),
      activities: {},
    };
    fixture.componentRef.setInput('hiscore', hiscore);
    // Attack gained XP, Hitpoints didn't
    fixture.componentRef.setInput('gains', new Map([['Attack', 100]]));
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    return {
      playerView: TestBed.inject(PlayerView),
      buttons: [...fixture.nativeElement.querySelectorAll('button')],
      ready: () => fixture.whenStable(),
    };
  }

  const key = (button: HTMLElement, key: string): boolean =>
    button.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

  it('moves focus with the arrow keys, row by row, down to the total level', async () => {
    const { buttons, ready } = await render();
    buttons[0].focus();

    key(buttons[0], 'ArrowRight');
    await ready();
    expect(document.activeElement).toBe(buttons[1]);

    key(buttons[1], 'ArrowDown');
    await ready();
    expect(document.activeElement).toBe(buttons[4]);

    key(buttons[4], 'End');
    await ready();
    key(buttons[5], 'ArrowRight'); // Past a row's end continues on the next row
    await ready();
    expect(document.activeElement).toBe(buttons[6]);

    for (const row of [2, 3, 4, 5, 6, 7]) {
      key(buttons[row * 3], 'ArrowDown');
      await ready();
    }
    expect(document.activeElement).toBe(buttons[24]); // The total level
    expect(buttons.filter(button => button.tabIndex === 0)).toEqual([buttons[24]]);
  });

  it('reaches a cell without gains but only toggles one with gains', async () => {
    const { playerView, buttons, ready } = await render();

    buttons[1].click();
    await ready();
    expect(buttons[1].getAttribute('aria-disabled')).toBe('true');
    expect(buttons[1].tabIndex).toBe(0);
    expect([...playerView.skills()]).toEqual(['Overall']);

    buttons[0].click();
    await ready();
    expect([...playerView.skills()]).toEqual(['Attack']);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
  });
});

describe('grids with a real response (ToxSick: Sailing at 0 XP, unranked boss kills)', () => {
  const hiscore: HiscoreEntry = { date: new Date(), scrapingOffset: 0, ...fromJagex(TOXSICK) };

  function render<T>(type: new () => T, inputs: Record<string, unknown>): HTMLElement {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), PlayerView, { provide: GTAG_TOKEN, useValue: null }],
    });
    const fixture = TestBed.createComponent(type);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.componentRef.changeDetectorRef.detectChanges();
    return fixture.nativeElement;
  }

  it('shows an untrained skill as level 1, not a skeleton', () => {
    const el = render(SkillGridComponent, { hiscore, gains: new Map() });
    const sailing = el.querySelector('button[aria-label^="Sailing"]')!;
    expect(sailing.getAttribute('aria-label')).toBe('Sailing level 1');
    expect(sailing.querySelector('skeleton')).toBeNull();
    expect(el.querySelectorAll('skeleton')).toHaveLength(0);
  });

  it('shows an unranked boss with its score', () => {
    const el = render(ActivityGridComponent, {
      view: 'raids',
      layout: ['Chambers of Xeric'],
      hiscore,
      gains: new Map(),
    });
    const cell = el.querySelector('button')!;
    expect(cell.getAttribute('aria-label')).toBe('Chambers of Xeric, score 2');
    expect(cell.textContent).toContain('2');
    expect(cell.querySelector('skeleton')).toBeNull();
  });

  it('shows a skeleton only while loading', () => {
    const el = render(ActivityGridComponent, {
      view: 'raids',
      layout: ['Chambers of Xeric'],
      hiscore: undefined,
      gains: new Map(),
    });
    expect(el.querySelector('button skeleton')).not.toBeNull();
  });
});

describe('ChartLegendComponent focus', () => {
  it('moves focus to its new Tab stop when the focused chip goes behind "+N"', async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: GTAG_TOKEN, useValue: null }],
    });
    const fixture = TestBed.createComponent(ChartLegendComponent);
    fixture.componentRef.setInput('kind', 'skill');
    fixture.componentRef.setInput('collapseAfter', 1);
    fixture.componentRef.setInput('items', [
      { name: 'Attack', color: 'red', on: true },
      { name: 'Strength', color: 'green', on: true },
    ]);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();

    const [attack, strength]: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('button');
    attack.focus();
    attack.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await fixture.whenStable();
    expect(document.activeElement).toBe(strength);
    // Toggled off: past collapseAfter, it goes behind "+1" and its chip is removed
    fixture.componentRef.setInput('items', [
      { name: 'Attack', color: 'red', on: true },
      { name: 'Strength', color: 'green', on: false },
    ]);
    await fixture.whenStable();

    expect(strength.isConnected).toBe(false);
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('button'));
  });
});
