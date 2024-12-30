import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  InputSignal,
  OnDestroy,
  OnInit,
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
  selector: '[tooltip]',
  template: `
    <ng-content />

    <ng-template #tooltipTemplateContainer>
      <div
        class="max-w-xs shadow-lg text-slate-900 bg-slate-100 py-2 px-3 rounded-lg mb-2 "
        (mouseenter)="onMouseEnter()"
        (mouseleave)="onMouseLeave()"
      >
        <ng-template [ngTemplateOutlet]="tooltipTemplate()" />
      </div>
    </ng-template>

    <ng-template #tooltipTemplateArrow>
      <div class="relative mb-2">
        <div
          class="before:content-[''] before:absolute before:border-8 before:border-transparent before:border-t-slate-100 before:left-1/2 before:-translate-x-1/2 before:top-full"
          (mouseenter)="onMouseEnter()"
          (mouseleave)="onMouseLeave()"
        ></div>
      </div>
    </ng-template>
  `,
  imports: [NgTemplateOutlet, OverlayModule],
})
export class TooltipComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly elementRef = inject(ElementRef);
  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);

  mousePresent$ = new Subject<boolean>();

  isOpen = false;

  arrowOverlayRef?: OverlayRef;
  arrowTemplatePortal: TemplatePortal;

  containerOverlayRef?: OverlayRef;
  containerTemplatePortal: TemplatePortal;

  readonly tooltipTemplate: InputSignal<TemplateRef<unknown>> = input.required();
  readonly tooltipUnderline: InputSignal<boolean> = input(true);

  tooltipTemplateArrow: Signal<TemplateRef<unknown>> = viewChild.required('tooltipTemplateArrow');
  tooltipTemplateContainer: Signal<TemplateRef<unknown>> = viewChild.required('tooltipTemplateContainer');

  constructor() {
    fromEvent(this.elementRef.nativeElement, 'touchstart', { passive: true })
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.onMouseEnter());

    fromEvent(this.document, 'touchend', { passive: true })
      .pipe(takeUntilDestroyed())
      .subscribe(e => this.onDocumentTouchend(e.target as HTMLElement));

    this.mousePresent$.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(isPresent => {
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
  }

  ngOnInit(): void {
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

    this.mousePresent$.next(false); // emite false to be sure.
    this.mousePresent$.complete();
  }

  @HostListener('mouseenter') onMouseEnter() {
    this.mousePresent$.next(true);
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.mousePresent$.next(false);
  }

  private onDocumentTouchend(target: HTMLElement) {
    const found = [
      this.elementRef.nativeElement,
      this.containerOverlayRef?.hostElement,
      this.arrowOverlayRef?.hostElement,
    ].some(el => el?.contains(target));

    if (!found) this.mousePresent$.next(false);
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
