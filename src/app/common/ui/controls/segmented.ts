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
 * An option's `title` (e.g. Hardcore Worlds for HCW) is also read out after its label: a tooltip alone never reaches
 * touch, keyboard or screen-reader users. `variant="compact"` is the nav menu's 24px Main | HCW switch beside a group
 * heading; each option's tap area reaches 8px past it, so a phone tap needn't be exact (the 40px heading row it sits in
 * has room for that). `variant="slate"` is Home's Player | Main items | HCW items switch, above the search: equal-width
 * options on a row of their own, whose icons drop below 390px so the three labels fit a 320px screen. Disabled options
 * stay reachable by the arrow keys (`aria-disabled`) but can't be chosen, so keyboard users find them and their `title`. `picked` also
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
        class="flex items-center justify-center font-bold whitespace-nowrap aria-disabled:opacity-40 aria-disabled:cursor-default"
        [class]="
          variant() === 'compact'
            ? 'relative h-6 px-2.5 rounded-full text-xs before:absolute before:-inset-y-2 before:inset-x-0 first:before:-left-2 last:before:-right-2 ' +
              (option.value === value() ? 'bg-line text-strong' : 'text-muted hover:text-strong')
            : variant() === 'slate'
              ? 'h-10 flex-1 gap-1 px-2 sm:gap-1.5 sm:px-3.5 rounded-xl text-sm sm:text-base ' +
                (option.value === value() ? 'bg-line text-strong' : 'text-muted hover:text-strong')
              : 'gap-1.5 ' +
                (option.lucide ? 'h-8 px-2.5' : stretch() ? 'h-8 px-2 sm:px-3' : 'h-8 px-3') +
                ' rounded-full text-sm ' +
                (option.value === value()
                  ? 'bg-accent text-on-accent'
                  : 'text-strong hover:bg-row aria-disabled:hover:bg-transparent')
        "
        [attr.aria-checked]="option.value === value()"
        [attr.title]="option.title ?? (option.lucide ? option.label : null)"
        [attr.aria-label]="option.title && !option.lucide ? option.label + ' (' + option.title + ')' : null"
        [disabled]="!!option.disabled"
        (click)="option.disabled || choose(option.value)"
      >
        @if (option.lucide; as lucide) {
          <svg class="size-4.5" [lucideIcon]="lucide" strokeWidth="2.5" aria-hidden="true" />
          <span class="sr-only">{{ option.label }}</span>
        } @else {
          @if (option.icon; as icon) {
            <img
              [class]="variant() === 'slate' ? 'h-4 w-auto max-xs:hidden' : 'h-4 w-auto'"
              icon
              alt=""
              [name]="icon.name"
              [skill]="!!icon.skill"
              aria-hidden="true"
            />
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
      "(stretch() ? 'grid grid-flow-col auto-cols-fr ' : variant() === 'compact' ? 'flex w-fit ' : 'flex w-fit max-w-full overflow-x-auto ') + " +
      "(variant() === 'compact' ? 'gap-0.5 p-0.5 rounded-full bg-ground' : variant() === 'slate' ? 'gap-1 p-1 rounded-2xl bg-ground' : (flush() ? '' : 'p-1 ') + 'rounded-full bg-inner')",
  },
  imports: [Icon, LucideDynamicIcon, ToolbarWidget],
})
export class Segmented<T> {
  readonly options = input.required<SegmentedOption<T>[]>();
  readonly value = model.required<T>();
  /** Every choice, also of the checked option, which `valueChange` skips */
  readonly picked = output<T>();
  readonly label = input.required<string>();
  readonly variant = input<'accent' | 'slate' | 'compact'>('accent');
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
