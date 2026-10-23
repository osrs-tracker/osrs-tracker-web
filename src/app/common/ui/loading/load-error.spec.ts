import { HttpErrorResponse } from '@angular/common/http';
import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { GTAG_TOKEN } from '@app/common/analytics/gtag-token';
import { LoadError } from './load-error';

@Component({
  imports: [LoadError],
  template: `
    <h1>Page</h1>
    <input #search aria-label="Search" />
    @if (inCard()) {
      <section>
        <h2>Card</h2>
        <load-error
          source="spec"
          [error]="error()"
          [retryFocus]="toSearch() ? search : undefined"
          (retry)="retries = retries + 1"
        />
        <h2>Next card</h2>
      </section>
    } @else {
      <load-error source="spec" (retry)="retries = retries + 1" />
    }
  `,
})
class Host {
  readonly inCard = signal(true);
  readonly toSearch = signal(false);
  readonly error = signal<unknown>(undefined);
  retries = 0;
}

describe('LoadError', () => {
  afterEach(() => document.body.replaceChildren());

  async function render(change?: (host: Host) => void): Promise<{ host: Host; element: HTMLElement }> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: GTAG_TOKEN, useValue: null }],
    });
    const fixture = TestBed.createComponent(Host);
    change?.(fixture.componentInstance);
    // attached, so focus works
    document.body.append(fixture.nativeElement);
    await fixture.whenStable();
    return { host: fixture.componentInstance, element: fixture.nativeElement };
  }

  function pressTryAgain(element: HTMLElement, focused = true): void {
    const button = element.querySelector<HTMLButtonElement>('load-error button')!;
    if (focused) button.focus();
    button.click();
  }

  // Try again goes when the view reloads: focus would fall to <body>
  it('moves focus to the heading before it in its card, without making it a Tab stop', async () => {
    const { host, element } = await render();
    pressTryAgain(element);

    expect(document.activeElement?.textContent).toBe('Card');
    expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');
    expect(host.retries).toBe(1);
  });

  it('moves focus to retryFocus when given, leaving its Tab stop', async () => {
    const { element } = await render(host => host.toSearch.set(true));
    pressTryAgain(element);

    expect(document.activeElement).toBe(element.querySelector('input'));
    expect(document.activeElement?.hasAttribute('tabindex')).toBe(false);
  });

  it("moves focus to the page's h1 outside a card", async () => {
    const { element } = await render(host => host.inCard.set(false));
    pressTryAgain(element);

    expect(document.activeElement).toBe(element.querySelector('h1'));
  });

  it('leaves focus alone when Try again was pressed without it', async () => {
    const { element } = await render();
    const search = element.querySelector('input')!;
    search.focus();
    pressTryAgain(element, false);

    expect(document.activeElement).toBe(search);
  });

  it('tells a server error from a network one', async () => {
    const { host, element } = await render();
    const hint = (): string | null | undefined => element.querySelector('load-error .text-muted')?.textContent;
    expect(hint()).toBe('Check your connection, then try again.');

    host.error.set(new HttpErrorResponse({ status: 503 }));
    TestBed.tick();
    expect(hint()).toBe('Something went wrong on the server. Try again in a minute.');

    host.error.set(new HttpErrorResponse({ status: 0 }));
    TestBed.tick();
    expect(hint()).toBe('Check your connection, then try again.');
  });
});
