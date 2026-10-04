import { DOCUMENT, Directive, ElementRef, InputSignal, OnInit, effect, inject, input } from '@angular/core';
import { WINDOW } from 'src/app/core/platform/window.token';
import { config } from 'src/config/config';
import { iconMap } from '../../../../config/icon.config';
import { LOCAL_ICONS } from './local-icons.token';

/** Factor the pixel art is upscaled to before the browser smoothly scales it down to `scale`. */
const SHARP_FACTOR = 4;

/** Upscaled versions (blob URLs) per source URL, shared by all icons for the lifetime of the app. */
const sharpUrls = new Map<string, Promise<string | null>>();
/** The same, once resolved, so later icons can show the upscaled version straight away. */
const resolvedSharpUrls = new Map<string, string>();

@Directive({
  selector: 'img[icon]',
})
export class IconDirective implements OnInit {
  private readonly elementRef = inject(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly window = inject(WINDOW);
  private readonly localIcons = inject(LOCAL_ICONS, { optional: true });

  readonly name: InputSignal<string> = input.required();
  readonly skill: InputSignal<boolean> = input(false);
  readonly activity: InputSignal<boolean> = input(false);
  readonly wiki: InputSignal<boolean> = input(false);
  /**
   * Scales the icon relative to its natural size. Pixel art only scales cleanly by whole factors, so for
   * fractional ones (e.g. 1.5) the icon is upscaled by `SHARP_FACTOR` with hard edges and then scaled down
   * smoothly ("sharp bilinear"): pixels stay crisp and evenly sized, only their borders get blended.
   */
  readonly scale: InputSignal<number | undefined> = input();

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

    const scale = this.scale();
    if (this.window && scale && !Number.isInteger(scale)) {
      this.element.addEventListener('load', () => this.sharpen(scale));
    }
  }

  private async sharpen(scale: number): Promise<void> {
    const img = this.element;
    const source = img.src;
    if (source.startsWith('blob:') || !img.naturalWidth) return;

    if (!sharpUrls.has(source)) sharpUrls.set(source, this.upscale(img));
    const sharpUrl = await sharpUrls.get(source);

    // the icon may have switched to another image while we were waiting
    if (sharpUrl && img.src === source) this.showSharp(sharpUrl, scale);
  }

  private upscale(img: HTMLImageElement): Promise<string | null> {
    const source = img.src;
    const canvas = this.document.createElement('canvas');
    canvas.width = img.naturalWidth * SHARP_FACTOR;
    canvas.height = img.naturalHeight * SHARP_FACTOR;
    const context = canvas.getContext('2d');
    if (!context) return Promise.resolve(null);

    context.imageSmoothingEnabled = false;
    context.drawImage(img, 0, 0, canvas.width, canvas.height);

    return new Promise(resolve => {
      try {
        canvas.toBlob(blob => {
          const url = blob ? URL.createObjectURL(blob) : null;
          if (url) resolvedSharpUrls.set(source, url);
          resolve(url);
        });
      } catch {
        resolve(null); // cross-origin image (wiki) taints the canvas; keep the plain pixelated version
      }
    });
  }

  private showSharp(sharpUrl: string, scale: number): void {
    this.element.src = sharpUrl;
    this.element.style.setProperty('zoom', `${scale / SHARP_FACTOR}`);
    this.element.style.imageRendering = 'auto';
  }

  private updateUrl() {
    const url = this.iconUrl();
    const scale = this.scale();

    // an icon that was upscaled before (e.g. on a previously visited player) can be shown right away
    const sharpUrl = this.window && scale ? resolvedSharpUrls.get(new URL(url, this.document.baseURI).href) : undefined;
    if (sharpUrl) return this.showSharp(sharpUrl, scale!);

    // sharpen() swaps these once the new image has loaded and been upscaled
    this.element.style.imageRendering = 'pixelated';
    if (scale) this.element.style.setProperty('zoom', `${scale}`);
    this.element.src = url;
  }

  private iconUrl(): string {
    if (this.wiki()) return `${config.wikiBaseUrl}/images/${this.name().replaceAll(/\s/g, '_')}`;

    const path = this.skill()
      ? `/skills/skill_icon_${this.norm(this.name())}1.gif`
      : this.activity()
        ? `/activities/game_icon_${this.norm(this.name())}.png`
        : iconMap[this.name()];

    // The server keeps the file URL, so the rendered HTML (which isn't cached) doesn't carry the data URIs.
    return (this.window && this.localIcons?.[path]) || '/assets/icons' + path;
  }

  private norm(name: string): string {
    return name
      .toLocaleLowerCase()
      .replace(/[^a-z]/g, '')
      .toLowerCase();
  }
}
