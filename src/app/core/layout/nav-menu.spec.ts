import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NavMenuRow, NavMenus } from './nav-menu';

@Component({
  imports: [NavMenuRow],
  template: `<a nav-menu-row label="Margins" sub="Spread after tax" [newUntil]="newUntil()">%</a>`,
})
class Host {
  readonly newUntil = signal<string | undefined>('2026-11-14');
}

describe('NavMenuRow', () => {
  afterEach(() => vi.useRealTimers());

  function render(now: string, newUntil?: string): string {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(now) });
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), NavMenus],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.newUntil.set(newUntil);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('shows the New pill before its date', () => {
    expect(render('2026-11-13T23:59:59Z', '2026-11-14')).toContain('New');
  });

  it('hides the pill from midnight UTC on its date', () => {
    expect(render('2026-11-14T00:00:00Z', '2026-11-14')).not.toContain('New');
  });

  it('hides the pill after its date', () => {
    expect(render('2026-12-01T12:00:00Z', '2026-11-14')).not.toContain('New');
  });

  it('shows no pill without a date', () => {
    expect(render('2026-10-25T12:00:00Z')).not.toContain('New');
  });
});
