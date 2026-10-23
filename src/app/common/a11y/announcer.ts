import { LiveAnnouncer } from '@angular/cdk/a11y';
import { isPlatformBrowser } from '@angular/common';
import { effect, inject, Injector, PLATFORM_ID, Service } from '@angular/core';

/** How long a message must stay the same before it's read, so typing a filter reads only the last result */
export const ANNOUNCE_DELAY = 500;

/**
 * Polite messages for screen readers, through CDK's `LiveAnnouncer`: one live region for the whole page, which reads a
 * message even when the text that shows it is added at the same time (a region added with its text isn't read).
 * Browser only: the announcer adds its region to the page when created, on the server too, so it's looked up on the
 * first message.
 */
@Service()
export class Announcer {
  private readonly injector = inject(Injector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  announce(message: string): void {
    if (this.isBrowser && message) void this.injector.get(LiveAnnouncer).announce(message);
  }
}

/**
 * Reads `message` out whenever it changes to a new text that stays for `ANNOUNCE_DELAY`, such as a result count after a
 * filter, "No items match" or a failure. The first value isn't read: it's what the page loaded with. Return `null` while
 * there's nothing to say (loading). Call it in an injection context.
 */
export function announceChanges(message: () => string | null): void {
  const announcer = inject(Announcer);
  let first = true;

  effect(onCleanup => {
    const text = message();
    if (first) {
      first = false;
      return;
    }
    if (!text) return;

    const timeout = setTimeout(() => announcer.announce(text), ANNOUNCE_DELAY);
    onCleanup(() => clearTimeout(timeout));
  });
}
