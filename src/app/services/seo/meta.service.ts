import { Injectable } from '@angular/core';
import { Meta } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root',
})
export class MetaService {
  constructor(private meta: Meta) {}

  setHomeMeta(): void {
    this.meta.updateTag({
      name: 'description',
      content:
        'Keep track of everything that matters in Old School Runescape. Track the latest news, item prices, hiscores, and XP gains.',
    });
  }

  setPriceTrackerMeta(): void {
    this.meta.updateTag({
      name: 'description',
      content:
        'Track real-time prices for items in Old School Runescape. Fast, accurate, and up-to-date. Stay ahead of the market and make smart decisions.',
    });
  }

  setXpTrackerMeta(): void {
    this.meta.updateTag({
      name: 'description',
      content:
        'Monitor daily OSRS XP gains, Clue scrolls, Boss kills, and more for you & your friends. Stay up-to-date with your progress using the XP Tracker.',
    });
  }
}
