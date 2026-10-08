import {
  booleanAttribute,
  Component,
  input,
  InputSignal,
  InputSignalWithTransform,
  model,
  ModelSignal,
} from '@angular/core';
import { IconDirective } from 'src/app/common/directives/icon/icon.directive';

export interface SegmentedOption<T> {
  value: T;
  label: string;
  /** Shown on hover */
  title?: string;
  disabled?: boolean;
  /** A decorative icon before the label */
  icon?: { name: string; skill?: boolean };
}

/**
 * A segmented control: 32px pills on a 4px track, the selected one accent-filled. `variant="slate"` is Home's
 * Player/Item switch, which sits beside the accent Search button; on phones its options share the width it's given.
 * `stretch` gives every option the same width.
 */
@Component({
  selector: 'segmented',
  template: `
    @for (option of options(); track option.value) {
      <button
        type="button"
        class="flex items-center justify-center gap-1.5 font-bold whitespace-nowrap disabled:opacity-40 disabled:cursor-default"
        [class]="
          variant() === 'slate'
            ? 'h-10 px-3.5 max-sm:flex-1 rounded-xl text-base ' +
              (option.value === value() ? 'bg-line text-strong' : 'text-muted hover:text-strong')
            : 'h-8 px-3 rounded-full text-sm ' + (option.value === value() ? 'bg-accent text-on-accent' : 'text-strong')
        "
        [attr.aria-pressed]="option.value === value()"
        [attr.title]="option.title ?? null"
        [disabled]="option.disabled"
        (click)="value.set(option.value)"
      >
        @if (option.icon; as icon) {
          <img class="h-4 w-auto" icon [name]="icon.name" [skill]="!!icon.skill" aria-hidden="true" />
        }
        {{ option.label }}
      </button>
    }
  `,
  host: {
    'role': 'group',
    '[attr.aria-label]': 'label()',
    '[class]':
      "(stretch() ? 'grid grid-flow-col auto-cols-fr ' : 'flex w-fit max-w-full overflow-x-auto ') + " +
      "(variant() === 'slate' ? 'gap-1 p-1 rounded-2xl bg-ground' : 'p-1 rounded-full bg-inner')",
  },
  imports: [IconDirective],
})
export class SegmentedComponent<T> {
  readonly options: InputSignal<SegmentedOption<T>[]> = input.required();
  readonly value: ModelSignal<T> = model.required();
  /** What the options choose between, e.g. "Period" */
  readonly label: InputSignal<string> = input.required();
  readonly variant: InputSignal<'accent' | 'slate'> = input<'accent' | 'slate'>('accent');
  readonly stretch: InputSignalWithTransform<boolean, unknown> = input(false, { transform: booleanAttribute });
}
