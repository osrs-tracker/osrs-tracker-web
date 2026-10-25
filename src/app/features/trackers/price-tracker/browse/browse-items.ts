import { Component, OnInit, RESPONSE_INIT, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatusPanel } from '@app/common/ui/page/status-panel';
import { ItemRow } from '../item-row';
import { RecentItem } from '../price-tracker-store';
import { startingWith } from './browse-letters';
import { LetterBar } from './letter-bar';
import { LucideArrowLeft } from '@lucide/angular';

/** A crawlable path to every item page. */
@Component({
  selector: 'browse-items',
  templateUrl: './browse-items.html',
  imports: [RouterLink, StatusPanel, ItemRow, LetterBar, LucideArrowLeft],
})
export default class BrowseItems implements OnInit {
  // Only available during SSR, `null` in the browser
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });

  readonly letter = input.required<string>();
  readonly items = input.required<RecentItem[] | null>();

  readonly heading = computed(() => `Items ${startingWith(this.letter())}`);

  ngOnInit(): void {
    if (!this.items() && this.responseInit) this.responseInit.status = 404;
  }
}
