import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'article[card]',
  template: `
    <div class="flex justify-between rounded-t-lg bg-slate-300 dark:bg-slate-700 px-4 py-2">
      <div class="font-bold">
        <ng-content select="[title]" />
      </div>

      <ng-content select="[actions]" />
    </div>

    <div class="p-4">
      <ng-content />
    </div>
  `,
  host: {
    class: 'text-lg shadow-lg rounded-lg bg-slate-100 dark:bg-slate-800',
  },
})
export class CardComponent {}
