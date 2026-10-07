import { Component, input, InputSignal } from '@angular/core';

/**
 * A pulsing placeholder block, sized by the classes on the host (e.g. `class="h-4 w-24"`). On a card it's one step
 * lighter than the card; `tone="ground"` is for blocks on the page ground. Hidden from screen readers, so the loading
 * region should say it's loading (e.g. `aria-busy` or a visually hidden "Loading…").
 */
@Component({
  selector: 'skeleton',
  template: '',
  host: {
    'class': 'skeleton',
    '[class.bg-card]': "tone() === 'ground'",
    'aria-hidden': 'true',
  },
})
export class SkeletonComponent {
  readonly tone: InputSignal<'card' | 'ground'> = input<'card' | 'ground'>('card');
}
