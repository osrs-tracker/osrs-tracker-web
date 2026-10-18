import { LiveAnnouncer } from '@angular/cdk/a11y';
import { DOCUMENT, Injector, Service, afterNextRender, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, pairwise } from 'rxjs';
import { WINDOW } from '@app/core/platform/window-token';

/**
 * After a client-side navigation, moves focus to the new page's `h1` (or `<main>` on a page without one) and announces
 * its title, so keyboard and screen-reader users start on the new page instead of on the link they followed or the
 * `body`. Not after the first navigation, which keeps the browser's own start on a loaded page. A navigation that only
 * changes the query or fragment of the same page leaves focus alone while it's in `<main>`: a control there wrote it
 * (the news filters). `preventScroll` leaves the scrolling to the router (`scrollPositionRestoration`).
 */
@Service()
export class RouteFocus {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly window = inject(WINDOW);

  start(): void {
    if (!this.window) return;

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(event => event.urlAfterRedirects.split(/[?#]/)[0]),
        pairwise(),
      )
      .subscribe(([previousPath, path]) => {
        afterNextRender(() => this.focusPage(previousPath === path), { injector: this.injector });
      });
  }

  private focusPage(samePage: boolean): void {
    const main = this.document.querySelector('main');
    if (!main) return;
    if (samePage && main.contains(this.document.activeElement)) return;

    const target = main.querySelector('h1') ?? main;
    // Focusable by script only, so it isn't a Tab stop
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    // Looked up here, as it adds its live region to the page when created (on the server too)
    void this.injector.get(LiveAnnouncer).announce(this.document.title);
  }
}
