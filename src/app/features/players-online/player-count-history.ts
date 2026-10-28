import { formatNumber, isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, PLATFORM_ID, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { format, isToday, isYesterday } from 'date-fns';
import { PLAYER_COUNT_RANGES, PlayerCountPoint, PlayerCountRange } from '@osrs-tracker/models';
import { map, of, tap } from 'rxjs';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { PlayerCountStore } from '@app/common/player-count/player-count-store';
import { ChartTable, ChartTableRow } from '@app/common/charts/chart-table';
import { ChartDisplay, ChartDisplaySwitch } from '@app/common/charts/chart-display-switch';
import { binByTime, TimeBin, timeBinLabel } from '@app/common/charts/time-bins';
import { Card } from '@app/common/ui/cards/card';
import { Segmented, SegmentedOption } from '@app/common/ui/controls/segmented';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { lineName, PlayerCountChart, PlayerCountSeries } from './player-count-chart';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** `slack`: how late the first point may be before the range counts as incomplete */
const RANGES: Record<
  PlayerCountRange,
  { label: string; title: string; name: string; bin: TimeBin; span?: number; slack?: number }
> = {
  '24h': { label: '24h', title: 'Last 24 hours', name: 'the last 24 hours', bin: 'hour', span: DAY, slack: HOUR },
  '7d': { label: '7D', title: 'Last 7 days', name: 'the last 7 days', bin: 'day', span: 7 * DAY, slack: HOUR },
  '30d': { label: '30D', title: 'Last 30 days', name: 'the last 30 days', bin: 'day', span: 30 * DAY, slack: 2 * HOUR },
  '1y': { label: '1Y', title: 'Last year', name: 'the last year', bin: 'month', span: 365 * DAY, slack: 2 * DAY },
  'all': { label: 'All', title: 'All time', name: 'all time', bin: 'month' },
};

const isDaily = (range: PlayerCountRange) => range === '1y' || range === 'all';
const fmt = (value: number) => formatNumber(value, 'en-US', '1.0-0');

@Component({
  selector: 'player-count-history',
  template: `
    <article card [attr.aria-busy]="switching() || null">
      <h2 title>History</h2>
      <div actions class="flex flex-wrap gap-2">
        <segmented label="Range" [options]="rangeOptions" [value]="range()" (valueChange)="selectRange($event)" />
        <chart-display-switch chart="player_count" [(display)]="display" />
      </div>

      <!-- Another range's chart stays while this one loads, dimmed after a moment so a quick load doesn't flicker -->
      <div [class]="switching() ? 'opacity-50 transition-opacity delay-300' : ''">
        <p class="flex items-center min-h-5 mb-4 text-sm text-muted">
          @if (peak(); as peak) {
            <span
              >{{ peak.label }} <span class="font-bold text-strong tabular-nums">{{ peak.value }}</span>
              {{ peak.when }}</span
            >
          } @else if (loading()) {
            <skeleton class="h-3 w-55 rounded-full" />
          }
        </p>

        @if (failed()) {
          <load-error
            class="block h-56 sm:h-70"
            source="player-count-history"
            message="The player count history didn't load."
            hint="The count at the top of the page is still current."
            (retry)="history.reload()"
          />
        } @else if (loading()) {
          <skeleton class="block h-56 sm:h-70 w-full rounded-xl" />
        } @else if (series(); as series) {
          @if (charted() && display() === 'table') {
            @let table = dataTable();
            <chart-table class="h-56 sm:h-70" [caption]="table.caption" [columns]="table.columns" [rows]="table.rows" />
          } @else if (charted()) {
            @defer {
              <player-count-chart
                class="block h-56 sm:h-70"
                role="img"
                [attr.aria-label]="chartLabel()"
                [data]="series"
              />
            } @placeholder {
              <skeleton class="block h-56 sm:h-70 w-full rounded-xl" />
            }
          } @else {
            <p
              class="flex items-center justify-center h-56 sm:h-70 p-3 rounded-xl border border-dashed border-line text-center text-muted"
            >
              @if (daily()) {
                Daily averages start once two full days are counted. Pick 24h or 7D for today's counts.
              } @else if (!series.points.length) {
                No players counted yet.
              } @else {
                Only one count so far. The chart starts with the next one, 10 minutes later.
              }
            </p>
          }
        }

        <div class="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 mt-4 text-sm">
          <!-- The table's columns name what the lines are; kept invisible so the card keeps its height -->
          @if (charted()) {
            <div class="flex flex-wrap gap-x-5 gap-y-2" [class.invisible]="display() === 'table'" aria-hidden="true">
              <span class="flex items-center gap-2"><span class="w-4.5 h-0.75 bg-accent"></span>{{ lineName() }}</span>
              @if (daily()) {
                <span class="flex items-center gap-2"
                  ><span class="w-4.5 border-t-2 border-dashed border-muted"></span>Daily peak</span
                >
              }
            </div>
          }
          @if (countingStarted(); as started) {
            <span class="text-muted"
              >Counting started on {{ started }}.{{
                series()?.range === 'all' ? '' : ' Longer ranges fill in from there.'
              }}</span
            >
          }
        </div>
      </div>

      <p class="-mx-card mt-4 px-card pt-4 border-t border-line text-sm text-muted text-pretty">
        Players on a world, counted from World Select every 10&nbsp;minutes. The lobby isn't a world, so the official
        total is a little higher.
      </p>
    </article>
  `,
  host: { class: 'block' },
  imports: [Card, ChartDisplaySwitch, ChartTable, LoadError, PlayerCountChart, Segmented, Skeleton],
})
export class PlayerCountHistory {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly locationOrder = input.required<readonly string[]>();

  readonly rangeOptions: SegmentedOption<PlayerCountRange>[] = PLAYER_COUNT_RANGES.map(range => ({
    value: range,
    label: RANGES[range].label,
    title: RANGES[range].title,
  }));
  readonly range = signal<PlayerCountRange>('24h');
  readonly display = signal<ChartDisplay>('chart');

  private readonly loaded = new Map<PlayerCountRange, PlayerCountPoint[]>();

  // Browser only: the server renders the loading state. A resource cancels the previous request when the range changes,
  // so a slow response can't overwrite a newer one
  readonly history = rxResource({
    params: () => (this.isBrowser ? this.range() : undefined),
    stream: ({ params: range }) => {
      const loaded = this.loaded.get(range);
      return loaded
        ? of(loaded)
        : this.osrsTrackerRepo.getPlayerCountHistory(range).pipe(
            map(points => (isDaily(range) ? points.map(point => ({ ...point, date: localDay(point.date) })) : points)),
            tap(points => this.loaded.set(range, points)),
          );
    },
  });

  /**
   * The drawn range and its points: kept while another range loads, so the chart stays until the next one replaces it,
   * and kept when a refresh fails
   */
  private readonly shown = linkedSignal<
    { range: PlayerCountRange; points: PlayerCountPoint[] | undefined },
    { range: PlayerCountRange; points: PlayerCountPoint[] } | undefined
  >({
    source: () => ({ range: this.range(), points: this.history.hasValue() ? this.history.value() : undefined }),
    computation: ({ range, points }, previous) => (points ? { range, points } : previous?.value),
  });

  readonly stale = computed(() => !!this.shown() && this.shown()!.range !== this.range());

  readonly loading = computed(() => !this.isBrowser || (this.history.isLoading() && !this.shown()));

  readonly failed = computed(() => !!this.history.error() && (!this.shown() || this.stale()));

  readonly switching = computed(() => this.stale() && !this.failed());

  readonly series = computed<PlayerCountSeries | undefined>(() => {
    const shown = this.shown();
    if (!shown || this.failed()) return undefined;
    const { range, points } = shown;
    return {
      range,
      points: isDaily(range) ? fullDays(points, startsCounting(range, points)) : points,
      locationOrder: this.locationOrder(),
    };
  });

  readonly daily = computed(() => isDaily(this.series()?.range ?? this.range()));
  readonly lineName = computed(() => lineName(this.series()?.range ?? this.range()));

  readonly charted = computed(() => (this.series()?.points.length ?? 0) > 1);

  readonly peak = computed(() => {
    const series = this.series();
    if (!series?.points.length) return undefined;
    const { range, points } = series;

    const peak = points.reduce((top, point) => ((point.peak ?? point.total) > (top.peak ?? top.total) ? point : top));
    const value = fmt(peak.peak ?? peak.total);
    if (isDaily(range)) return { label: 'Peak', value, when: `on ${format(peak.date, 'd MMMM yyyy')}` };

    const time = format(peak.date, 'HH:mm');
    const when = isToday(peak.date)
      ? `at ${time}`
      : isYesterday(peak.date)
        ? `at ${time} yesterday`
        : `on ${format(peak.date, 'EEEE d MMMM')} at ${time}`;
    // 30D's points are hourly averages: its peak is the busiest hour's
    return { label: range === '30d' ? 'Busiest hour' : 'Peak', value, when };
  });

  readonly countingStarted = computed(() => {
    const shown = this.series() && this.shown();
    return shown && startsCounting(shown.range, shown.points) ? format(shown.points[0].date, 'd MMMM yyyy') : undefined;
  });

  readonly chartLabel = computed(() => {
    const series = this.series();
    if (!series) return '';
    const totals = series.points.map(point => point.total);
    return (
      `${isDaily(series.range) ? 'Daily average players online' : 'Players online'} over ${RANGES[series.range].name}: ` +
      `between ${fmt(Math.min(...totals))} and ${fmt(Math.max(...totals))}`
    );
  });

  readonly dataTable = computed(() => {
    const series = this.series();
    if (!series) return { caption: '', columns: [], rows: [] };
    const { range, points } = series;
    const { bin, name } = RANGES[range];
    return {
      // The daily ranges' days are UTC days, drawn at the visitor's midnight
      caption: `Players online per ${bin} over ${name}, newest first${isDaily(range) ? ', in UTC days' : ', in your time zone'}`,
      columns: [
        bin[0].toUpperCase() + bin.slice(1),
        'Average (players)',
        range === '30d' ? 'Busiest hour (players)' : 'Peak (players)',
      ],
      rows: playerCountRows(points, bin),
    };
  });

  constructor() {
    inject(PlayerCountStore).watch(() => {
      this.loaded.clear();
      this.history.reload();
    });
  }

  selectRange(range: PlayerCountRange): void {
    this.range.set(range);
    this.analyticsService.trackOption('player_count_range', range);
  }
}

/** Per bin, newest first: the average count (the average of the daily averages on daily ranges) and the highest */
export function playerCountRows(points: PlayerCountPoint[], bin: TimeBin): ChartTableRow[] {
  return binByTime(points, point => point.date, bin).map(({ start, points }) => ({
    key: start,
    cells: [
      timeBinLabel(start, bin),
      fmt(points.reduce((sum, point) => sum + point.total, 0) / points.length),
      fmt(Math.max(...points.map(point => point.peak ?? point.total))),
    ],
  }));
}

export function startsCounting(range: PlayerCountRange, points: PlayerCountPoint[]): boolean {
  const { span, slack } = RANGES[range];
  return !!points.length && (span === undefined || points[0].date.getTime() >= Date.now() - span + slack!);
}

export function fullDays(points: PlayerCountPoint[], startsCounting: boolean): PlayerCountPoint[] {
  const today = localDay(new Date()).getTime();
  return points.filter((point, i) => point.date.getTime() !== today && !(i === 0 && startsCounting));
}

/** A daily point's UTC day as the viewer's own midnight, so the axis and the tooltip show that day in every time zone */
function localDay(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}
