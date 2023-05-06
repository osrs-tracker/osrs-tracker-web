import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NgTemplateOutlet } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';

@Component({
  standalone: true,
  selector: '[tooltip]',
  template: `
    <ng-content />

    <ng-template #tooltipTemplateContainer>
      <div
        class="max-w-xs shadow-lg text-slate-900 bg-slate-100 py-1 px-2 rounded-lg mb-2"
        (mouseenter)="onMouseEnter()"
        (mouseleave)="onMouseLeave()"
      >
        <ng-template [ngTemplateOutlet]="tooltipTemplate" />
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, OverlayModule],
})
export class TooltipComponent implements OnInit, AfterViewInit, OnDestroy {
  mousePresent$ = new Subject<boolean>();

  isOpen = false;

  arrowOverlayRef?: OverlayRef;
  arrowTemplatePortal: TemplatePortal;

  containerOverlayRef?: OverlayRef;
  containerTemplatePortal: TemplatePortal;

  @HostBinding('class.cursor-help') cursorHelp = true;

  @Input() tooltipTemplate: TemplateRef<unknown>;
  @ViewChild('tooltipTemplateArrow') tooltipTemplateArrow: TemplateRef<unknown>;
  @ViewChild('tooltipTemplateContainer') tooltipTemplateContainer: TemplateRef<unknown>;

  constructor(private elementRef: ElementRef, private overlay: Overlay, private viewContainerRef: ViewContainerRef) {
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
    this.elementRef.nativeElement.classList.add('border-b', 'border-dashed', '-mb-px');
  }

  ngAfterViewInit(): void {
    this.containerTemplatePortal = new TemplatePortal(this.tooltipTemplateContainer, this.viewContainerRef);
    this.arrowTemplatePortal = new TemplatePortal(this.tooltipTemplateArrow, this.viewContainerRef);
  }

  ngOnDestroy(): void {
    [this.arrowOverlayRef, this.containerOverlayRef].forEach(ref => (ref?.detach(), ref?.dispose()));

    this.mousePresent$.next(false); // emite false to be sure.
    this.mousePresent$.complete();
  }

  @HostListener('mouseenter') @HostListener('touchstart') onMouseEnter() {
    this.mousePresent$.next(true);
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.mousePresent$.next(false);
  }

  @HostListener('document:touchend', ['$event.target']) onDocumentTouchend(target: HTMLElement) {
    const found = [
      this.elementRef.nativeElement,
      this.containerOverlayRef?.hostElement,
      this.arrowOverlayRef?.hostElement,
    ].some(el => el.contains(target));

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
