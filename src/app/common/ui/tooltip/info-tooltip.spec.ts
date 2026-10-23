import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InfoTooltip } from './info-tooltip';
import { Tooltip } from './tooltip';

@Component({
  template: `<info-tooltip label="About GE tax"
    ><ng-template>GE tax is 2% of the sell price.</ng-template></info-tooltip
  >`,
  imports: [InfoTooltip],
})
class Host {}

// The tooltip opens and closes after a 300ms debounce, and slower machines take longer
const eventually = (check: () => void): Promise<void> => vi.waitFor(check, { timeout: 2000 });

describe('InfoTooltip', () => {
  async function render(): Promise<HTMLButtonElement> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('button');
  }

  const overlayText = (): string => document.querySelector('.cdk-overlay-container')?.textContent?.trim() ?? '';

  afterEach(() => document.body.replaceChildren());

  it('is a button named by its label and described by its content', async () => {
    const button = await render();

    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('About GE tax');
    expect(button.hasAttribute('aria-hidden')).toBe(false);

    const description = document.getElementById(button.getAttribute('aria-describedby')!);
    expect(description?.hidden).toBe(true);
    expect(description?.textContent?.trim()).toBe('GE tax is 2% of the sell price.');
  });

  it('opens on keyboard focus and closes on Escape, keeping its description', async () => {
    const button = await render();
    const description = document.getElementById(button.getAttribute('aria-describedby')!)!;

    button.focus();
    await eventually(() => expect(overlayText()).toBe('GE tax is 2% of the sell price.'));
    expect(description.textContent?.trim()).toBe('GE tax is 2% of the sell price.');

    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await eventually(() => expect(overlayText()).toBe(''));
  });
});

@Component({
  template: `<button type="button" tooltip [tooltipTemplate]="tip" [tooltipDescribe]="false">Attack</button>
    <ng-template #tip>83 XP</ng-template>`,
  imports: [Tooltip],
})
class OptOutHost {}

describe('Tooltip', () => {
  it("leaves the host undescribed when it opts out, as the grids' cells do", async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(OptOutHost);
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(button.hasAttribute('aria-describedby')).toBe(false);
    expect(button.querySelector('[hidden]')).toBeNull();
  });
});
