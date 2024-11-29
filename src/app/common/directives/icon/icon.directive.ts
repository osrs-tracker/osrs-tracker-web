import { Directive, ElementRef, InputSignal, OnInit, effect, inject, input } from '@angular/core';
import { config } from 'src/config/config';
import { iconMap } from './icon.config';

@Directive({
  standalone: true,
  selector: 'img[icon]',
})
export class IconDirective implements OnInit {
  private readonly elementRef = inject(ElementRef);

  readonly name: InputSignal<string> = input.required();
  readonly wiki: InputSignal<boolean> = input(false);

  get element(): HTMLImageElement {
    return this.elementRef.nativeElement;
  }

  constructor() {
    effect(() => {
      this.element.alt = `${this.name().replace(/\.png$/i, '')} icon`;
      this.updateUrl();
    });
  }

  ngOnInit() {
    this.element.loading = 'lazy';
    this.element.classList.add('object-contain');
    this.element.style.imageRendering = 'pixelated';
  }

  private updateUrl() {
    if (this.wiki()) this.element.src = `${config.wikiBaseUrl}/images/${this.name().replaceAll(/\s/g, '_')}`;
    else this.element.src = '/assets/icons' + iconMap[this.name()];
  }
}
