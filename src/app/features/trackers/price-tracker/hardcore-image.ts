import { PriceWorld } from '@app/common/api/price-world';
import { PageImage } from '@app/common/seo/page-meta-strategy';

const HARDCORE_IMAGE: PageImage = {
  url: '/assets/og/hardcore-worlds-prices.png?v=1',
  width: 1200,
  height: 630,
  alt: 'OSRS Tracker: Grand Exchange prices on the Hardcore Worlds',
};

/**
 * The link preview of the Hardcore Worlds price pages without a card of their own (item pages have one): a shared link
 * otherwise looks like the main game's. None for main, which shows the site's.
 */
export const priceWorldImage = (world: PriceWorld): PageImage | undefined =>
  world === 'hardcore' ? HARDCORE_IMAGE : undefined;
