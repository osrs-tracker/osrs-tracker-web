/**
 * The Grand Exchange tax ("convenience fee") on selling an item, per the OSRS Wiki:
 * https://oldschool.runescape.wiki/w/Grand_Exchange#Convenience_fee_and_item_sink (last checked 2026-10-07).
 *
 * Jagex changes these rules in unpolled game-integrity updates. `npm run check:ge-tax` compares them with the Wiki, and
 * runs monthly in CI; see "Recheck the GE tax rules" in docs/runbook.md.
 */

/** 2% of the sale price per item, since 29 May 2025 (1% before); a whole percentage keeps the maths exact */
export const GE_TAX_PERCENT = 2;

/** The most tax paid on a single item */
export const GE_TAX_CAP = 5_000_000;

/** Items sold without tax, by item id */
export const GE_TAX_EXEMPT_IDS: ReadonlySet<number> = new Set([
  13190, // Old school bond
  3008, // Energy potion(4)
  3010, // Energy potion(3)
  3012, // Energy potion(2)
  3014, // Energy potion(1)
  882, // Bronze arrow
  884, // Iron arrow
  886, // Steel arrow
  806, // Bronze dart
  807, // Iron dart
  808, // Steel dart
  558, // Mind rune
  365, // Bass
  2309, // Bread
  1891, // Cake
  2140, // Cooked chicken
  2142, // Cooked meat
  347, // Herring
  379, // Lobster
  355, // Mackerel
  2327, // Meat pie
  351, // Pike
  329, // Salmon
  315, // Shrimps
  361, // Tuna
  8011, // Ardougne teleport (tablet)
  8010, // Camelot teleport (tablet)
  28824, // Civitas illa fortis teleport (tablet)
  8009, // Falador teleport (tablet)
  28790, // Kourend castle teleport (tablet)
  8008, // Lumbridge teleport (tablet)
  8007, // Varrock teleport (tablet)
  8013, // Teleport to house (tablet)
  3853, // Games necklace(8)
  2552, // Ring of dueling(8)
  1755, // Chisel
  5325, // Gardening trowel
  1785, // Glassblowing pipe
  2347, // Hammer
  1733, // Needle
  233, // Pestle and mortar
  5341, // Rake
  8794, // Saw
  5329, // Secateurs
  5343, // Seed dibber
  1735, // Shears
  952, // Spade
  5331, // Watering can
]);

export function isGeTaxExempt(itemId: number): boolean {
  return GE_TAX_EXEMPT_IDS.has(itemId);
}

/** The tax on selling one item at `price`: rounded down, so items sold below 50 gp pay none, and capped. */
export function geTax(itemId: number, price: number): number {
  if (isGeTaxExempt(itemId) || price <= 0) return 0;
  return Math.min(Math.floor((price * GE_TAX_PERCENT) / 100), GE_TAX_CAP);
}

/** The lowest price to sell one item at to get at least `buyPrice` back after tax. */
export function breakEvenSellPrice(itemId: number, buyPrice: number): number {
  if (buyPrice <= 0) return 0;

  // What's left after tax never drops when the price goes up, so start just above the uncapped estimate and step down
  let price = Math.max(buyPrice, Math.min(Math.ceil((buyPrice * 100) / (100 - GE_TAX_PERCENT)), buyPrice + GE_TAX_CAP));
  while (price - geTax(itemId, price) < buyPrice) price++;
  while (price > buyPrice && price - 1 - geTax(itemId, price - 1) >= buyPrice) price--;
  return price;
}
