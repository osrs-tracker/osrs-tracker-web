import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
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
import { Subject, Subscription, debounceTime } from 'rxjs';

@Component({
  standalone: true,
  selector: '[tooltip]',
  template: `
    <ng-content></ng-content>

    <ng-template #tooltipTemplateContainer>
      <div
        class="max-w-xs shadow-lg text-slate-900 bg-slate-300 py-1 px-2 rounded-lg mb-2"
        (mouseenter)="onMouseEnter()"
        (mouseleave)="onMouseLeave()"
      >
        <ng-template [ngTemplateOutlet]="tooltipTemplate"></ng-template>
      </div>
    </ng-template>

    <ng-template #tooltipTemplateArrow>
      <div class="relative mb-2">
        <div
          class="before:content-[''] before:absolute before:border-8 before:border-transparent before:border-t-slate-300 before:left-1/2 before:-translate-x-1/2 before:top-full"
        ></div>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, OverlayModule],
})
export class TooltipComponent implements OnInit, AfterViewInit, OnDestroy {
  documentTouchend$: Subscription;
  mousePresent$ = new Subject<boolean>();

  isOpen = false;

  arrowOverlayRef: OverlayRef;
  arrowTemplatePortal: TemplatePortal;

  containerOverlayRef: OverlayRef;
  containerTemplatePortal: TemplatePortal;

  @HostBinding('class.cursor-help') cursorHelp = true;

  @Input() tooltipTemplate: TemplateRef<unknown>;
  @ViewChild('tooltipTemplateArrow') tooltipTemplateArrow: TemplateRef<unknown>;
  @ViewChild('tooltipTemplateContainer') tooltipTemplateContainer: TemplateRef<unknown>;

  constructor(private elementRef: ElementRef, private overlay: Overlay, private viewContainerRef: ViewContainerRef) {}

  ngOnInit(): void {
    this.elementRef.nativeElement.classList.add('border-b', 'border-dashed', '-mb-px');

    // seprate overlay for arrow and container so that arrow can be positioned relative to the component
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
      }),
    );

    this.mousePresent$.pipe(debounceTime(300)).subscribe(isPresent => {
      if (this.isOpen === isPresent) return;
      this.isOpen = isPresent;

      if (isPresent) {
        this.containerOverlayRef.attach(this.containerTemplatePortal);
        this.arrowOverlayRef.attach(this.arrowTemplatePortal);
      } else {
        this.containerOverlayRef.detach();
        this.arrowOverlayRef.detach();
      }
    });
  }

  ngAfterViewInit(): void {
    this.containerTemplatePortal = new TemplatePortal(this.tooltipTemplateContainer, this.viewContainerRef);
    this.arrowTemplatePortal = new TemplatePortal(this.tooltipTemplateArrow, this.viewContainerRef);
  }

  ngOnDestroy(): void {
    this.containerOverlayRef.detach();
    this.containerOverlayRef.dispose();

    this.arrowOverlayRef.detach();
    this.arrowOverlayRef.dispose();

    this.mousePresent$.complete();
    this.documentTouchend$.unsubscribe();
  }

  @HostListener('mouseenter') @HostListener('touchstart') onMouseEnter() {
    this.mousePresent$.next(true);
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.mousePresent$.next(false);
  }

  @HostListener('document:touchend', ['$event.target']) onDocumentTouchend(target: HTMLElement) {
    if (this.elementRef.nativeElement.contains(target) || this.containerOverlayRef.hostElement.contains(target)) return;
    this.mousePresent$.next(false);
  }
}