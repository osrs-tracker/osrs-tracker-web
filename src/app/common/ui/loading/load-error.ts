import { afterNextRender, booleanAttribute, Component, inject, input, output } from '@angular/core';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { LucideRefreshCw } from '@lucide/angular';

/**
 * Shown in place of data that failed to load, with a retry button. Reports itself to analytics once it's visible in the
 * browser, labelled with `source`, so failures users actually see can be counted. `panel` gives it the same surface as
 * the cards around it, for when it replaces one; `compact` is a lone retry icon, for when it replaces a single value;
 * `inline` is an amber line of text (`message`, kept short), for when it replaces a line under a value.
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
      <button
        type="button"
        class="flex items-center gap-0.5 min-w-0 h-4.5 text-sm/4.5 font-bold text-amber hover:underline"
        [title]="message() + '. Click to retry.'"
        [attr.aria-label]="message() + '. Retry'"
        (click)="onRetry($event)"
      >
        <span class="truncate">{{ message() }}</span>
        <svg lucideRefreshCw class="size-3.5 shrink-0" strokeWidth="2.5" />
      </button>
    } @else {
      <div role="alert" class="flex flex-col items-center justify-center gap-1 h-full px-5 py-8 text-center">
        <p class="font-bold text-strong">{{ message() }}</p>
        <p class="text-sm text-muted">{{ hint() }}</p>
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

  readonly source = input.required<string>();
  readonly message = input("Couldn't load this data.");
  readonly hint = input('Check your connection, then try again.');
  readonly compact = input(false, { transform: booleanAttribute });
  readonly panel = input(false, { transform: booleanAttribute });
  readonly inline = input(false, { transform: booleanAttribute });

  readonly retry = output<void>();

  constructor() {
    afterNextRender(() => this.analyticsService.trackEvent('load_error', { source: this.source() }));
  }

  onRetry(event: Event): void {
    // The compact variant sits inside links (player cards), so a retry mustn't also navigate
    event.preventDefault();
    event.stopPropagation();
    this.analyticsService.trackEvent('retry', { source: this.source() });
    this.retry.emit();
  }
}
