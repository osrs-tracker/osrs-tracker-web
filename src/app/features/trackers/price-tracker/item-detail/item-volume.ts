import { formatDate } from '@angular/common';
import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { Segmented } from '@app/common/ui/controls/segmented';
import { ChartTable, ChartTableRow } from '@app/common/charts/chart-table';
import { ChartDisplay, ChartDisplaySwitch } from '@app/common/charts/chart-display-switch';
import { TimeBin, timeBinLabel } from '@app/common/charts/time-bins';
import { InfoTooltip } from '@app/common/ui/tooltip/info-tooltip';
import { formatWhole } from '@app/common/format/number-format';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { VolumeChart } from './charts/volume-chart';
import { BinVolume, DailyVolume } from './item-prices';
import { PRICE_RANGES, PriceRange, RANGE_OPTIONS } from './price-ranges';

export type VolumeChartState = 'loading' | 'failed' | 'not loaded' | 'ready';

type BinLabel = (start: number) => string;

/** The visitor's hours, UTC days and months (`binnedVolumes`) */
const BIN_LABELS: Record<TimeBin, { column: string; row: BinLabel; first: BinLabel; end: string }> = {
  hour: {
    column: 'Hour',
    row: start => timeBinLabel(start, 'hour'),
    first: start => formatDate(start, 'HH:mm', 'en-US'),
    end: 'Now',
  },
  day: {
    column: 'Day (UTC)',
    row: start => utc(start, 'EEE d MMM'),
    first: start => utc(start, 'd MMM'),
    end: 'Today (UTC)',
  },
  month: {
    column: 'Month (UTC)',
    row: start => utc(start, 'MMMM y'),
    first: start => utc(start, 'MMM y'),
    end: 'This month',
  },
};

function utc(start: number, format: string): string {
  return formatDate(start, format, 'en-US', 'UTC');
}

interface VolumeSummary {
  label: string;
  info: string;
  value: string;
}

@Component({
  selector: 'article[item-volume]',
  template: `
    <div class="flex flex-wrap items-center justify-between gap-2 min-h-14 px-5 py-1.5 border-b border-line">
      <h2 class="text-xl/6 font-bold text-strong">Trade volume</h2>
      @if (!error()) {
        <div class="flex flex-wrap gap-2">
          <segmented
            label="Volume range"
            [options]="RANGE_OPTIONS"
            [value]="range()"
            (valueChange)="selectRange($event)"
          />
          <chart-display-switch chart="item_volume" bars [(display)]="display" />
        </div>
      }
    </div>

    @if (error()) {
      <load-error class="flex-1" source="item-volume" message="Couldn't load the volume." (retry)="retry.emit()" />
    } @else {
      <dl class="grid sm:grid-cols-3 gap-px bg-line border-b border-line">
        @for (stat of summary(); track stat.label) {
          <div class="flex items-center justify-between gap-1 px-4 py-3 bg-card sm:flex-col sm:items-start sm:px-5">
            <dt class="flex items-center text-sm text-muted">
              {{ stat.label }}
              <info-tooltip [label]="'About ' + stat.label"
                ><ng-template>{{ stat.info }}</ng-template></info-tooltip
              >
            </dt>
            <dd class="flex items-center h-7 text-xl font-bold text-strong tabular-nums">
              @if (loading()) {
                <skeleton class="h-5 w-20" />
              } @else if (notLoaded()) {
                –
              } @else {
                {{ stat.value }}
              }
            </dd>
          </div>
        }
      </dl>

      <div class="relative flex-1 min-h-50 mx-5 mt-4 mb-2">
        @if (chart() === 'loading') {
          <skeleton class="absolute inset-0 h-full w-full rounded-xl" />
        } @else if (chart() === 'not loaded') {
          <!-- The price chart says the history didn't load, with a retry -->
          <p class="absolute inset-0 flex items-center justify-center text-sm text-muted">Not loaded</p>
        } @else if (chart() === 'failed') {
          <load-error
            class="absolute inset-0"
            source="item-volume-chart"
            message="Couldn't load the volume."
            (retry)="retryChart.emit()"
          />
        } @else if (empty()) {
          <p class="absolute inset-0 flex items-center justify-center px-5 text-center font-bold text-strong">
            No trades in the last {{ rangeTitle() }}
          </p>
        } @else {
          @if (display() === 'table') {
            <chart-table
              class="absolute inset-0"
              [caption]="tableCaption()"
              [columns]="tableColumns()"
              [rows]="table()"
            />
          }
          <!-- Hidden, not removed, behind the table: the chart is created once -->
          @defer {
            <volume-chart
              class="absolute inset-0"
              [class.hidden]="display() === 'table'"
              aria-hidden="true"
              [data]="chartData()"
            />
          } @placeholder {
            <skeleton class="absolute inset-0 h-full w-full rounded-xl" [class.hidden]="display() === 'table'" />
          }
        }
      </div>
      <!-- The chart's ends, kept while there's no chart so the card keeps its height -->
      <div
        class="flex justify-between px-5 text-sm text-muted"
        [class.invisible]="chart() !== 'ready' || empty() || display() === 'table'"
      >
        <span>{{ firstBin() }}</span>
        <span>{{ labels().end }}</span>
      </div>
      <div class="flex flex-wrap gap-x-5 gap-y-1 px-5 pt-3 pb-4 text-sm">
        <span class="flex items-center gap-1.5">
          <span class="size-2.5 rounded bg-accent" aria-hidden="true"></span>Bought (instant buy)
        </span>
        <span class="flex items-center gap-1.5">
          <span class="size-2.5 rounded bg-sold" aria-hidden="true"></span>Sold (instant sell)
        </span>
      </div>
    }
  `,
  host: { class: 'flex flex-col rounded-2xl bg-card overflow-hidden' },
  imports: [ChartDisplaySwitch, ChartTable, InfoTooltip, LoadError, Segmented, Skeleton, VolumeChart],
})
export class ItemVolume {
  private readonly analyticsService = inject(AnalyticsService);

  protected readonly RANGE_OPTIONS = RANGE_OPTIONS;

  /** Oldest first, today (so far) last */
  readonly volumes = input.required<DailyVolume[]>();
  readonly loading = input(false);
  readonly error = input(false);
  /** Shown elsewhere with a retry: the values are only marked */
  readonly notLoaded = input(false);

  readonly range = model.required<PriceRange>();
  readonly bins = input.required<BinVolume[]>();
  readonly chart = input<VolumeChartState>('loading');

  readonly retry = output();
  readonly retryChart = output();

  readonly display = signal<ChartDisplay>('chart');

  readonly summary = computed<VolumeSummary[]>(() => {
    const volumes = this.volumes();
    const today = volumes.at(-1);
    // Today isn't over yet, so the average is over the full days before it
    const fullDays = volumes.slice(0, -1);
    const average = fullDays.length
      ? fullDays.reduce((sum, { bought, sold }) => sum + bought + sold, 0) / fullDays.length
      : 0;

    return [
      { label: 'Bought today', info: 'Items bought at the instant buy price today (UTC).', value: today?.bought },
      { label: 'Sold today', info: 'Items sold at the instant sell price today (UTC).', value: today?.sold },
      {
        label: 'Daily average',
        info: `Average items traded per day (bought + sold) over the ${fullDays.length} full days before today.`,
        value: average,
      },
    ].map(stat => ({ ...stat, value: formatWhole(stat.value ?? 0) }));
  });

  private readonly bin = computed(() => PRICE_RANGES[this.range()].bin);
  readonly labels = computed(() => BIN_LABELS[this.bin()]);
  readonly rangeTitle = computed(() => PRICE_RANGES[this.range()].title);
  readonly chartData = computed(() => ({ volumes: this.bins(), bin: this.bin() }));

  readonly firstBin = computed(() => {
    const first = this.bins()[0];
    return first ? this.labels().first(first.start) : '';
  });

  readonly empty = computed(() => this.bins().every(({ bought, sold }) => !bought && !sold));

  readonly tableColumns = computed(() => [this.labels().column, 'Bought (items)', 'Sold (items)']);

  /** Newest first, as the question is usually about the last few days */
  readonly table = computed<ChartTableRow[]>(() =>
    this.bins()
      .map(({ start, bought, sold }) => ({
        key: start,
        cells: [this.labels().row(start), formatWhole(bought), formatWhole(sold)],
      }))
      .reverse(),
  );

  readonly tableCaption = computed(
    () =>
      `Items bought and sold per ${this.bin()} over the last ${this.rangeTitle()}, newest first` +
      (this.bin() === 'hour' ? ', in your time zone' : ''),
  );

  selectRange(range: PriceRange): void {
    this.range.set(range);
    this.analyticsService.trackOption('item_volume_range', range);
  }
}
