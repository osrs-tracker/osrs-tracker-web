import { Directive, ElementRef, InputSignal, OnInit, effect, inject, input } from '@angular/core';
import { config } from 'src/config/config';
import { iconMap } from '../../../../config/icon.config';

@Directive({
  standalone: true,
  selector: 'img[icon]',
})
export class IconDirective implements OnInit {
  private readonly elementRef = inject(ElementRef);

  readonly name: InputSignal<string> = input.required();
  readonly skill: InputSignal<boolean> = input(false);
  readonly activity: InputSignal<boolean> = input(false);
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
    else if (this.skill()) this.element.src = `/assets/icons/skills/skill_icon_${this.norm(this.name())}1.gif`;
    else if (this.activity()) this.element.src = `/assets/icons/activities/game_icon_${this.norm(this.name())}.png`;
    else this.element.src = '/assets/icons' + iconMap[this.name()];
  }

  private norm(name: string): string {
    return name
      .toLocaleLowerCase()
      .replace(/[^a-z]/g, '')
      .toLowerCase();
  }
}
