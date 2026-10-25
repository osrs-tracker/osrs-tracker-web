import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';

/**
 * Wrap the content in `<div class="markdown">` for the reading styles; an element with the `intro` attribute goes
 * between the title and the card.
 */
@Component({
  selector: 'information-page',
  template: `
    <div class="max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-18">
      <h1 class="text-2xl/8 sm:text-3xl/9 font-bold text-strong">{{ title() }}</h1>
      @if (lastUpdated()) {
        <p class="mt-1 text-sm/5 text-muted">Last updated {{ lastUpdated() | date: 'd MMMM y' }}</p>
      }

      <div class="empty:hidden mt-4">
        <ng-content select="[intro]" />
      </div>

      <div class="mt-6 px-5 py-6 sm:px-8 sm:py-8 rounded-2xl bg-card">
        <ng-content />
      </div>
    </div>
  `,
  imports: [DatePipe],
})
export class InformationPage {
  readonly title = input.required<string>();
  /** `YYYY-MM-DD` */
  readonly lastUpdated = input<string>();
}
