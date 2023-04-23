import { Injectable } from '@angular/core';
import { Meta } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root',
})
export class MetaService {
  constructor(private meta: Meta) {}

  setDefaultMeta(): void {
    this.meta.updateTag({
      name: 'description',
      content:
        'Track everything that matters in Old School Runescape with OSRS Tracker. Track the latest news, item prices, hiscores, and XP gains all in one place.',
    });
  }

  setPriceTrackerMeta(): void {
    this.meta.updateTag({
      name: 'description',
      content:
        'Keep track of real-time prices in Old School Runescape with the OSRS Price Tracker. Stay ahead of the market and make smart decisions with the latest pricing information.',
    });
  }

  setXpTrackerMeta(): void {
    this.meta.updateTag({
      name: 'description',
      content:
        "Track your daily Old School Runescape XP gains, completed Clue scrolls, Boss kills, and more with the OSRS XP Tracker. Keep up-to-date with you and your friends' progress to stay motivated.",
    });
  }
}
