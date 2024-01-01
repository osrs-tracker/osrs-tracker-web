import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, WritableSignal, computed, signal } from '@angular/core';

@Component({
  standalone: true,
  selector: 'colored-value',
  template: `
    @if (_value != null) {
      <span [class.positive-value]="isPositive()" [class.negative-value]="isNegative()"
        >{{ absValue() | number: '1.1-1' }}
        @if (suffix) {
          {{ suffix }}
        }
      </span>
    } @else {
      &mdash;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
})
export class ColoredValueComponent {
  _value: WritableSignal<number | null | undefined> = signal(null);
  @Input() set value(value: number | null | undefined) {
    this._value.set(value);
  }
  @Input() suffix?: string;

  absValue = computed(() => Math.abs(this._value() ?? 0));
  isPositive = computed(() => (this._value() ?? 0) > 0);
  isNegative = computed(() => (this._value() ?? 0) < 0);
}
