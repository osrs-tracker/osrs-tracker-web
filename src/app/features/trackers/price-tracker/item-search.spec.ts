import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Item } from '@osrs-tracker/models';
import { delay, of } from 'rxjs';
import { OsrsPricesRepo } from '@app/common/api/osrs-prices-repo';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ItemSearch } from './item-search';

// Guards the combobox on @angular/aria: which key does what, and that Enter either opens an option or searches
describe('ItemSearch', () => {
  const ITEMS = [
    { id: 4151, name: 'Abyssal whip', icon: 'whip.png' },
    { id: 12769, name: 'Frozen whip mix', icon: 'frozen.png' },
  ] as Item[];

  let fixture: ComponentFixture<ItemSearch>;
  let input: HTMLInputElement;
  // Async like HTTP: the popup opens on the skeleton rows and gets its listbox once the results are in
  const searchItems = vi.fn(() => of(ITEMS).pipe(delay(0)));

  const scrollIntoView = Element.prototype.scrollIntoView;

  async function render(): Promise<void> {
    // Not in jsdom; the component scrolls the active option into view (restored in afterEach)
    Element.prototype.scrollIntoView = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: OsrsTrackerRepo, useValue: { searchItems } },
        { provide: OsrsPricesRepo, useValue: { getLatestPrices: () => of({ low: 1_000, high: 1_100 }) } },
      ],
    });
    fixture = TestBed.createComponent(ItemSearch);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    input = fixture.nativeElement.querySelector('input');
  }

  /** aria sets state in render hooks and a MutationObserver (the relayed keys, the popup, the first active option) */
  async function settle(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      TestBed.tick();
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve));
    }
  }

  async function type(text: string): Promise<void> {
    input.focus();
    input.value = text;
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    await settle();
  }

  async function key(name: string): Promise<boolean> {
    const notPrevented = input.dispatchEvent(
      new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }),
    );
    await settle();
    return notPrevented;
  }

  const options = (): HTMLElement[] => [...fixture.nativeElement.querySelectorAll('[role="option"]')];
  const activeName = (): string | undefined =>
    document.getElementById(input.getAttribute('aria-activedescendant') ?? '')?.textContent?.trim();

  afterEach(() => {
    fixture.nativeElement.remove();
    fixture.destroy();
    searchItems.mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  it('opens on search with the result links as options, the first one active', async () => {
    await render();
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');

    await type('whip');
    await key('Enter');

    expect(searchItems).toHaveBeenCalledExactlyOnceWith('whip');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe(fixture.nativeElement.querySelector('[role="listbox"]').id);
    expect(options().map(option => option.getAttribute('href'))).toEqual([
      '/trackers/price/4151',
      '/trackers/price/12769',
    ]);
    expect(activeName()).toContain('Abyssal whip');
  });

  it('moves the active option with the arrow keys and opens it on Enter', async () => {
    await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await type('whip');
    await key('Enter');

    await key('ArrowDown');
    expect(activeName()).toContain('Frozen whip mix');
    expect(options()[1].getAttribute('aria-selected')).toBe('true');

    expect(await key('Enter')).toBe(false);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/trackers/price', 12769]);
    expect(searchItems).toHaveBeenCalledOnce();
  });

  it('searches on Enter once the query changed, unless an option was reached with the arrow keys', async () => {
    await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await type('whip');
    await key('Enter');

    await type('whip mix');
    await key('Enter');
    expect(searchItems).toHaveBeenLastCalledWith('whip mix');
    expect(navigate).not.toHaveBeenCalled();

    await type('whip mixes');
    await key('ArrowDown');
    await key('Enter');
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/trackers/price', 12769]);
    expect(searchItems).toHaveBeenCalledTimes(2);
  });

  it('closes on Escape, on a press outside and when cleared', async () => {
    await render();
    await type('whip');
    await key('Enter');

    await key('Escape');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(options()).toEqual([]);

    await key('ArrowDown');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await settle();
    expect(input.getAttribute('aria-expanded')).toBe('false');

    await key('ArrowDown');
    await type('');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });
});
