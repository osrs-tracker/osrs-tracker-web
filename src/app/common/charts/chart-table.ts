import { Component, input } from '@angular/core';

/** `cells[0]` heads the row (the time), the rest are its values, already formatted */
export interface ChartTableRow {
  key: string | number;
  cells: string[];
}

/**
 * The canvas is the only other way to the values (WCAG 1.1.1). Takes the chart's size from its host and scrolls inside
 * it, so the card keeps its height.
 */
@Component({
  selector: 'chart-table',
  template: `
    <div
      class="grow min-h-0 overflow-y-auto rounded-xl border border-line"
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
              <th scope="col" class="py-2 px-4 align-bottom font-normal" [class]="$first ? 'text-left' : 'text-right'">
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
  `,
  host: { class: 'flex flex-col' },
})
export class ChartTable {
  readonly caption = input.required<string>();
  /** The row header's first, then the values' headers with their units */
  readonly columns = input.required<string[]>();
  readonly rows = input.required<ChartTableRow[]>();
}
