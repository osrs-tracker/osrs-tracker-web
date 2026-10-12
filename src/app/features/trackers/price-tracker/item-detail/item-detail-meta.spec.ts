import { Item } from '@osrs-tracker/models';
import { describe, expect, it } from 'vitest';
import { itemPageMeta } from './item-detail-meta';

const whip = { id: 4151, name: 'Abyssal whip', examine: 'A weapon from the abyss.', icon: 'Abyssal whip.png' } as Item;

describe('itemPageMeta', () => {
  it("shows the item's preview card, the server's /og/item/:id.png, as a large image", () => {
    const meta = itemPageMeta(whip);

    expect(meta.image).toEqual({ url: '/og/item/4151.png?v=1', width: 1200, height: 630, alt: 'Abyssal whip' });
    expect(meta.card).toBe('summary_large_image');
  });
});
