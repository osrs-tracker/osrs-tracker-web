import { Directive, Signal, computed, input } from '@angular/core';
import { BaseChart } from '@app/common/charts/base-chart';
import { ChartDisplay } from '@app/common/charts/chart-display-switch';
import { Gains } from '../player-summary';
import { ChartSeries } from './log-chart-series';

@Directive()
export abstract class LogChart<TType extends 'line' | 'bar'> extends BaseChart<TType, Gains[]> {
  abstract readonly series: Signal<ChartSeries[]>;

  readonly tableCaption = input.required<string>();
  readonly display = input<ChartDisplay>('chart');
  /** The table in the plot's place; with nothing gained, the plot's message stays */
  readonly tableShown = computed(() => this.display() === 'table' && !!this.series().length);
}
