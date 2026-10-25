import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DayPicker } from './day-picker';

const BAND = 'color-mix(in oklch, var(--accent) 12%, transparent)';
const HALF_TO_RIGHT = `linear-gradient(to right, transparent 50%, ${BAND} 50%)`;
const HALF_TO_LEFT = `linear-gradient(to left, transparent 50%, ${BAND} 50%)`;

// Guards the month layout: the leading blank days, and the tint between the two picked days at week and month edges.
// November 2026 starts on a Sunday and ends on a Monday.
describe('DayPicker', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }));

  function weeksOf(month: string, value?: string, other?: string): ReturnType<DayPicker['calendars']>[number]['weeks'] {
    const fixture = TestBed.createComponent(DayPicker);
    fixture.componentRef.setInput('label', 'Day');
    fixture.componentRef.setInput('range', { from: '2026-01-01', to: '2026-12-31' });
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('other', other);
    fixture.componentInstance.showMonth(month);
    return fixture.componentInstance.calendars()[0].weeks;
  }

  const cell = (weeks: ReturnType<typeof weeksOf>, date: number) => weeks.flat().find(cell => cell.date === date)!;

  it('starts the weeks on Monday, with blank days before the 1st and after the last', () => {
    const november = weeksOf('2026-11');

    expect(november).toHaveLength(6);
    expect(november[0].map(cell => cell.date)).toEqual([...Array(6).fill(undefined), 1]);
    expect(november[5].map(cell => cell.date)).toEqual([30, ...Array(6).fill(undefined)]);
    expect(weeksOf('2026-06')[0][0].date).toBe(1);
  });

  it('tints the days between the picked two, with half bands at the ends and rounded week edges', () => {
    const weeks = weeksOf('2026-11', '2026-11-11', '2026-11-06'); // Friday to the next Wednesday

    expect([5, 6, 7, 8, 9, 10, 11, 12].map(date => cell(weeks, date).band)).toEqual([
      undefined,
      HALF_TO_RIGHT,
      BAND,
      BAND,
      BAND,
      BAND,
      HALF_TO_LEFT,
      undefined,
    ]);
    expect([7, 8, 9, 10].map(date => cell(weeks, date).bandEdge?.trim())).toEqual([
      '',
      'rounded-r-full',
      'rounded-l-full',
      '',
    ]);
  });

  it('draws no half band where an end is on the edge of its week', () => {
    const weeks = weeksOf('2026-11', '2026-11-08', '2026-11-16'); // Sunday to the Monday a week later

    expect(cell(weeks, 8).band).toBeUndefined();
    expect(cell(weeks, 9)).toMatchObject({ band: BAND, bandEdge: 'rounded-l-full ' });
    expect(cell(weeks, 15)).toMatchObject({ band: BAND, bandEdge: ' rounded-r-full' });
    expect(cell(weeks, 16).band).toBeUndefined();
  });

  it('rounds the band where the month starts as where a week ends: the 1st, a Sunday, on both sides', () => {
    const weeks = weeksOf('2026-11', '2026-10-28', '2026-11-03');

    expect(cell(weeks, 1)).toMatchObject({ band: BAND, bandEdge: 'rounded-l-full rounded-r-full' });
    expect(cell(weeks, 3).band).toBe(HALF_TO_LEFT);
  });

  it('tints nothing when one day or none is picked', () => {
    expect(weeksOf('2026-11', '2026-11-10', '2026-11-10').some(week => week.some(cell => cell.band))).toBe(false);
    expect(weeksOf('2026-11', '2026-11-10').some(week => week.some(cell => cell.band))).toBe(false);
  });

  it("doesn't offer the other picker's day while none is picked here, as there's nothing to swap it with", () => {
    expect(cell(weeksOf('2026-11', undefined, '2026-11-10'), 10).day).toBeUndefined();
    expect(cell(weeksOf('2026-11', '2026-11-12', '2026-11-10'), 10).day?.key).toBe('2026-11-10');
  });

  it('names the button by its text alone when a prefix or placeholder already says what it is', () => {
    const fixture = TestBed.createComponent(DayPicker);
    fixture.componentRef.setInput('label', 'News since');
    fixture.componentRef.setInput('range', { from: '2026-01-01', to: '2026-12-31' });
    fixture.componentRef.setInput('placeholder', 'Since you last played');
    fixture.componentRef.setInput('value', undefined);
    expect(fixture.componentInstance.buttonName()).toBe('Since you last played');

    fixture.componentRef.setInput('value', '2026-10-10');
    expect(fixture.componentInstance.buttonName()).toBe('News since: 10 October 2026');

    fixture.componentRef.setInput('prefix', 'Since ');
    expect(fixture.componentInstance.buttonName()).toBe('Since 10 October 2026');
  });
});
