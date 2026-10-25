import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Marked } from 'marked';
import { markedSmartypants } from 'marked-smartypants';
import { InformationPage } from '@app/common/ui/page/information-page';

const markdown = new Marked({ async: false }, markedSmartypants());

const DAY_HEADING = /^## (\d{4}-\d{2}-\d{2})$/m;

interface ChangelogDay {
  /** `2026-10-23`, also the heading's id, so a day can be linked to */
  date: string;
  html: string;
}

@Component({
  selector: 'changelog',
  template: `
    <information-page title="Changelog">
      <nav intro class="flex flex-wrap items-center gap-2" aria-label="Years">
        @for (year of years(); track year.year) {
          <a routerLink="." [fragment]="year.firstDay" class="button--default button--rounded h-8 px-3 text-sm">
            {{ year.year }}
          </a>
        }
      </nav>

      <div class="markdown">
        @for (day of days(); track day.date) {
          <!-- Focusable by script, so a year link moves focus to its day -->
          <h2 [id]="day.date" tabindex="-1">{{ day.date | date: 'd MMMM y' }}</h2>
          <div [innerHTML]="day.html"></div>
        }
      </div>
    </information-page>
  `,
  imports: [DatePipe, InformationPage, RouterLink],
})
export default class Changelog {
  readonly changelog = input('');

  // Split on the date headings, which the template renders with ids (Angular's sanitizer strips `id` from `innerHTML`)
  readonly days = computed<ChangelogDay[]>(() => {
    const [, ...parts] = this.changelog().split(DAY_HEADING);
    const days: ChangelogDay[] = [];
    for (let i = 0; i < parts.length; i += 2) {
      days.push({ date: parts[i], html: markdown.parse(parts[i + 1]) as string });
    }
    return days;
  });

  readonly years = computed(() => {
    const years = new Map<string, string>();
    for (const { date } of this.days()) {
      const year = date.slice(0, 4);
      if (!years.has(year)) years.set(year, date);
    }
    return [...years].map(([year, firstDay]) => ({ year, firstDay }));
  });
}
