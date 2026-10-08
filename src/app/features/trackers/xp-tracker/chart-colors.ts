import { ACTIVITY_COLORS, ChartActivity, FALLBACK_COLORS } from './activity-colors';

type Lab = [number, number, number];

/** Closer than this (distance in OKLab), two activities on one chart read as the same colour */
export const MIN_DISTANCE = 0.1;

/**
 * Each charted activity's colour: its own, unless an activity with a larger total already has a colour too close to it.
 * Then it takes the fallback nearest its own colour that stays clear of the others, or the one furthest from them when
 * none does. Takes every activity with gains, also the hidden ones, so hiding one doesn't repaint the rest.
 */
export function chartColors(series: { name: string; total: number }[], dark: boolean): Map<string, string> {
  const theme = dark ? 'dark' : 'light';
  const fallbacks = FALLBACK_COLORS.map(colors => ({ color: colors[theme], lab: oklab(colors[theme]) }));
  const taken: Lab[] = [];
  const colors = new Map<string, string>();

  for (const { name } of [...series].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))) {
    const own = ACTIVITY_COLORS[name as ChartActivity][theme];
    const ownLab = oklab(own);
    const clearance = (lab: Lab): number => Math.min(Infinity, ...taken.map(other => distance(lab, other)));

    let pick = { color: own, lab: ownLab };
    if (clearance(ownLab) < MIN_DISTANCE) {
      const clear = fallbacks.filter(fallback => clearance(fallback.lab) >= MIN_DISTANCE);
      pick = clear.length
        ? minBy(clear, fallback => distance(fallback.lab, ownLab))
        : minBy(fallbacks, fallback => -clearance(fallback.lab));
    }
    taken.push(pick.lab);
    colors.set(name, pick.color);
  }
  return colors;
}

export function distance(a: Lab, b: Lab): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** A `#rrggbb` colour in OKLab */
export function oklab(hex: string): Lab {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function minBy<T>(items: T[], score: (item: T) => number): T {
  return items.reduce((best, item) => (score(item) < score(best) ? item : best));
}
