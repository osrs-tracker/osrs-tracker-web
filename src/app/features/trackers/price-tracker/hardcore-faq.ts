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
    question: 'Why is a price old, or missing?',
    answer:
      'Hardcore Worlds opened on 4 November 2026 and fewer players trade there, so many items go hours without a trade, and some haven’t traded yet. Every price shows when it last traded.',
  },
];
