/** Mixing with `transparent` keeps the colour's hue; `--inner` (a blue slate) pulled every tint toward violet. */
export function pickedCellBackground(color: string): string {
  const tint = `color-mix(in oklch, ${color} 18%, transparent)`;
  return `linear-gradient(${tint}, ${tint}), var(--inner)`;
}

export function pickedCellRing(color: string): string {
  return `inset 0 0 0 2px ${color}`;
}

export function pickableCellRing(color: string): string {
  return `inset 0 0 0 1px ${color}`;
}

export function rowsOfThree<T>(cells: T[]): T[][] {
  return Array.from({ length: Math.ceil(cells.length / 3) }, (_, i) => cells.slice(i * 3, i * 3 + 3));
}
