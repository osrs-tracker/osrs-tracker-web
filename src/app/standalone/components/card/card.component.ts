import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'article[card]',
  template: `
    <h2 class="font-semibold rounded-t-lg bg-slate-300 dark:bg-slate-700 px-4 py-2">
      <ng-content select="[title]"></ng-content>
    </h2>

    <div class="p-4">
      <ng-content></ng-content>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // eslint-disable-next-line @angular-eslint/no-host-metadata-property
  host: {
    class: 'text-lg shadow-lg rounded-lg bg-slate-100 dark:bg-slate-800',
  },
  imports: [CommonModule],
})
export class CardComponent {}
