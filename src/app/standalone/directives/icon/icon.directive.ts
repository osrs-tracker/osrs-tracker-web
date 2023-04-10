import { Directive, ElementRef, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { config } from 'src/config/config';
import { iconMap } from './icon.config';

@Directive({
  standalone: true,
  selector: 'img[icon]',
})
export class IconDirective implements OnInit, OnChanges {
  @Input() name: string;
  @Input() wiki: boolean; // use icon from wiki

  get element(): HTMLImageElement {
    return this.elementRef.nativeElement;
  }

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    this.element.loading = 'lazy';
    this.element.style.imageRendering = 'pixelated';
  }

  ngOnChanges({ name }: SimpleChanges) {
    if (name?.currentValue) this.element.alt = `${this.name.replace(/\.png$/i, '')} icon`;
    this.updateUrl();
  }

  private updateUrl() {
    if (this.wiki) this.element.src = `${config.wikiBaseUrl}/images/${this.name.replaceAll(/\s/g, '_')}`;
    else this.element.src = '/assets/icons' + iconMap[this.name];
  }
}
