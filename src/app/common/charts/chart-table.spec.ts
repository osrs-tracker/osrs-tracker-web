import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ChartTable, ChartTableRow } from './chart-table';

@Component({
  template: `<chart-table
    caption="Average prices per day over the last week"
    [columns]="['Day', 'Instant buy (gp)']"
    [rows]="rows"
  />`,
  imports: [ChartTable],
})
class Host {
  readonly rows: ChartTableRow[] = [
    { key: 2, cells: ['Fri 23 Oct', '1,200'] },
    { key: 1, cells: ['Thu 22 Oct', '1,100'] },
  ];
}

describe('ChartTable', () => {
  async function render() {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('is a captioned table with column and row headers', async () => {
    const element = await render();

    expect(element.querySelector('caption')?.textContent?.trim()).toBe('Average prices per day over the last week');
    expect([...element.querySelectorAll('th[scope=col]')].map(th => th.textContent?.trim())).toEqual([
      'Day',
      'Instant buy (gp)',
    ]);
    const rows = [...element.querySelectorAll('tbody tr')].map(tr => [
      tr.querySelector('th[scope=row]')?.textContent?.trim(),
      tr.querySelector('td')?.textContent?.trim(),
    ]);
    expect(rows).toEqual([
      ['Fri 23 Oct', '1,200'],
      ['Thu 22 Oct', '1,100'],
    ]);
    // scrollable, so reachable and named for keyboard users
    const region = element.querySelector('[role=region]')!;
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.getAttribute('aria-label')).toBe('Average prices per day over the last week');
  });
});
