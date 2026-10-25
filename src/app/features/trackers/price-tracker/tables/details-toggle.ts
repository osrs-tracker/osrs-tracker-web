import { Component, input } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';

// The page sets `aria-label` in its template, where lint can see the button has a name
@Component({
  selector: 'button[details-toggle]',
  template: `
    <svg
      lucideChevronDown
      class="size-4.5 transition-transform motion-reduce:transition-none"
      [class]="open() ? 'rotate-180' : ''"
      strokeWidth="2.5"
    />
  `,
  host: {
    'type': 'button',
    'class':
      'relative z-1 inline-flex items-center justify-center size-7 -my-1 rounded-full text-muted hover:bg-inner hover:text-strong aria-expanded:bg-inner aria-expanded:text-strong',
    '[attr.aria-expanded]': 'open()',
    '[attr.aria-controls]': 'open() ? detailsId() : null',
  },
  imports: [LucideChevronDown],
})
export class DetailsToggle {
  readonly open = input.required<boolean>();
  readonly detailsId = input.required<string>();
}
