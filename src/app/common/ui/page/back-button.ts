import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

/**
 * Returns to the previous page of the app, or links home when there is none (the page was opened directly), so it
 * never leaves the site. Error pages keep the failed URL in place of their own, so going back skips them.
 */
@Component({
  selector: 'back-button',
  imports: [RouterLink],
  template: `
    @if (hasPrevious) {
      <button type="button" class="button--default button--rounded px-8" (click)="location.back()">Go back</button>
    } @else {
      <a routerLink="/" class="button--default button--rounded px-8">Back to home</a>
    }
  `,
})
export class BackButton {
  protected readonly location = inject(Location);

  // Read while the navigation to this page is still running, before it becomes the previous one
  protected readonly hasPrevious: boolean = !!inject(Router).currentNavigation()?.previousNavigation;
}
