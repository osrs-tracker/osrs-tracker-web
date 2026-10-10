import { iconPath, PLACEHOLDER_ICON } from '@app/common/icon/icon';

const DOT = 10;
const ICON = 18;
const GAP = 4;
export const MARKER_WIDTH = DOT + GAP + ICON;
export const MARKER_HEIGHT = ICON;
/** Drawn at this resolution, so markers stay sharp on high-density screens */
const RESOLUTION = 3;

/**
 * Tooltip markers (series color dot + icon) for Chart.js' `labelPointStyle`, cached per series. The icon is added once
 * it has loaded. Browser only.
 */
export class TooltipMarkers {
  readonly #markers = new Map<string, HTMLImageElement>();

  constructor(
    private readonly document: Document,
    private readonly kind: 'skill' | 'activity',
    private readonly localIcons: Readonly<Record<string, string>> | null,
  ) {}

  /** Marker of a series; it only has the dot while the icon loads, or if there is none */
  get(color: string, name: string): HTMLImageElement {
    const key = `${color}|${name}`;
    let marker = this.#markers.get(key);
    if (!marker) {
      marker = this.document.createElement('img');
      // the drawn size; the source is RESOLUTION times larger
      marker.width = MARKER_WIDTH;
      marker.height = MARKER_HEIGHT;
      this.#markers.set(key, marker);
      this.draw(marker, color, name);
    }
    return marker;
  }

  private draw(marker: HTMLImageElement, color: string, name: string): void {
    const canvas = this.document.createElement('canvas');
    canvas.width = MARKER_WIDTH * RESOLUTION;
    canvas.height = MARKER_HEIGHT * RESOLUTION;
    const context = canvas.getContext('2d')!;
    context.scale(RESOLUTION, RESOLUTION);

    context.fillStyle = color;
    context.beginPath();
    context.arc(DOT / 2, MARKER_HEIGHT / 2, DOT / 2, 0, 2 * Math.PI);
    context.fill();
    // always set a source: Chart.js draws the marker without checking it, and an image without one throws
    marker.src = canvas.toDataURL();

    const icon = this.document.createElement('img');
    icon.onload = () => {
      // fit the icon in its box; pixel art stays crisp unless it has to shrink
      const scale = Math.min(ICON / icon.naturalWidth, ICON / icon.naturalHeight, 1);
      const width = icon.naturalWidth * scale;
      const height = icon.naturalHeight * scale;
      context.imageSmoothingEnabled = scale < 1;
      context.drawImage(icon, DOT + GAP + (ICON - width) / 2, (ICON - height) / 2, width, height);
      marker.src = canvas.toDataURL();
    };
    // once: the placeholder is inline, so it can't fail in turn
    icon.onerror = () => {
      if (icon.src !== PLACEHOLDER_ICON) icon.src = PLACEHOLDER_ICON;
    };
    const path = iconPath(name, this.kind);
    // the bundled icons are complete, so a missing one is a name Jagex added: no request
    icon.src = this.localIcons ? (this.localIcons[path] ?? PLACEHOLDER_ICON) : '/assets/icons' + path;
  }
}
