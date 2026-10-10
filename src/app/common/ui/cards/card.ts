import { Component, input, InputSignal } from '@angular/core';

/**
 * A flat card with a header: a 56px one-line header (title and `[actions]`, e.g. a segmented control), or a two-line
 * one when there's a `subtitle`.
 */
@Component({
  selector: 'article[card]',
  template: `
    <div
      class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 px-5 border-b border-line"
      [class]="subtitle() ? 'py-4' : 'py-1.5 min-h-14'"
    >
      <div class="min-w-0">
        <div class="text-xl/6 font-bold text-strong">
          <ng-content select="[title]" />
        </div>
        @if (subtitle()) {
          <p class="mt-1 text-sm/4.5 text-muted">{{ subtitle() }}</p>
        }
      </div>

      <ng-content select="[actions]" />
    </div>

    <div class="px-5 py-4">
      <ng-content />
    </div>
  `,
  host: {
    class: 'block rounded-2xl bg-card',
  },
})
export class Card {
  readonly subtitle: InputSignal<string | undefined> = input();
}
