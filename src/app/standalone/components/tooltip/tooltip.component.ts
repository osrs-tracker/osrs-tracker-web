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
import { Subject, debounceTime } from 'rxjs';

@Component({
  standalone: true,
  selector: '[tooltip]',
  template: `
    <ng-content></ng-content>

    <ng-template #tooltipTemplateContainer>
      <div
        class="relative shadow-lg text-slate-900 bg-slate-300 py-1 px-2 rounded-lg mb-2"
        (mouseenter)="onMouseEnter()"
        (mouseleave)="onMouseLeave()"
      >
        <ng-template [ngTemplateOutlet]="tooltipTemplate"></ng-template>

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
  mousePresent$ = new Subject<boolean>();
  isOpen = false;

  overlayRef: OverlayRef;
  templatePortal: TemplatePortal;

  @HostBinding('class.cursor-help') cursorHelp = true;

  @Input() tooltipTemplate: TemplateRef<unknown>;
  @ViewChild('tooltipTemplateContainer') tooltipTemplateContainer: TemplateRef<unknown>;

  constructor(private elementRef: ElementRef, private viewContainerRef: ViewContainerRef, private overlay: Overlay) {}

  ngOnInit(): void {
    this.elementRef.nativeElement.classList.add('border-b', 'border-dashed');

    this.overlayRef = this.overlay.create({
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
    });

    this.mousePresent$.pipe(debounceTime(300)).subscribe(isPresent => {
      if (this.isOpen === isPresent) return;
      this.isOpen = isPresent;

      if (isPresent) this.overlayRef.attach(this.templatePortal);
      else this.overlayRef.detach();
    });
  }

  ngAfterViewInit(): void {
    this.templatePortal = new TemplatePortal(this.tooltipTemplateContainer, this.viewContainerRef);
  }

  ngOnDestroy(): void {
    this.overlayRef.detach();
    this.overlayRef.dispose();

    this.mousePresent$.complete();
  }

  @HostListener('mouseenter') onMouseEnter() {
    this.mousePresent$.next(true);
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.mousePresent$.next(false);
  }
}
