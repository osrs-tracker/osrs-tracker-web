import { Toolbar, ToolbarWidget, ToolbarWidgetGroup } from '@angular/aria/toolbar';
import {
  booleanAttribute,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  InputSignal,
  InputSignalWithTransform,
  model,
  ModelSignal,
  Signal,
  signal,
  viewChildren,
  WritableSignal,
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
 *
 * A radio group on `@angular/aria`'s toolbar: one Tab stop (the checked option), arrow keys move focus between the
 * options, Enter or Space chooses one. Disabled options stay reachable by the arrow keys (`aria-disabled`) but can't be
 * chosen, so keyboard users find them and their `title`.
 */
@Component({
  selector: 'segmented',
  template: `
    @for (option of options(); track option.value) {
      <button
        ngToolbarWidget
        type="button"
        role="radio"
        class="flex items-center justify-center gap-1.5 font-bold whitespace-nowrap aria-disabled:opacity-40 aria-disabled:cursor-default"
        [class]="
          variant() === 'slate'
            ? 'h-10 px-3.5 max-sm:flex-1 rounded-xl text-base ' +
              (option.value === value() ? 'bg-line text-strong' : 'text-muted hover:text-strong')
            : 'h-8 px-3 rounded-full text-sm ' + (option.value === value() ? 'bg-accent text-on-accent' : 'text-strong')
        "
        [attr.aria-checked]="option.value === value()"
        [attr.title]="option.title ?? null"
        [disabled]="!!option.disabled"
        (click)="option.disabled || value.set(option.value)"
      >
        @if (option.icon; as icon) {
          <img class="h-4 w-auto" icon [name]="icon.name" [skill]="!!icon.skill" aria-hidden="true" />
        }
        {{ option.label }}
      </button>
    }
  `,
  // The group adds Up and Down to the toolbar's Left and Right; the host's role replaces the toolbar's
  hostDirectives: [Toolbar, ToolbarWidgetGroup],
  host: {
    'role': 'radiogroup',
    '[attr.aria-label]': 'label()',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
    '[class]':
      "(stretch() ? 'grid grid-flow-col auto-cols-fr ' : 'flex w-fit max-w-full overflow-x-auto ') + " +
      "(variant() === 'slate' ? 'gap-1 p-1 rounded-2xl bg-ground' : 'p-1 rounded-full bg-inner')",
  },
  imports: [IconDirective, ToolbarWidget],
})
export class SegmentedComponent<T> {
  readonly options: InputSignal<SegmentedOption<T>[]> = input.required();
  readonly value: ModelSignal<T> = model.required();
  /** What the options choose between, e.g. "Period" */
  readonly label: InputSignal<string> = input.required();
  readonly variant: InputSignal<'accent' | 'slate'> = input<'accent' | 'slate'>('accent');
  readonly stretch: InputSignalWithTransform<boolean, unknown> = input(false, { transform: booleanAttribute });

  protected readonly focusWithin: WritableSignal<boolean> = signal(false);

  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly toolbar: Toolbar = inject(Toolbar);
  private readonly widgets: Signal<readonly ToolbarWidget[]> = viewChildren(ToolbarWidget);

  constructor() {
    // The toolbar makes its first option the Tab stop; a radio group's is the checked one. Set it while focus is
    // outside, so arrowing away and tabbing out comes back to the checked option. As an effect, it also runs during
    // SSR, so the server HTML has the Tab stop too. Uses the toolbar's pattern: aria has no public API for this yet.
    effect(() => {
      const checked = this.widgets()[this.options().findIndex(option => option.value === this.value())]?._pattern;
      const activeItem = this.toolbar._pattern.inputs.activeItem;
      if (checked && !checked.disabled() && !this.focusWithin() && activeItem() !== checked) activeItem.set(checked);
    });
  }

  /** Focus can also arrive by code (Home's switch): the focused option becomes the one the arrow keys start from. */
  protected onFocusIn(event: FocusEvent): void {
    this.focusWithin.set(true);
    const focused = this.widgets().find(widget => widget.element === event.target)?._pattern;
    if (focused) this.toolbar._pattern.inputs.activeItem.set(focused);
  }

  protected onFocusOut(event: FocusEvent): void {
    this.focusWithin.set(this.elementRef.nativeElement.contains(event.relatedTarget as Node | null));
  }
}
