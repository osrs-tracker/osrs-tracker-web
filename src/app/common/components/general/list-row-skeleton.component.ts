import { Component, computed, input, InputSignal, Signal } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/** Name bar widths, varied per row so a list of skeleton rows doesn't look like a barcode. */
const NAME_WIDTHS = ['w-32', 'w-24', 'w-36', 'w-28', 'w-20'];

/**
 * A loading row sized like a 65px player or item row: an icon tile, a name and meta line, and the value (a text bar
 * for players, a pill for items).
 */
@Component({
  selector: 'list-row-skeleton',
  template: `
    <skeleton class="size-10 max-sm:size-8 rounded-xl" />
    <div class="flex flex-1 flex-col gap-2 min-w-0 py-0.5">
      <skeleton class="h-4" [class]="nameWidth()" />
      <skeleton class="max-sm:hidden h-3" [class]="kind() === 'player' ? 'w-24' : 'w-16'" />
    </div>
    @if (kind() === 'player') {
      <skeleton class="h-4 w-22" />
    } @else {
      <skeleton class="sm:hidden h-3 w-12" />
      <skeleton class="h-6 w-18 rounded-full" />
    }
  `,
  host: {
    'class': 'flex items-center gap-3.5 max-sm:gap-3 px-5 max-sm:px-4 py-3 max-sm:py-2.5 border-b border-row bg-card',
    'aria-hidden': 'true',
  },
  imports: [SkeletonComponent],
})
export class ListRowSkeletonComponent {
  readonly kind: InputSignal<'player' | 'item'> = input.required();
  /** The row's position in the list, to vary the name bar. */
  readonly index: InputSignal<number> = input(0);

  readonly nameWidth: Signal<string> = computed(() => NAME_WIDTHS[this.index() % NAME_WIDTHS.length]);
}
