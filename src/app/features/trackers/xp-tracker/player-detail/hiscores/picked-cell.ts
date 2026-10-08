/**
 * Background of a picked hiscores cell: its chart colour, see-through like the chart legend's chips, over the cell's own
 * `--inner`. Mixing with `transparent` keeps the colour's hue; mixing with `--inner` (a blue slate) pulled every tint
 * toward violet.
 */
export function pickedCellBackground(color: string): string {
  const tint = `color-mix(in oklch, ${color} 18%, transparent)`;
  return `linear-gradient(${tint}, ${tint}), var(--inner)`;
}

/** Outline of a picked hiscores cell */
export function pickedCellRing(color: string): string {
  return `inset 0 0 0 2px ${color}`;
}
