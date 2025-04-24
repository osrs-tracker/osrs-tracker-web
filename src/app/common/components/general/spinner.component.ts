import { NgClass } from '@angular/common';
import { Component, computed, input, InputSignal, Signal } from '@angular/core';

@Component({
  standalone: true,
  selector: 'spinner',
  template: `
    <div role="status" aria-live="polite" [attr.aria-label]="ariaLabel()">
      <svg
        class="animate-spin"
        [ngClass]="sizeClasses()"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <span class="sr-only">{{ loadingText() }}</span>
    </div>
  `,
  imports: [NgClass],
})
export class SpinnerComponent {
  readonly size: InputSignal<number> = input(6);
  readonly text: InputSignal<string> = input('Loading...');
  readonly ariaLabel: Signal<string> = computed(() => this.text());
  readonly loadingText: Signal<string> = computed(() => this.text());
  readonly sizeClasses: Signal<string> = computed(() => `h-${this.size()} w-${this.size()}`);
}
