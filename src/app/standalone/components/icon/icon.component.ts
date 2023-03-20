import { Directive, ElementRef, Input, OnInit } from '@angular/core';
import { iconMap } from './icon.config';

@Directive({
  standalone: true,
  selector: 'img[icon]',
})
export class IconDirective implements OnInit {
  @Input() name: string;

  constructor(private el: ElementRef) {}

  ngOnInit() {
    this.el.nativeElement.src = '/assets/icons' + iconMap[this.name];

    this.el.nativeElement.loading = 'lazy';
    this.el.nativeElement.alt = `${this.name} icon`;
    this.el.nativeElement.style.imageRendering = 'pixelated';
  }
}
