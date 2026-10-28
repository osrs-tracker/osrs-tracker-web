import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  booleanAttribute,
  Component,
  computed,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { LucideRefreshCw } from '@lucide/angular';

/**
 * Reports itself to analytics once it's visible in the browser, labelled with `source`, so failures users actually see
 * can be counted. `panel` replaces a card, `compact` a single value, `inline` a line under a value (`message`, kept
 * short).
 *
 * The default and `panel` variants go away while the view reloads, so Try again moves focus first, instead of letting
 * it fall to `<body>`: to `retryFocus`, else to the last heading before it in the card or section around it (or that
 * card itself), else to the page's `h1`.
 */
@Component({
  selector: 'load-error',
  imports: [LucideRefreshCw],
  template: `
    @if (compact()) {
      <button
        type="button"
        class="flex items-center justify-center size-8 rounded-full text-amber hover:bg-row"
        [title]="message() + ' Click to retry.'"
        [attr.aria-label]="message() + ' Retry'"
        (click)="onRetry($event)"
      >
        <svg lucideRefreshCw class="size-5" />
      </button>
    } @else if (inline()) {
      <!-- 24px tall for touch (WCAG 2.5.8), the negative margin keeps the 18px line -->
      <button
        type="button"
        class="flex items-center gap-0.5 min-w-0 h-6 -my-0.75 text-sm/4.5 font-bold text-amber hover:underline"
        [title]="message() + '. Click to retry.'"
        [attr.aria-label]="message() + '. Retry'"
        (click)="onRetry($event)"
      >
        <span class="truncate">{{ message() }}</span>
        <svg lucideRefreshCw class="size-3.5 shrink-0" strokeWidth="2.5" />
      </button>
    } @else {
      <div role="alert" class="flex flex-col items-center justify-center gap-1 h-full px-card py-8 text-center">
        <p class="font-bold text-strong">{{ message() }}</p>
        <p class="text-sm text-muted">{{ shownHint() }}</p>
        <button
          type="button"
          class="mt-3 h-9 px-4 rounded-full border border-border text-sm font-bold text-strong hover:bg-row"
          (click)="onRetry($event)"
        >
          Try again
        </button>
      </div>
    }
  `,
  host: {
    '[class]': "panel() ? 'block rounded-2xl bg-card' : ''",
  },
})
export class LoadError {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);

  readonly source = input.required<string>();
  readonly message = input("Couldn't load this data.");
  readonly hint = input<string>();
  /** An HTTP status from the server gets the server hint */
  readonly error = input<unknown>();
  /** For when the heading before isn't the place (a search input) */
  readonly retryFocus = input<HTMLElement>();
  readonly compact = input(false, { transform: booleanAttribute });
  readonly panel = input(false, { transform: booleanAttribute });
  readonly inline = input(false, { transform: booleanAttribute });

  readonly retry = output<void>();

  readonly shownHint = computed(() => this.hint() ?? errorHint(this.error()));

  constructor() {
    afterNextRender(() => this.analyticsService.trackEvent('load_error', { source: this.source() }));
  }

  onRetry(event: Event): void {
    // The compact variant sits inside links (player cards), so a retry mustn't also navigate
    event.preventDefault();
    event.stopPropagation();
    this.analyticsService.trackEvent('retry', { source: this.source() });
    // Before the retry, so a caller that moves focus once the view loads starts from where this left it
    if (!this.compact() && !this.inline() && this.document.activeElement === event.currentTarget) this.moveFocus();
    this.retry.emit();
  }

  private moveFocus(): void {
    const host = this.elementRef.nativeElement;
    const container = host.closest<HTMLElement>('section, article');
    const target =
      this.retryFocus() ??
      (container ? (lastHeadingBefore(host, container) ?? container) : this.document.querySelector('h1'));
    if (!target) return;

    // Focusable by script only, so it isn't a Tab stop. Not scrolled to: the view reloads where it is
    if (target.tabIndex < 0 && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
}

/** Status 0 is no answer at all: the connection, or a server out of reach */
function errorHint(error: unknown): string {
  return error instanceof HttpErrorResponse && error.status !== 0
    ? 'Something went wrong on the server. Try again in a minute.'
    : 'Check your connection, then try again.';
}

function lastHeadingBefore(element: HTMLElement, container: HTMLElement): HTMLElement | undefined {
  let last: HTMLElement | undefined;
  for (const heading of container.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')) {
    if (!(heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)) break;
    last = heading;
  }
  return last;
}
