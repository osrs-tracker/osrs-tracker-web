import { Directive, ElementRef, Input, OnInit } from '@angular/core';
import { config } from 'src/config/config';
import { iconMap } from './icon.config';

@Directive({
  standalone: true,
  selector: 'img[icon]',
})
export class IconDirective implements OnInit {
  @Input() name: string;
  @Input() wiki: boolean; // use icon from wiki

  constructor(private el: ElementRef) {}

  ngOnInit() {
    if (this.wiki) this.el.nativeElement.src = `${config.wikiBaseUrl}/images/${this.name.replaceAll(/\s/g, '_')}`;
    else this.el.nativeElement.src = '/assets/icons' + iconMap[this.name];

    this.el.nativeElement.loading = 'lazy';
    this.el.nativeElement.alt = `${this.name} icon`;
    this.el.nativeElement.style.imageRendering = 'pixelated';
  }
}
