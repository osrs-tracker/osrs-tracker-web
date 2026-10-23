import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ChartTable, ChartTableRow } from './chart-table';

@Component({
  template: `<chart-table
    caption="Average prices per day over the last week"
    [columns]="['Day', 'Instant buy (gp)']"
    [rows]="rows"
    [(open)]="open"
  />`,
  imports: [ChartTable],
})
class Host {
  readonly rows: ChartTableRow[] = [
    { key: 2, cells: ['Fri 23 Oct', '1,200'] },
    { key: 1, cells: ['Thu 22 Oct', '1,100'] },
  ];
  readonly open = signal(false);
}

describe('ChartTable', () => {
  async function render() {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    return { fixture, element, details: element.querySelector('details')! };
  }

  it('is a captioned table with column and row headers, behind a closed disclosure', async () => {
    const { element, details } = await render();

    expect(details.open).toBe(false);
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

  it('opens from its summary, reporting it before the browser lays it out', async () => {
    const { fixture, element, details } = await render();
    let openWhenReported: boolean | undefined;
    fixture.debugElement.children[0].componentInstance.open.subscribe(() => (openWhenReported = details.open));

    element.querySelector('summary')!.click();
    expect(openWhenReported).toBe(false);
    await fixture.whenStable();

    expect(details.open).toBe(true);
    expect(fixture.componentInstance.open()).toBe(true);
    expect(element.querySelector('chart-table')?.hasAttribute('data-open')).toBe(true);
  });

  it('follows the browser opening it, as find in page does', async () => {
    const { fixture, details } = await render();

    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    await fixture.whenStable();

    expect(fixture.componentInstance.open()).toBe(true);
  });
});
