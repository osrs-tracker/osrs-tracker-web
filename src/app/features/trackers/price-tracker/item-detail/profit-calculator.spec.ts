import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Item } from '@osrs-tracker/models';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { LatestPrices, OsrsPricesRepo } from '@app/common/api/osrs-prices-repo';
import { ProfitCalculator } from './profit-calculator';

const WHIP = { id: 4151, name: 'Abyssal whip', highalch: 72_000, limit: 70 } as Item;
const LOBSTER = { id: 379, name: 'Lobster', highalch: 160, limit: 13_000 } as Item; // sold without GE tax

const prices = (high: number, low: number): LatestPrices => ({ high, highTime: new Date(), low, lowTime: new Date() });

describe('ProfitCalculator', () => {
  async function render(item: Item, latest: LatestPrices): Promise<ComponentFixture<ProfitCalculator>> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: OsrsPricesRepo, useValue: { getLatestPrices: () => of(prices(100, 98)) } },
        { provide: AnalyticsService, useValue: { trackEvent: vi.fn(), trackOption: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(ProfitCalculator);
    fixture.componentRef.setInput('item', item);
    fixture.componentRef.setInput('latestPrices', latest);
    await fixture.whenStable();
    return fixture;
  }

  const row = (calculator: ProfitCalculator, label: string): string | undefined =>
    calculator.rows().find(row => row.label === label)?.value;

  describe('flip', () => {
    it('buys at the instant sell price, sells at the instant buy price and takes 2% GE tax per item', async () => {
      const calculator = (await render(WHIP, prices(1_100_000, 1_000_000))).componentInstance;

      // 1,100,000 − 1,000,000 − 22,000 tax, times the buy limit
      expect(calculator.profit()).toEqual({ perItem: 78_000, total: 5_460_000, sub: '70 × +78,000 gp after tax' });
      expect(row(calculator, 'Margin per item')).toBe('100,000');
      expect(row(calculator, 'GE tax per item')).toBe('−22,000');
      expect(row(calculator, 'Return on investment')).toBe('7.80%');
    });

    it('shows a loss with a minus sign', async () => {
      const calculator = (await render(WHIP, prices(1_010_000, 1_000_000))).componentInstance;

      expect(calculator.profit().perItem).toBe(-10_200);
      expect(row(calculator, 'Return on investment')).toBe('−1.02%');
    });

    it('takes no tax on an exempt item', async () => {
      const calculator = (await render(LOBSTER, prices(200, 150))).componentInstance;

      expect(calculator.profit().perItem).toBe(50);
      expect(row(calculator, 'GE tax per item')).toBe('No tax on this item');
    });

    it('asks for a quantity when it is 0', async () => {
      const calculator = (await render(WHIP, prices(1_100_000, 1_000_000))).componentInstance;
      calculator.flipQuantity.set(0);

      expect(calculator.profit()).toEqual({ perItem: 78_000, total: 0, sub: 'Enter a quantity' });
    });
  });

  describe('high alch', () => {
    it('subtracts the item at its instant buy price and a nature rune from the high alch value', async () => {
      const fixture = await render(WHIP, prices(70_000, 69_000));
      const calculator = fixture.componentInstance;
      calculator.selectMode('alch');
      await fixture.whenStable();

      // 72,000 − 70,000 − 100 (the nature rune's instant buy price)
      expect(calculator.profit()).toEqual({ perItem: 1_900, total: 133_000, sub: '70 × +1,900 gp per cast' });
      expect(row(calculator, 'Cost per cast')).toBe('−70,100');
      expect(row(calculator, 'Max buy price for profit')).toBe('71,900');
      expect(row(calculator, 'Magic XP')).toBe('4,550');
    });
  });

  describe('onInput', () => {
    /** Types into an input: `before|after` is its text with the caret at `|` */
    function type(calculator: ProfitCalculator, text: string): { value: number; text: string } {
      const input = document.createElement('input');
      const caret = text.indexOf('|');
      input.value = text.replace('|', '');
      input.setSelectionRange(caret, caret);
      const value = signal(0);

      calculator.onInput({ target: input } as unknown as Event, value);

      const at = input.selectionStart!;
      return { value: value(), text: `${input.value.slice(0, at)}|${input.value.slice(at)}` };
    }

    it('adds thousands separators and keeps the caret after the same digit', async () => {
      const calculator = (await render(WHIP, prices(1_100_000, 1_000_000))).componentInstance;

      expect(type(calculator, '1234|')).toEqual({ value: 1234, text: '1,234|' });
      expect(type(calculator, '12|34')).toEqual({ value: 1234, text: '1,2|34' });
      expect(type(calculator, '9|999')).toEqual({ value: 9999, text: '9|,999' });
      expect(type(calculator, '1,0005|00')).toEqual({ value: 1_000_500, text: '1,000,5|00' });
    });

    it('drops everything but digits, and empties to 0', async () => {
      const calculator = (await render(WHIP, prices(1_100_000, 1_000_000))).componentInstance;

      expect(type(calculator, '1.5k|')).toEqual({ value: 15, text: '15|' });
      expect(type(calculator, '|')).toEqual({ value: 0, text: '|' });
    });
  });
});
