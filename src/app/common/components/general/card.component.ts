import { Component } from '@angular/core';

@Component({
  selector: 'article[card]',
  template: `
    <div class="flex justify-between gap-4 rounded-t-lg bg-slate-350 dark:bg-slate-700 px-4 py-2">
      <div class="font-bold text-slate-900 dark:text-white">
        <ng-content select="[title]" />
      </div>

      <ng-content select="[actions]" />
    </div>

    <div class="p-4">
      <ng-content />
    </div>
  `,
  host: {
    class: 'text-lg shadow-lg rounded-lg bg-slate-200 dark:bg-slate-800',
  },
})
export class CardComponent {}
