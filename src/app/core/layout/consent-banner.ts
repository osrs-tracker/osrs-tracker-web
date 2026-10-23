import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConsentStore } from '@app/common/analytics/consent-store';
import { LucideChartNoAxesColumn } from '@lucide/angular';

/**
 * Asks to allow Google Analytics' cookies. Fixed over the page, so it shifts no layout, and not a modal: the page stays
 * usable and nothing is tracked until a choice is made. Both buttons look the same, so declining is as easy as
 * allowing (docs/decisions.md). While it shows, it sets `--consent-reserve` on `<html>` to the height it covers at the
 * bottom of the viewport, the `consent` spacing token: the page keeps it clear (WCAG 2.4.11), as Tab scrolls a focused
 * element above it and the page's end gets room to scroll out from under it.
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
          <svg lucideChartNoAxesColumn class="size-5" strokeWidth="2.5" />
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
  imports: [RouterLink, LucideChartNoAxesColumn],
})
export class ConsentBanner {
  readonly consentStore = inject(ConsentStore);

  constructor() {
    const elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
    const destroyRef = inject(DestroyRef);
    const root = inject(DOCUMENT).documentElement;

    afterNextRender(() => {
      const host = elementRef.nativeElement;
      // From its top edge to the viewport's bottom, so its offset from the edge counts too, and 8px for a focus ring to
      // clear it; 0 while index.html hides it
      const observer = new ResizeObserver(() => {
        const { top, height } = host.getBoundingClientRect();
        root.style.setProperty('--consent-reserve', `${height ? Math.ceil(window.innerHeight - top) + 8 : 0}px`);
      });
      observer.observe(host);
      destroyRef.onDestroy(() => {
        observer.disconnect();
        root.style.removeProperty('--consent-reserve');
      });
    });

    // Reopened from the footer: move focus to the banner, so keyboard and screen reader users land on it, and back to
    // the Cookies button once a choice closes it
    if (this.consentStore.choice()) {
      const opener = inject(DOCUMENT).activeElement as HTMLElement | null;
      afterNextRender(() => elementRef.nativeElement.querySelector('section')?.focus());
      destroyRef.onDestroy(() => opener?.focus());
    }
  }
}
