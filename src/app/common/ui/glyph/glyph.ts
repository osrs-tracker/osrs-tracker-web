import { Component, input } from '@angular/core';

export type GlyphName =
  | 'arrow-left'
  | 'arrow-right'
  | 'chevron-down'
  | 'clock'
  | 'close'
  | 'external-link'
  | 'newspaper'
  | 'refresh'
  | 'search'
  | 'search-x'
  | 'star'
  | 'triangle-alert'
  | 'user';

/**
 * A line glyph the site uses in more than one place, on a 24px grid with round caps and joins:
 * `<svg glyph="search" class="size-4.5" stroke-width="2.5" />`. Classes size and colour it like any inline SVG (a
 * `stroke-*` class wins over the `currentColor` stroke), and a `stroke-width` or `[attr.fill]` on the element wins over
 * the defaults here. Always decorative (`aria-hidden`): label the control around it. A glyph used once stays inline
 * where it's used. (`img[icon]` is for the game's pixel-art icons.)
 */
@Component({
  selector: 'svg[glyph]',
  host: {
    'viewBox': '0 0 24 24',
    'fill': 'none',
    'stroke': 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  },
  template: `
    @switch (glyph()) {
      @case ('arrow-left') {
        <svg:line x1="19" y1="12" x2="5" y2="12" />
        <svg:polyline points="11 6 5 12 11 18" />
      }
      @case ('arrow-right') {
        <svg:line x1="5" y1="12" x2="19" y2="12" />
        <svg:polyline points="13 6 19 12 13 18" />
      }
      @case ('chevron-down') {
        <svg:path d="m6 9 6 6 6-6" />
      }
      @case ('clock') {
        <svg:circle cx="12" cy="12" r="9" />
        <svg:polyline points="12 7 12 12 15.5 14" />
      }
      @case ('close') {
        <svg:path d="M18 6 6 18M6 6l12 12" />
      }
      @case ('external-link') {
        <svg:path d="M14 4h6v6" />
        <svg:path d="M20 4l-9 9" />
        <svg:path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
      }
      @case ('newspaper') {
        <svg:path
          d="M4 22h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"
        />
        <svg:path d="M16 14h-6M14 18h-4M10 6h6v4h-6z" />
      }
      @case ('refresh') {
        <svg:path
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
        />
      }
      @case ('search') {
        <svg:circle cx="11" cy="11" r="7" />
        <svg:line x1="21" y1="21" x2="16.65" y2="16.65" />
      }
      @case ('search-x') {
        <svg:circle cx="11" cy="11" r="7" />
        <svg:line x1="21" y1="21" x2="16.65" y2="16.65" />
        <svg:line x1="8.5" y1="8.5" x2="13.5" y2="13.5" />
        <svg:line x1="13.5" y1="8.5" x2="8.5" y2="13.5" />
      }
      @case ('star') {
        <svg:path d="M12 17.3l-6.2 3.6 1.6-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7z" />
      }
      @case ('triangle-alert') {
        <svg:path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        <svg:line x1="12" y1="9" x2="12" y2="13" />
        <svg:line x1="12" y1="17" x2="12.01" y2="17" />
      }
      @case ('user') {
        <svg:circle cx="12" cy="8" r="4" />
        <svg:path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      }
    }
  `,
})
export class Glyph {
  readonly glyph = input.required<GlyphName>();
}
