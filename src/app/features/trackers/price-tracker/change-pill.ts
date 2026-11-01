import { Component, input } from '@angular/core';
import { PercentChange } from '@app/common/format/number-format';

@Component({
  selector: 'span[change-pill]',
  template: `{{ change().signed }}`,
  host: {
    '[class]': `
      'shrink-0 min-w-18 px-2.5 py-1 rounded-full text-center text-sm/4 font-bold whitespace-nowrap tabular-nums ' +
      (change().tone === 'up' ? 'text-up bg-up/16' : change().tone === 'down' ? 'text-down bg-down-pill' : 'text-muted bg-ground')
    `,
  },
})
export class ChangePill {
  readonly change = input.required<PercentChange>();
}
