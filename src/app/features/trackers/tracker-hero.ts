import { Component, InputSignal, input } from '@angular/core';

/**
 * The tracker landing pages' hero: a dot-grid band with an icon tile (the `[icon]` content), the title with its
 * subject word accented, an intro and the rest of the content (the search) below.
 */
@Component({
  selector: 'header[tracker-hero]',
  template: `
    <div class="max-w-page mx-auto flex flex-col gap-6 px-4 sm:px-6 py-12">
      <div class="flex items-center gap-4">
        <span
          class="flex items-center justify-center size-14 shrink-0 rounded-2xl bg-card border border-line"
          aria-hidden="true"
        >
          <ng-content select="[icon]" />
        </span>
        <h1 class="text-4xl/none md:text-5xl/none font-bold text-strong">
          <span class="text-accent">{{ subject() }}</span> Tracker
        </h1>
      </div>

      <p class="max-w-150 text-lg text-muted">{{ intro() }}</p>

      <ng-content />
    </div>
  `,
  // Above the page content, so the item search's dropdown can overlap it
  host: { class: 'relative z-10 block bg-deep dot-grid border-b border-line' },
})
export class TrackerHero {
  /** The accented word before "Tracker", e.g. "XP". */
  readonly subject: InputSignal<string> = input.required();
  readonly intro: InputSignal<string> = input.required();
}
