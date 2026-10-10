import {
  afterNextRender,
  booleanAttribute,
  Component,
  inject,
  input,
  InputSignal,
  InputSignalWithTransform,
  output,
} from '@angular/core';
import { AnalyticsService } from '../../services/analytics/analytics-service';

/**
 * Shown in place of data that failed to load, with a retry button. Reports itself to analytics once it's visible in the
 * browser, labelled with `source`, so failures users actually see can be counted. `panel` gives it the same surface as
 * the cards around it, for when it replaces one; `compact` is a lone retry icon, for when it replaces a single value.
 */
@Component({
  selector: 'load-error',
  template: `
    @if (compact()) {
      <button
        type="button"
        class="flex items-center justify-center size-8 rounded-full text-strong hover:bg-row"
        [title]="message() + ' Click to retry.'"
        [attr.aria-label]="message() + ' Retry'"
        (click)="onRetry($event)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="size-5"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
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

  readonly source: InputSignal<string> = input.required();
  readonly message: InputSignal<string> = input("Couldn't load this data.");
  readonly hint: InputSignal<string> = input('Check your connection, then try again.');
  readonly compact: InputSignalWithTransform<boolean, unknown> = input(false, { transform: booleanAttribute });
  readonly panel: InputSignalWithTransform<boolean, unknown> = input(false, { transform: booleanAttribute });

  readonly retry = output<void>();

  constructor() {
    afterNextRender(() => this.analyticsService.trackEvent('load-error', 'errors', this.source(), undefined));
  }

  onRetry(event: Event): void {
    // The compact variant sits inside links (player cards), so a retry mustn't also navigate
    event.preventDefault();
    event.stopPropagation();
    this.retry.emit();
  }
}
