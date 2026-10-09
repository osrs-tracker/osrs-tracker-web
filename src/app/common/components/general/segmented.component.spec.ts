import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SegmentedComponent, SegmentedOption } from './segmented.component';

// Guards the radio group built on @angular/aria's toolbar, which uses its internal `_pattern` (see docs/decisions.md)
describe('SegmentedComponent', () => {
  const OPTIONS: SegmentedOption<number>[] = [
    { value: 7, label: '7D' },
    { value: 30, label: '30D' },
    { value: 60, label: '60D', disabled: true },
  ];

  async function render(): Promise<{
    fixture: ComponentFixture<SegmentedComponent<number>>;
    buttons: HTMLButtonElement[];
  }> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(SegmentedComponent<number>);
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.componentRef.setInput('value', 30);
    fixture.componentRef.setInput('label', 'Period');
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    return { fixture, buttons: [...fixture.nativeElement.querySelectorAll('button')] };
  }

  const key = (button: HTMLElement, key: string): boolean =>
    button.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

  it('is a radio group with the checked option as its only Tab stop', async () => {
    const { fixture, buttons } = await render();

    expect(fixture.nativeElement.getAttribute('role')).toBe('radiogroup');
    expect(buttons.map(button => button.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    expect(buttons.map(button => button.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('moves focus with the arrow keys without choosing, and chooses on click', async () => {
    const { fixture, buttons } = await render();
    buttons[1].focus();

    key(buttons[1], 'ArrowLeft');
    await fixture.whenStable();
    expect(document.activeElement).toBe(buttons[0]);
    expect(fixture.componentInstance.value()).toBe(30);

    buttons[0].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe(7);
  });

  it('reaches a disabled option with the arrow keys but never chooses it', async () => {
    const { fixture, buttons } = await render();
    buttons[1].focus();

    key(buttons[1], 'ArrowRight');
    await fixture.whenStable();
    expect(document.activeElement).toBe(buttons[2]);
    expect(buttons[2].getAttribute('aria-disabled')).toBe('true');

    buttons[2].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe(30);
  });

  it('makes the checked option the Tab stop again once focus leaves', async () => {
    const { fixture, buttons } = await render();
    buttons[1].focus();
    key(buttons[1], 'ArrowLeft');
    await fixture.whenStable();

    buttons[0].blur();
    await fixture.whenStable();
    expect(buttons.map(button => button.tabIndex)).toEqual([-1, 0, -1]);
  });
});
