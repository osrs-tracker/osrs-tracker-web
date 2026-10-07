import {
  BarController,
  CartesianScaleOptions,
  BarElement,
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
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
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeSeriesScale,
  Tooltip,
  Annotation,
);

let colors: { dark: boolean; values: Record<string, string> } | undefined;

/**
 * A theme colour token (`--line`, `--muted`…), read from the page so charts match it in both themes. Cached per theme,
 * since Chart.js asks for colours on every draw. Browser only, like drawing.
 */
function token(name: 'line' | 'muted' | 'text' | 'strong' | 'card' | 'border'): string {
  const dark = document.documentElement.classList.contains('dark');
  if (colors?.dark !== dark) colors = { dark, values: {} };
  return (colors.values[name] ??= getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim());
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
