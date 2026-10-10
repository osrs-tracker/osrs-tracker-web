import { Component, InputSignal, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BROWSE_LETTERS, browseLetterLabel, startingWith } from './browse-letters';

/**
 * Links to every browse page as equal keys: one row on wide screens, two from `sm`, three of nine on phones. The
 * current letter is filled with the accent.
 */
@Component({
  selector: 'nav[letter-bar]',
  template: `
    @for (letter of LETTERS; track letter) {
      <a
        class="flex items-center justify-center h-10 rounded-xl font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        [class]="letter === current() ? 'bg-accent text-on-accent' : 'bg-card text-strong hover:bg-row'"
        [class.text-sm]="letter === '0'"
        [routerLink]="['/trackers/price/browse', letter]"
        [attr.aria-current]="letter === current() ? 'page' : null"
        [attr.aria-label]="'Items ' + startingWith(letter)"
        >{{ label(letter) }}</a
      >
    }
  `,
  host: {
    'class': 'grid grid-cols-9 sm:grid-cols-14 lg:grid-cols-27 gap-2',
    'aria-label': 'Browse items by first letter',
  },
  imports: [RouterLink],
})
export class LetterBar {
  readonly LETTERS = BROWSE_LETTERS;
  readonly label = browseLetterLabel;
  readonly startingWith = startingWith;

  /** The letter of the page it's on, if any */
  readonly current: InputSignal<string | undefined> = input<string>();
}
