import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NgTemplateOutlet } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  HostListener,
  InputSignal,
  OnChanges,
  OnDestroy,
  Signal,
  TemplateRef,
  ViewContainerRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, fromEvent } from 'rxjs';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: '[tooltip]',
  template: `
    <ng-content />

    <ng-template #tooltipTemplateContainer>
      <div
        class="max-w-xs mb-2 px-3 py-2 rounded-xl border border-line bg-card text-sm text-text shadow-float"
        (mouseenter)="onMouseEnter()"
        (mouseleave)="onMouseLeave()"
      >
        <ng-template [ngTemplateOutlet]="tooltipTemplate()" />
      </div>
    </ng-template>

    <ng-template #tooltipTemplateArrow>
      <div class="relative mb-2">
        <div
          class="before:content-[''] before:absolute before:border-8 before:border-transparent before:border-t-line before:left-1/2 before:-translate-x-1/2 before:top-full"
          (mouseenter)="onMouseEnter()"
          (mouseleave)="onMouseLeave()"
        ></div>
      </div>
    </ng-template>
  `,
  imports: [NgTemplateOutlet, OverlayModule],
})
export class TooltipComponent implements OnChanges, AfterViewInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly elementRef = inject(ElementRef);
  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);

  mousePresent$ = new Subject<boolean>();

  private hovered = false;
  private focused = false;

  isOpen = false;

  arrowOverlayRef?: OverlayRef;
  arrowTemplatePortal: TemplatePortal;

  containerOverlayRef?: OverlayRef;
  containerTemplatePortal: TemplatePortal;

  /** When `false` is passed, the tooltip will be disabled. */
  readonly tooltip: InputSignal<string | boolean> = input<string | boolean>(true);
  readonly tooltipTemplate: InputSignal<TemplateRef<unknown>> = input.required();
  readonly tooltipUnderline: InputSignal<boolean> = input(true);

  readonly tooltipTemplateArrow: Signal<TemplateRef<unknown>> = viewChild.required('tooltipTemplateArrow');
  readonly tooltipTemplateContainer: Signal<TemplateRef<unknown>> = viewChild.required('tooltipTemplateContainer');

  constructor() {
    fromEvent(this.elementRef.nativeElement, 'touchstart', { passive: true })
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.onMouseEnter());

    fromEvent(this.document, 'touchend', { passive: true })
      .pipe(takeUntilDestroyed())
      .subscribe(e => this.onDocumentTouchend(e.target as HTMLElement));
  }

  ngOnChanges(): void {
    this.mousePresent$.complete(); // Complete any existing observable

    // Tooltip is not enabled => break early and complete the observable
    if (this.tooltip() === false) return;

    this.mousePresent$ = new Subject<boolean>(); // Recreate the subject if tooltip is enabled
    this.mousePresent$.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe(isPresent => {
      if (this.isOpen === isPresent) return;
      this.isOpen = isPresent;

      if (isPresent) {
        this.ensureOverlayRefs();
        this.containerOverlayRef!.attach(this.containerTemplatePortal);
        this.arrowOverlayRef!.attach(this.arrowTemplatePortal);
      } else {
        this.containerOverlayRef?.detach();
        this.arrowOverlayRef?.detach();
      }
    });

    if (this.tooltipUnderline()) {
      this.elementRef.nativeElement.classList.add('underline', 'underline-offset-[6px]', 'decoration-dotted');
    }
  }

  ngAfterViewInit(): void {
    this.containerTemplatePortal = new TemplatePortal(this.tooltipTemplateContainer(), this.viewContainerRef);
    this.arrowTemplatePortal = new TemplatePortal(this.tooltipTemplateArrow(), this.viewContainerRef);
  }

  ngOnDestroy(): void {
    [this.arrowOverlayRef, this.containerOverlayRef].forEach(ref => (ref?.detach(), ref?.dispose()));

    this.mousePresent$.next(false); // emit false to be sure.
    this.mousePresent$.complete();
  }

  @HostListener('mouseenter') onMouseEnter() {
    this.hovered = true;
    this.update();
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.hovered = false;
    this.update();
  }

  /** Keyboard focus opens it too (the hiscores grids, arrowed through); a click's focus doesn't, hover handles that */
  @HostListener('focusin') onFocusIn() {
    this.focused = this.elementRef.nativeElement.matches(':focus-visible');
    this.update();
  }

  @HostListener('focusout') onFocusOut() {
    this.focused = false;
    this.update();
  }

  @HostListener('keydown.escape') onEscape() {
    this.hovered = this.focused = false;
    this.update();
  }

  /** Hover and keyboard focus each keep it open, so leaving one doesn't close it while the other remains */
  private update() {
    this.mousePresent$.next(this.hovered || this.focused);
  }

  private onDocumentTouchend(target: HTMLElement) {
    const found = [
      this.elementRef.nativeElement,
      this.containerOverlayRef?.hostElement,
      this.arrowOverlayRef?.hostElement,
    ].some(el => el?.contains(target));

    if (!found) this.onMouseLeave();
  }

  private ensureOverlayRefs() {
    if (this.arrowOverlayRef && this.containerOverlayRef) return;

    [this.arrowOverlayRef, this.containerOverlayRef] = [this.arrowOverlayRef, this.containerOverlayRef].map(() =>
      this.overlay.create({
        positionStrategy: this.overlay
          .position()
          .flexibleConnectedTo(this.elementRef)
          .withPositions([
            {
              originX: 'center',
              originY: 'top',
              overlayX: 'center',
              overlayY: 'bottom',
            },
          ]),
        scrollStrategy: this.overlay.scrollStrategies.reposition(),
      }),
    );
  }
}
