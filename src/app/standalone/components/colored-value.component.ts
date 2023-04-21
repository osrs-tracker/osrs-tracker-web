import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges } from '@angular/core';

@Component({
  standalone: true,
  selector: 'colored-value',
  template: `
    <ng-template [ngIf]="value">
      {{ absValue | number : '1.1-1' }}
      <ng-template [ngIf]="suffix">{{ suffix }}</ng-template>
    </ng-template>
    <ng-template [ngIf]="!value">&mdash;</ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
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
