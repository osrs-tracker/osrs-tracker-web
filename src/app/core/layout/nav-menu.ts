import {
  Component,
  ElementRef,
  Injectable,
  InputSignal,
  Signal,
  WritableSignal,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/**
 * A top-level nav tab, link or menu button: on phones one of three equal tabs, underlined when current.
 * `current:` matches the link's `aria-current="page"` and the menu button's `aria-current="true"`.
 */
export const NAV_TAB =
  'relative flex grow items-center justify-center gap-1 max-sm:min-h-11 whitespace-nowrap max-xs:text-sm font-bold ' +
  'sm:hover:text-accent-hover current:text-accent max-sm:current:after:absolute max-sm:current:after:inset-x-0 ' +
  'max-sm:current:after:-bottom-1.5 max-sm:current:after:h-0.5 max-sm:current:after:rounded-xs ' +
  'max-sm:current:after:bg-accent';

/** Which nav menu is open (one at a time), and the current URL for the tabs. Provided by the root layout. */
@Injectable()
export class NavMenus {
  private readonly router = inject(Router);

  readonly open: WritableSignal<string | null> = signal(null);

  readonly url: Signal<string> = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  constructor() {
    // Following a row closes the menu, also on the way back and forward
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.open.set(null));
  }

  close(): void {
    this.open.set(null);
  }
}

/**
 * A nav tab that opens a menu of links (a disclosure, not an ARIA `menu`): under the nav's right edge on desktop, a
 * full-width sheet under the nav on phones. Escape, a click outside, focus leaving it and following a link close it.
 * The links are in the page while it's closed (hidden), so the server render still links every page for crawlers.
 */
@Component({
  selector: 'nav-menu',
  template: `
    <button
      #tab
      type="button"
      [class]="tabClass"
      [attr.aria-expanded]="isOpen()"
      [attr.aria-controls]="menuId()"
      [attr.aria-current]="current() ? 'true' : null"
      (click)="toggle()"
    >
      {{ label() }}
      <svg
        class="size-4 transition-transform motion-reduce:transition-none"
        [class.rotate-180]="isOpen()"
        [class.text-muted]="!current()"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <div
      class="absolute z-10 top-full bg-card shadow-float font-normal text-left max-sm:inset-x-0 max-sm:px-1.5 max-sm:pt-1 max-sm:pb-2.5 max-sm:rounded-b-2xl max-sm:border-b max-sm:border-line sm:right-6 sm:mt-1 sm:w-95 sm:p-2 sm:rounded-2xl sm:border sm:border-line"
      [class.hidden]="!isOpen()"
      [id]="menuId()"
      (click)="closeOnLink($event)"
    >
      <ng-content />
    </div>
  `,
  host: {
    'class': 'flex',
    '(document:click)': 'closeOnOutsideClick($event)',
    '(document:keydown.escape)': 'closeOnEscape()',
    '(focusout)': 'closeOnFocusOut($event)',
  },
})
export class NavMenu {
  private readonly navMenus = inject(NavMenus);
  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly tab: Signal<ElementRef<HTMLButtonElement>> = viewChild.required('tab');

  readonly label: InputSignal<string> = input.required();
  /** The menu panel's id, for `aria-controls` */
  readonly menuId: InputSignal<string> = input.required();
  /** Whether the current page is one of the menu's */
  readonly current: InputSignal<boolean> = input(false);

  protected readonly tabClass = NAV_TAB;
  readonly isOpen: Signal<boolean> = computed(() => this.navMenus.open() === this.menuId());

  protected toggle(): void {
    this.navMenus.open.set(this.isOpen() ? null : this.menuId());
  }

  protected closeOnLink(event: Event): void {
    // A link to the page already open doesn't navigate, so it wouldn't close the menu otherwise
    if ((event.target as Element).closest('a')) this.navMenus.close();
  }

  protected closeOnOutsideClick(event: Event): void {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target as Node)) this.navMenus.close();
  }

  protected closeOnEscape(): void {
    if (!this.isOpen()) return;
    this.navMenus.close();
    this.tab().nativeElement.focus();
  }

  protected closeOnFocusOut(event: FocusEvent): void {
    const to = event.relatedTarget as Node | null;
    if (this.isOpen() && to && !this.elementRef.nativeElement.contains(to)) this.navMenus.close();
  }
}

/** A row in a nav menu: a 40px tile (the content), a bold label, an optional "New" pill and a muted line under it */
@Component({
  selector: 'a[nav-menu-row]',
  template: `
    <span
      class="flex items-center justify-center size-10 shrink-0 rounded-xl bg-deep border border-line text-accent"
      aria-hidden="true"
    >
      <ng-content />
    </span>
    <span class="flex flex-col gap-0.5 min-w-0">
      <span class="flex items-center gap-2 font-bold text-base/5 text-strong">
        {{ label() }}
        @if (isNew()) {
          <span class="px-2 py-0.5 rounded-full text-xs bg-accent/16 text-accent">New</span>
        }
      </span>
      <span class="text-sm/4.5 text-muted">{{ sub() }}</span>
    </span>
  `,
  host: { class: 'flex items-center gap-3 min-h-11 px-2.5 py-2 max-sm:min-h-13 max-sm:py-1.5 rounded-xl hover:bg-row' },
})
export class NavMenuRow {
  readonly label: InputSignal<string> = input.required();
  readonly sub: InputSignal<string> = input.required();
  readonly isNew: InputSignal<boolean> = input(false);
}
