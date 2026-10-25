import { Component, input } from '@angular/core';

/**
 * `tone="ground"` is for blocks on the page ground. Hidden from screen readers, so the loading region should say it's
 * loading (e.g. `aria-busy` or a visually hidden "Loading…").
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
export class Skeleton {
  readonly tone = input<'card' | 'ground'>('card');
}
