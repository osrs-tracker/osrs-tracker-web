import { Component, input } from '@angular/core';
import { Skeleton } from '@app/common/ui/loading/skeleton';

/** Name bar widths, varied per row so the skeleton rows don't look like a barcode */
export const ITEM_SKELETON_WIDTHS = ['w-40', 'w-30', 'w-46', 'w-34', 'w-26', 'w-38', 'w-32', 'w-44', 'w-28', 'w-36'];

/** A loading row's item cell, the icon and the name, in the price tables and New on the GE */
@Component({
  selector: 'td[item-cell-skeleton]',
  template: `
    <span class="flex items-center gap-3">
      <skeleton class="size-8 rounded-xl" />
      <skeleton class="h-4" [class]="width()" />
    </span>
  `,
  host: { class: 'py-3 pl-5 max-sm:pl-4 pr-3' },
  imports: [Skeleton],
})
export class ItemCellSkeleton {
  /** The name bar's, one of `ITEM_SKELETON_WIDTHS` */
  readonly width = input.required<string>();
}
