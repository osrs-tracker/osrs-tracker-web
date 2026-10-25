import { Component, input } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';

/**
 * The phone button that opens a table row's details row below it, above the row's stretched link. The page keeps which
 * row is open, handles the click and labels it ("Details for <item>"), in its template so lint sees the label.
 */
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
  /** The id of the details row it opens */
  readonly detailsId = input.required<string>();
}
