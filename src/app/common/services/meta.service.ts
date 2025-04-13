import { Injectable, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root',
})
export class MetaService {
  private readonly meta = inject(Meta);

  setDefaultMeta(): void {
    this.meta.updateTag({
      name: 'description',
      content:
        'Track everything that matters in Old School RuneScape with OSRS Tracker. Track the latest news, item prices, hiscores, and XP gains all in one place.',
    });
  }

  setPriceTrackerMeta(): void {
    this.meta.updateTag({
      name: 'description',
      content:
        'Track real-time Old School RuneScape prices and market trends with OSRS Price Tracker. Stay ahead and make smart decisions with the latest pricing info!',
    });
  }

  setXpTrackerMeta(): void {
    this.meta.updateTag({
      name: 'description',
      content:
        "Track your Old School RuneScape XP gains, Clue scrolls, Boss kills easily with OSRS Tracker. Stay motivated by tracking both your and your friends' progress!",
    });
  }
}
