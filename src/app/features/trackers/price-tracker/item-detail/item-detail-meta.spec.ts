import { Item } from '@osrs-tracker/models';
import { describe, expect, it } from 'vitest';
import { itemDescription, itemPageMeta, itemTitle } from './item-detail-meta';

const whip = {
  id: 4151,
  name: 'Abyssal whip',
  examine: 'A weapon from the abyss.',
  icon: 'Abyssal whip.png',
  limit: 70,
  highalch: 72000,
} as Item;

describe('itemPageMeta', () => {
  it("shows the item's preview card, the server's /og/item/:id.png, as a large image", () => {
    const meta = itemPageMeta(whip);

    expect(meta.image).toEqual({ url: '/og/item/4151.png?v=2', width: 1200, height: 630, alt: 'Abyssal whip' });
    expect(meta.card).toBe('summary_large_image');
  });
});

describe('itemTitle', () => {
  it('names the item first, then only the facts it has', () => {
    expect(itemTitle(whip)).toBe('Abyssal whip - OSRS price, high alch and buy limit');
    expect(itemTitle({ ...whip, limit: 0 } as Item)).toBe('Abyssal whip - OSRS price and high alch');
    expect(itemTitle({ ...whip, limit: 0, highalch: 0 } as Item)).toBe('Abyssal whip - OSRS price');
  });
});

describe('itemDescription', () => {
  it('leads with the examine text, then the facts and what the page tracks', () => {
    expect(itemDescription(whip)).toBe(
      'A weapon from the abyss. Buy limit 70 · High alch 72,000 gp · Live Grand Exchange prices and price history.',
    );
    expect(itemDescription({ ...whip, examine: 'Swish swish' } as Item)).toMatch(/^Swish swish\. Buy limit/);
  });

  it("leaves out the facts that don't fit 160 characters, last first", () => {
    const description = itemDescription({ ...whip, examine: 'x'.repeat(90) + '.' } as Item);

    expect(description).toContain('Buy limit 70 · Live');
    expect(description).not.toContain('High alch');
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it('leaves out an examine text too long for 160 characters and keeps the facts', () => {
    expect(itemDescription({ ...whip, examine: 'x'.repeat(120) + '.' } as Item)).toBe(
      'Buy limit 70 · High alch 72,000 gp · Live Grand Exchange prices and price history.',
    );
  });
});
