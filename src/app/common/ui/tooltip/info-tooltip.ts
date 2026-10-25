import { Component, TemplateRef, contentChild, input } from '@angular/core';
import { Tooltip } from './tooltip';
import { LucideInfo } from '@lucide/angular';

/**
 * A button so Tab reaches it and keyboard focus opens it; its hit area is 24px around the 14px icon (WCAG 2.5.8). The
 * content goes in an `<ng-template>`: the tooltip renders it twice (the description and the overlay), and projected
 * content only renders once, so opening the overlay would empty the description.
 */
@Component({
  selector: 'info-tooltip',
  template: `
    <button
      type="button"
      class="relative flex ml-1.5 rounded-full text-muted cursor-help before:absolute before:-inset-1.25 before:content-['']"
      tooltip
      [tooltipTemplate]="content()"
      [tooltipUnderline]="false"
      [attr.aria-label]="label()"
    >
      <svg lucideInfo class="size-3.5" strokeWidth="2.5" />
    </button>
  `,
  host: { class: 'flex items-center' },
  imports: [Tooltip, LucideInfo],
})
export class InfoTooltip {
  readonly label = input.required<string>();
  readonly content = contentChild.required(TemplateRef);
}
