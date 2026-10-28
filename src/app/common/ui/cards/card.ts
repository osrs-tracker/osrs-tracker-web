import { Component, input } from '@angular/core';

@Component({
  selector: 'article[card]',
  template: `
    <div class="card-header" [class.py-4]="!!subtitle()">
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

    <div class="px-card py-4">
      <ng-content />
    </div>
  `,
  host: {
    class: 'block rounded-2xl bg-card',
  },
})
export class Card {
  readonly subtitle = input<string>();
}
