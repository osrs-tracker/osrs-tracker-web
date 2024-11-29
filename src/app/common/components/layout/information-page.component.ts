import { Component, InputSignal, input } from '@angular/core';

@Component({
  selector: 'information-page',
  template: `
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold mb-4">{{ title() }}</h1>

      @if (lastUpdated()) {
        <p class="font-bold mb-4">Last updated: {{ lastUpdated() }}</p>
      }

      <div class="bg-slate-300 dark:bg-slate-700 shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <ng-content />
      </div>
    </div>
  `,
})
export class InformationPageComponent {
  readonly title: InputSignal<string> = input.required();
  readonly lastUpdated: InputSignal<string | undefined> = input();
}
