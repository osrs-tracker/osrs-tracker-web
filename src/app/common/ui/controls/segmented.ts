import { Toolbar, ToolbarWidget, ToolbarWidgetGroup } from '@angular/aria/toolbar';
import {
  booleanAttribute,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { LucideDynamicIcon, LucideIcon } from '@lucide/angular';
import { Icon } from '@app/common/icon/icon';
import { setToolbarTabStop } from './aria-tab-stop';

export interface SegmentedOption<T> {
  value: T;
  label: string;
  title?: string;
  disabled?: boolean;
  icon?: { name: string; skill?: boolean };
  /** Replaces the label, which names it for screen readers and on hover */
  lucide?: LucideIcon;
}

/**
 * `variant="slate"` is Home's Player/Item switch, beside the accent Search button. Disabled options stay reachable by
 * the arrow keys (`aria-disabled`) but can't be chosen, so keyboard users find them and their `title`. `picked` also
 * fires when the checked option is chosen again. `stretch` options pad 8px on phones, so the hiscores card's four fit a
 * 320px screen.
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
            ? 'h-10 px-3.5 max-sm:flex-1 md:max-xl:flex-1 rounded-xl text-base ' +
              (option.value === value() ? 'bg-line text-strong' : 'text-muted hover:text-strong')
            : (option.lucide ? 'h-8 px-2.5' : stretch() ? 'h-8 px-2 sm:px-3' : 'h-8 px-3') +
              ' rounded-full text-sm ' +
              (option.value === value()
                ? 'bg-accent text-on-accent'
                : 'text-strong hover:bg-row aria-disabled:hover:bg-transparent')
        "
        [attr.aria-checked]="option.value === value()"
        [attr.title]="option.title ?? (option.lucide ? option.label : null)"
        [disabled]="!!option.disabled"
        (click)="option.disabled || choose(option.value)"
      >
        @if (option.lucide; as lucide) {
          <svg class="size-4.5" [lucideIcon]="lucide" strokeWidth="2.5" aria-hidden="true" />
          <span class="sr-only">{{ option.label }}</span>
        } @else {
          @if (option.icon; as icon) {
            <img class="h-4 w-auto" icon alt="" [name]="icon.name" [skill]="!!icon.skill" aria-hidden="true" />
          }
          {{ option.label }}
        }
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
      "(variant() === 'slate' ? 'gap-1 p-1 rounded-2xl bg-ground' : (flush() ? '' : 'p-1 ') + 'rounded-full bg-inner')",
  },
  imports: [Icon, LucideDynamicIcon, ToolbarWidget],
})
export class Segmented<T> {
  readonly options = input.required<SegmentedOption<T>[]>();
  readonly value = model.required<T>();
  /** Every choice, also of the checked option, which `valueChange` skips */
  readonly picked = output<T>();
  readonly label = input.required<string>();
  readonly variant = input<'accent' | 'slate'>('accent');
  readonly stretch = input(false, { transform: booleanAttribute });
  /** No padding round the options, so the checked one lines up with the cards' edges above and below it */
  readonly flush = input(false, { transform: booleanAttribute });

  protected readonly focusWithin = signal(false);

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly toolbar = inject(Toolbar);
  private readonly widgets = viewChildren(ToolbarWidget);

  constructor() {
    // The toolbar makes its first option the Tab stop; a radio group's is the checked one. Set it while focus is
    // outside, so arrowing away and tabbing out comes back to the checked option. As an effect, it also runs during
    // SSR, so the server HTML has the Tab stop too.
    effect(() => {
      const index = this.options().findIndex(option => option.value === this.value());
      const checked = this.widgets()[index];
      if (checked && !this.options()[index].disabled && !this.focusWithin()) setToolbarTabStop(this.toolbar, checked);
    });
  }

  protected choose(value: T): void {
    this.value.set(value);
    this.picked.emit(value);
  }

  /** Focus can also arrive by code (Home's switch): the focused option becomes the one the arrow keys start from. */
  protected onFocusIn(event: FocusEvent): void {
    this.focusWithin.set(true);
    const focused = this.widgets().find(widget => widget.element === event.target);
    if (focused) setToolbarTabStop(this.toolbar, focused);
  }

  protected onFocusOut(event: FocusEvent): void {
    this.focusWithin.set(this.elementRef.nativeElement.contains(event.relatedTarget as Node | null));
  }
}
