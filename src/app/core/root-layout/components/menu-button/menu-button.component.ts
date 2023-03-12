import { ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';

@Component({
  selector: 'menu-button',
  template: `
    <button
      type="button"
      class="lg:hidden link-states--dark"
      (click)="menuCollapsedChange.next((menuCollapsed = !menuCollapsed))"
    >
      <svg
        *ngIf="!menuCollapsed"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="w-6 h-6"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>

      <svg
        *ngIf="menuCollapsed"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="w-6 h-6"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
        />
      </svg>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuButtonComponent {
  @HostBinding('class') class = 'flex';

  @Input() menuCollapsed: boolean;
  @Output() menuCollapsedChange: EventEmitter<boolean> = new EventEmitter<boolean>();
}
