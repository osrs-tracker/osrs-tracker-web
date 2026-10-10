import {
  BarController,
  CartesianScaleOptions,
  BarElement,
  Chart,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  TimeSeriesScale,
  Tooltip,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import Annotation from 'chartjs-plugin-annotation';

/**
 * Shared Chart.js registrations, defaults and the date adapter, imported for its side effects by every chart component.
 *
 * Registration happens once at import time, so it's guaranteed to happen before any chart is created:
 * the annotation plugin needs to be registered globally (it registers its annotation element types on register),
 * and only initializes its state for charts that are created after it was registered.
 */
Chart.register(
  BarController,
  BarElement,
  Filler,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  TimeSeriesScale,
  Tooltip,
  Annotation,
);

let colors: { dark: boolean; values: Record<string, string> } | undefined;

/**
 * A theme colour token (`--line`, `--muted`…), read from the page so charts match it in both themes. Cached per theme,
 * since Chart.js asks for colours on every draw. Browser only, like drawing.
 */
export function token(name: 'line' | 'muted' | 'text' | 'strong' | 'card' | 'border' | 'accent' | 'orange'): string {
  const dark = document.documentElement.classList.contains('dark');
  if (colors?.dark !== dark) colors = { dark, values: {} };
  return (colors.values[name] ??= getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim());
}

/** `color` (an `oklch(…)` token or a `#rrggbb` hex colour) at `alpha` opacity, e.g. for the area under a line */
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#'))
    return (
      color +
      Math.round(alpha * 255)
        .toString(16)
        .padStart(2, '0')
    );
  return color.replace(/\)$/, ` / ${alpha})`);
}

Chart.defaults.font.family = 'SOLIX';
Chart.defaults.color = () => token('muted');
// Typed as any scale's, but only the cartesian scales (x and y) are used
const scale = Chart.defaults.scale as CartesianScaleOptions;
scale.grid.color = () => token('line');
// No axis lines, as in the design: the gridlines are enough
scale.border.display = false;
scale.ticks.color = () => token('muted');

Object.assign(Chart.defaults.plugins.tooltip, {
  backgroundColor: () => token('card'),
  borderColor: () => token('border'),
  borderWidth: 1,
  titleColor: () => token('strong'),
  bodyColor: () => token('text'),
  footerColor: () => token('muted'),
  padding: 12,
  cornerRadius: 12,
});
