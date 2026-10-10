import { Component, InputSignal, input } from '@angular/core';

/**
 * A reading page (changelog, privacy, terms): a title and one card, narrowed for reading. Wrap the content in
 * `<div class="markdown">` for the reading styles.
 */
@Component({
  selector: 'information-page',
  template: `
    <main class="max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-18">
      <h1 class="text-2xl/8 sm:text-3xl/9 font-bold text-strong">{{ title() }}</h1>
      @if (lastUpdated()) {
        <p class="mt-1 text-sm/5 text-muted">Last updated {{ lastUpdated() }}</p>
      }

      <div class="mt-6 px-5 py-6 sm:px-8 sm:py-8 rounded-2xl bg-card">
        <ng-content />
      </div>
    </main>
  `,
})
export class InformationPage {
  readonly title: InputSignal<string> = input.required();
  readonly lastUpdated: InputSignal<string | undefined> = input();
}
