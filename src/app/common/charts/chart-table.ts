import { Component, input, model } from '@angular/core';
import { LucideChevronRight } from '@lucide/angular';

/** A row of a chart's data table: `cells[0]` heads the row (the time), the rest are its values, already formatted */
export interface ChartTableRow {
  key: string | number;
  cells: string[];
}

/**
 * A chart's data as a table, behind a "Show the data" toggle under the chart: the canvas is the only other way to the
 * values (WCAG 1.1.1). Numbers are right-aligned with their units in the headers, which wrap so a phone fits three
 * columns.
 */
@Component({
  selector: 'chart-table',
  template: `
    <!-- Opened from the click, which comes before the layout changes (a card around it may measure itself first); the
    toggle event follows the browser opening it, e.g. for find in page -->
    <details #details class="group" [open]="open()" (toggle)="details.open !== open() && open.set(details.open)">
      <summary
        (click)="$event.preventDefault(); open.set(!open())"
        class="inline-flex items-center gap-1.5 rounded-sm text-sm font-bold text-accent hover:text-accent-hover cursor-pointer list-none [&::-webkit-details-marker]:hidden"
      >
        <svg
          lucideChevronRight
          class="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none"
          strokeWidth="2.5"
        />
        <span class="group-open:hidden">Show the data</span><span class="hidden group-open:inline">Hide the data</span>
      </summary>
      <div
        class="mt-3 max-h-80 overflow-y-auto rounded-xl border border-line"
        tabindex="0"
        role="region"
        [attr.aria-label]="caption()"
      >
        <table class="w-full text-sm">
          <caption class="px-4 pt-3 pb-2 text-left text-muted">
            {{
              caption()
            }}
          </caption>
          <thead class="sticky top-0 bg-card">
            <tr class="border-b border-line text-muted">
              @for (column of columns(); track column) {
                <th
                  scope="col"
                  class="py-2 px-4 align-bottom font-normal"
                  [class]="$first ? 'text-left' : 'text-right'"
                >
                  {{ column }}
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.key) {
              <tr class="border-b border-row last:border-b-0">
                @for (cell of row.cells; track $index) {
                  @if ($first) {
                    <th scope="row" class="py-2 px-4 text-left font-normal text-text whitespace-nowrap">{{ cell }}</th>
                  } @else {
                    <td class="py-2 px-4 text-right tabular-nums text-strong whitespace-nowrap">{{ cell }}</td>
                  }
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    </details>
  `,
  // `data-open` lets a fixed-height card around it grow while the table shows (`player-chart`)
  host: { '[attr.data-open]': 'open() || null' },
  imports: [LucideChevronRight],
})
export class ChartTable {
  /** What the table holds and over which period, e.g. "Average prices per day over the last week" */
  readonly caption = input.required<string>();
  /** Column headers with their units: the row header's first, e.g. "Day", "Instant buy (gp)" */
  readonly columns = input.required<string[]>();
  readonly rows = input.required<ChartTableRow[]>();
  /** Whether the table shows */
  readonly open = model(false);
}
