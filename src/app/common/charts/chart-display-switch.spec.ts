import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { ChartDisplaySwitch } from './chart-display-switch';

describe('ChartDisplaySwitch', () => {
  async function render() {
    const trackOption = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: AnalyticsService, useValue: { trackOption } }],
    });
    const fixture = TestBed.createComponent(ChartDisplaySwitch);
    fixture.componentRef.setInput('chart', 'item_price');
    await fixture.whenStable();
    const buttons: HTMLButtonElement[] = [...fixture.nativeElement.querySelectorAll('button')];
    return { fixture, buttons, trackOption };
  }

  it('is a "Show as" radio group of two icons, named for screen readers and on hover', async () => {
    const { fixture, buttons } = await render();

    expect(fixture.nativeElement.querySelector('[role=radiogroup]').getAttribute('aria-label')).toBe('Show as');
    expect(buttons.map(button => button.textContent?.trim())).toEqual(['Chart', 'Table']);
    expect(buttons.map(button => button.title)).toEqual(['Chart', 'Table']);
    expect(buttons.map(button => button.getAttribute('aria-checked'))).toEqual(['true', 'false']);
    expect(buttons.every(button => button.querySelector('svg[aria-hidden=true]'))).toBe(true);
  });

  it('switches to the table and reports it', async () => {
    const { fixture, buttons, trackOption } = await render();

    buttons[1].click();
    await fixture.whenStable();

    expect(fixture.componentInstance.display()).toBe('table');
    expect(trackOption).toHaveBeenCalledWith('item_price_display', 'table');
  });
});
