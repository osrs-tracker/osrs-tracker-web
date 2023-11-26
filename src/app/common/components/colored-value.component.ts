import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges } from '@angular/core';

@Component({
  standalone: true,
  selector: 'colored-value',
  template: `
    @if (value != null) {
      {{ absValue | number: '1.1-1' }}
      @if (suffix) {
        {{ suffix }}
      }
    } @else {
      &mdash;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
})
export class ColoredValueComponent implements OnChanges {
  @Input() value: number | null | undefined;
  @Input() suffix?: string;

  get absValue(): number {
    return Math.abs(this.value!);
  }
  constructor(private elementRef: ElementRef) {}

  ngOnChanges(): void {
    this.elementRef.nativeElement.classList.toggle('positive', !!this.value && this.value > 0);
    this.elementRef.nativeElement.classList.toggle('negative', !!this.value && this.value < 0);
  }
}
