import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConsentStore } from '@app/common/analytics/consent-store';

/**
 * Asks to allow Google Analytics' cookies. Fixed over the page, so it shifts no layout, and not a modal: the page stays
 * usable and nothing is tracked until a choice is made. Both buttons look the same, so declining is as easy as
 * allowing (docs/decisions.md).
 */
@Component({
  selector: 'consent-banner',
  template: `
    <section
      class="flex flex-col gap-4 p-5 rounded-2xl border border-line bg-card shadow-float outline-none"
      aria-labelledby="consent-heading"
      tabindex="-1"
      data-nosnippet
    >
      <div class="flex items-center gap-3">
        <span
          class="flex items-center justify-center size-10 shrink-0 rounded-xl bg-deep text-accent"
          aria-hidden="true"
        >
          <svg
            class="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <line x1="6" y1="20" x2="6" y2="13" />
            <line x1="12" y1="20" x2="12" y2="5" />
            <line x1="18" y1="20" x2="18" y2="10" />
          </svg>
        </span>
        <h2 id="consent-heading" class="grow text-lg/6 font-bold text-strong">Allow analytics cookies?</h2>
        @if (consentStore.choice(); as choice) {
          <span
            class="shrink-0 h-6 px-2.5 flex items-center rounded-full text-xs font-bold"
            [class]="choice === 'granted' ? 'bg-accent/15 text-accent' : 'bg-inner text-muted'"
          >
            {{ choice === 'granted' ? 'Allowed' : 'Not allowed' }}
          </span>
        }
      </div>

      <div class="flex flex-col gap-2 text-sm text-muted">
        <p>
          Google Analytics would set cookies to count visits and show which features get used, like searches and chart
          periods.
        </p>
        <p>
          Nothing is used for ads, and the <a class="link" routerLink="/about/privacy">privacy policy</a> has the
          details.
        </p>
      </div>

      <div class="flex gap-3">
        <button type="button" class="button--default button--rounded flex-1 h-11" (click)="consentStore.allow()">
          Allow
        </button>
        <button type="button" class="button--default button--rounded flex-1 h-11" (click)="consentStore.deny()">
          Don’t allow
        </button>
      </div>
    </section>
  `,
  host: { class: 'fixed z-50 bottom-4 inset-x-4 sm:bottom-6 sm:left-6 sm:right-auto sm:w-100' },
  imports: [RouterLink],
})
export class ConsentBanner {
  readonly consentStore = inject(ConsentStore);

  constructor() {
    const elementRef: ElementRef<HTMLElement> = inject(ElementRef);

    // Reopened from the footer: move focus to the banner, so keyboard and screen reader users land on it, and back to
    // the Cookies button once a choice closes it
    if (this.consentStore.choice()) {
      const opener = inject(DOCUMENT).activeElement as HTMLElement | null;
      afterNextRender(() => elementRef.nativeElement.querySelector('section')?.focus());
      inject(DestroyRef).onDestroy(() => opener?.focus());
    }
  }
}
