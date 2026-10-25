import {
  Component,
  DestroyRef,
  ElementRef,
  Injectable,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { WINDOW } from '@app/core/platform/window-token';
import { LucideChevronDown } from '@lucide/angular';

/**
 * A top-level nav tab, link or menu button. From `sm` up the current one is accented (`current:` matches the link's
 * `aria-current="page"` and the menu button's `aria-current="true"`). On phones, one of three equal tabs: the marked one
 * (`data-marked`) is accented and underlined, which is the open menu's tab while one is open, so the underline sits
 * over the sheet, and the current one otherwise.
 */
export const NAV_TAB =
  'relative flex grow items-center justify-center gap-1 max-sm:min-h-11 whitespace-nowrap max-xs:text-sm font-bold ' +
  // Edge to edge on phones: an inset ring stays clear of the screen edge
  'max-sm:focus-visible:-outline-offset-2 ' +
  'sm:hover:text-accent-hover sm:current:text-accent max-sm:data-marked:text-accent ' +
  'max-sm:data-marked:after:absolute max-sm:data-marked:after:inset-x-0 max-sm:data-marked:after:-bottom-1.5 ' +
  'max-sm:data-marked:after:h-0.5 max-sm:data-marked:after:rounded-xs max-sm:data-marked:after:bg-accent';

/** Which nav menu is open (one at a time), and the current URL for the tabs. Provided by the root layout. */
@Injectable()
export class NavMenus {
  private readonly router = inject(Router);

  readonly open = signal<string | null>(null);

  readonly url = toSignal(
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
 * From `sm` up a mouse also opens it on hover and closes it on leaving the tab and panel, after short delays: the open
 * one skips a pass over the nav (not when another menu is open, so moving along the tabs switches at once), the close
 * one crosses the gap between tab and panel. A mouse click on a menu opened by hover keeps it open.
 * The links are in the page while it's closed (hidden), so the server render still links every page for crawlers.
 */
@Component({
  selector: 'nav-menu',
  imports: [LucideChevronDown],
  template: `
    <button
      #tab
      type="button"
      [class]="tabClass"
      [attr.aria-expanded]="isOpen()"
      [attr.aria-controls]="menuId()"
      [attr.aria-current]="current() ? 'true' : null"
      [attr.data-marked]="marked() ? '' : null"
      (click)="toggle($event)"
    >
      {{ label() }}
      <svg
        lucideChevronDown
        class="size-4 transition-transform motion-reduce:transition-none"
        [class]="chevronClass()"
        strokeWidth="2.5"
      />
    </button>

    <div
      class="absolute z-10 top-full bg-card shadow-float font-normal text-left max-sm:inset-x-0 max-sm:px-1.5 max-sm:pt-1 max-sm:pb-2.5 max-sm:rounded-b-2xl max-sm:border-b max-sm:border-line sm:right-6 sm:mt-1 sm:w-95 sm:p-2 sm:rounded-2xl sm:border sm:border-line"
      [class.hidden]="!isOpen()"
      [id]="menuId()"
    >
      <ng-content />
    </div>
  `,
  host: {
    'class': 'flex',
    '(document:click)': 'closeOnOutsideClick($event)',
    '(document:keydown.escape)': 'closeOnEscape()',
    '(window:scroll)': 'closeOnPhoneScroll()',
    '(focusout)': 'closeOnFocusOut($event)',
    '(pointerenter)': 'openOnHover($event)',
    '(pointerleave)': 'closeOnHoverEnd($event)',
  },
})
export class NavMenu {
  private readonly navMenus = inject(NavMenus);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly window = inject(WINDOW);
  private readonly tab = viewChild.required<ElementRef<HTMLButtonElement>>('tab');

  readonly label = input.required<string>();
  /** The menu panel's id, for `aria-controls` */
  readonly menuId = input.required<string>();
  /** Whether the current page is one of the menu's */
  readonly current = input(false);

  protected readonly tabClass = NAV_TAB;
  readonly isOpen = computed(() => this.navMenus.open() === this.menuId());
  protected readonly marked = computed(() => (this.navMenus.open() ? this.isOpen() : this.current()));
  /** One `[class]` binding: a Lucide icon rewrites its class attribute and drops `[class.x]` bindings true on creation */
  protected readonly chevronClass = computed(
    () => `${this.isOpen() ? 'rotate-180' : ''} ${!this.current() && !this.marked() ? 'text-muted' : ''}`,
  );

  /** Whether hover opened it, so leaving closes it; a mouse click keeps it open */
  private openedByHover = false;
  private hoverTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.hoverTimer));
  }

  protected toggle(event: MouseEvent): void {
    clearTimeout(this.hoverTimer);
    // A keyboard press (no clicks counted) still closes it
    if (this.isOpen() && this.openedByHover && event.detail > 0) {
      this.openedByHover = false;
      return;
    }
    this.openedByHover = false;
    this.navMenus.open.set(this.isOpen() ? null : this.menuId());
  }

  protected openOnHover(event: PointerEvent): void {
    if (!this.hovers(event)) return;
    clearTimeout(this.hoverTimer);
    if (this.isOpen()) return;
    const open = (): void => {
      this.openedByHover = true;
      this.navMenus.open.set(this.menuId());
    };
    if (this.navMenus.open()) open();
    else this.hoverTimer = setTimeout(open, 100);
  }

  protected closeOnHoverEnd(event: PointerEvent): void {
    if (!this.hovers(event)) return;
    clearTimeout(this.hoverTimer);
    if (this.isOpen() && this.openedByHover) {
      // Only if it's still this menu: moving on to the next tab opens that one
      this.hoverTimer = setTimeout(() => this.isOpen() && this.navMenus.close(), 300);
    }
  }

  /** A mouse on the desktop layout: touch sends pointer events on a tap too, and the phone sheet opens on taps only */
  private hovers(event: PointerEvent): boolean {
    return event.pointerType === 'mouse' && !!this.window?.matchMedia('(width >= 40rem)').matches;
  }

  protected closeOnOutsideClick(event: Event): void {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target as Node)) this.navMenus.close();
  }

  protected closeOnEscape(): void {
    if (!this.isOpen()) return;
    this.navMenus.close();
    this.tab().nativeElement.focus();
  }

  /** The nav scrolls away on phones (it's only sticky from `sm` up), so the sheet would leave the scrim behind */
  protected closeOnPhoneScroll(): void {
    if (this.isOpen() && this.window?.matchMedia('(width < 40rem)').matches) this.navMenus.close();
  }

  protected closeOnFocusOut(event: FocusEvent): void {
    const to = event.relatedTarget as Node | null;
    if (this.isOpen() && to && !this.elementRef.nativeElement.contains(to)) this.navMenus.close();
  }
}

/**
 * A row in a nav menu: a 40px tile (the content), a bold label, a "New" pill until `newUntil` and a muted line under it
 */
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
          <span class="px-2 py-0.5 rounded-full text-xs bg-accent/12 text-accent">New</span>
        }
      </span>
      <span class="text-sm/4.5 text-muted">{{ sub() }}</span>
    </span>
  `,
  host: {
    'class': 'flex items-center gap-3 min-h-11 px-2.5 py-2 max-sm:min-h-13 max-sm:py-1.5 rounded-xl hover:bg-row',
    // A link to the page already open doesn't navigate, so it wouldn't close the menu otherwise
    '(click)': 'navMenus.close()',
  },
})
export class NavMenuRow {
  protected readonly navMenus = inject(NavMenus);

  readonly label = input.required<string>();
  readonly sub = input.required<string>();
  /** The day (`YYYY-MM-DD`) the "New" pill stops showing, from midnight UTC, so server and browser agree */
  readonly newUntil = input<string>();

  protected readonly isNew = computed(() => {
    const until = this.newUntil();
    return !!until && Date.now() < Date.parse(`${until}T00:00:00Z`);
  });
}
