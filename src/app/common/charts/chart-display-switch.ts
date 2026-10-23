import { booleanAttribute, Component, computed, inject, input, model } from '@angular/core';
import { LucideChartColumn, LucideChartLine, LucideTable } from '@lucide/angular';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { Segmented, SegmentedOption } from '@app/common/ui/controls/segmented';

/** What a chart's card shows: the chart, or its data as a table (`chart-table`) in the chart's place */
export type ChartDisplay = 'chart' | 'table';

/** A chart card's Chart/Table switch, beside its range or period: two icon pills, named for screen readers and on hover */
@Component({
  selector: 'chart-display-switch',
  template: `<segmented label="Show as" [options]="options()" [value]="display()" (valueChange)="choose($event)" />`,
  imports: [Segmented],
})
export class ChartDisplaySwitch {
  private readonly analyticsService = inject(AnalyticsService);

  readonly display = model<ChartDisplay>('chart');
  /** Names the chart in analytics, e.g. `item_price` */
  readonly chart = input.required<string>();
  /** A bar chart, which the chart icon then shows */
  readonly bars = input(false, { transform: booleanAttribute });

  readonly options = computed<SegmentedOption<ChartDisplay>[]>(() => [
    { value: 'chart', label: 'Chart', lucide: this.bars() ? LucideChartColumn : LucideChartLine },
    { value: 'table', label: 'Table', lucide: LucideTable },
  ]);

  protected choose(display: ChartDisplay): void {
    this.display.set(display);
    this.analyticsService.trackOption(`${this.chart()}_display`, display);
  }
}
