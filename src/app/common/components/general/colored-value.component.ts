import { DecimalPipe } from '@angular/common';
import { Component, InputSignal, computed, input } from '@angular/core';

@Component({
  standalone: true,
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
  value: InputSignal<number | null | undefined> = input<number | null | undefined>();
  suffix: InputSignal<string> = input('');

  absValue = computed(() => Math.abs(this.value() ?? 0));
  isPositive = computed(() => (this.value() ?? 0) > 0);
  isNegative = computed(() => (this.value() ?? 0) < 0);
}
