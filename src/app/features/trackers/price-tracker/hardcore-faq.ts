export interface Faq {
  question: string;
  answer: string;
}

/** Shown on the Hardcore Worlds landing and described to search engines as its FAQPage */
export const HARDCORE_FAQ: Faq[] = [
  {
    question: 'Are Hardcore Worlds prices the same as the main game’s?',
    answer:
      'No. Hardcore Worlds have their own Grand Exchange and economy, separate from the main game, so prices differ, sometimes a lot.',
  },
  {
    question: 'Where do the prices come from?',
    answer:
      'From the OSRS Wiki’s real-time prices for Hardcore Worlds, built on Jagex’s Grand Exchange data. The latest prices refresh about every minute.',
  },
  {
    question: 'Why is a price old, or missing?',
    answer:
      'Hardcore Worlds opened on 4 November 2026 and fewer players trade there, so many items go hours without a trade, and some haven’t traded yet. Every price shows when it last traded.',
  },
  {
    question: 'How do I see the main game’s prices?',
    answer:
      'Pick Main in the switch beside the search box. Your favourites are the same in both, priced in the world you’re viewing; your recent lookups are kept per world.',
  },
];
