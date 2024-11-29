import { DecimalPipe } from '@angular/common';
import { Component, InputSignal, computed, input } from '@angular/core';

@Component({
  selector: 'colored-value',
  template: `
    @if (value() != null) {
      <span [class.positive-value]="isPositive()" [class.negative-value]="isNegative()">
        {{ absValue() | number: '1.1-1' }}
        @if (suffix()) {
          {{ suffix() }}
        }
      </span>
    } @else {
      &mdash;
    }
  `,
  imports: [DecimalPipe],
})
export class ColoredValueComponent {
  readonly value: InputSignal<number | null | undefined> = input<number | null | undefined>();
  readonly suffix: InputSignal<string> = input('');

  readonly absValue = computed(() => Math.abs(this.value() ?? 0));
  readonly isPositive = computed(() => (this.value() ?? 0) > 0);
  readonly isNegative = computed(() => (this.value() ?? 0) < 0);
}
