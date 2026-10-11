import type { Item } from '@osrs-tracker/models';

/**
 * The item's link preview image: a 1200×630 PNG card with its icon, name, examine text, buy limit and alch values.
 * @param iconPng The Wiki icon's PNG bytes, or `undefined` when it failed to load: the card then shows an empty tile.
 */
export async function renderItemCard(item: Item, iconPng: Uint8Array | undefined): Promise<Uint8Array> {
  throw new Error(`Not implemented yet: ${item.id} ${iconPng?.length}`);
}
