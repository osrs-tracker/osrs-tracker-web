import { formatNumber, isPlatformBrowser } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  InputSignal,
  PLATFORM_ID,
  ResourceRef,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { format, isToday, isYesterday } from 'date-fns';
import { map } from 'rxjs';
import { AnalyticsService } from '@app/common/analytics/analytics-service';
import { OsrsTrackerRepo, PlayerCountPoint, PlayerCountRange } from '@app/common/api/osrs-tracker-repo';
import { Card } from '@app/common/ui/cards/card';
import { Segmented, SegmentedOption } from '@app/common/ui/controls/segmented';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { lineName, PlayerCountChart, PlayerCountSeries } from './player-count-chart';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Each range's name, how far back it reaches and how late its first point may be before it counts as incomplete */
const RANGES: Record<PlayerCountRange, { label: string; title: string; name: string; span?: number; slack?: number }> =
  {
    '24h': { label: '24h', title: 'Last 24 hours', name: 'the last 24 hours', span: DAY, slack: HOUR },
    '7d': { label: '7D', title: 'Last 7 days', name: 'the last 7 days', span: 7 * DAY, slack: HOUR },
    '30d': { label: '30D', title: 'Last 30 days', name: 'the last 30 days', span: 30 * DAY, slack: 2 * HOUR },
    '1y': { label: '1Y', title: 'Last year', name: 'the last year', span: 365 * DAY, slack: 2 * DAY },
    'all': { label: 'All', title: 'All time', name: 'all time' },
  };

const isDaily = (range: PlayerCountRange) => range === '1y' || range === 'all';
const fmt = (value: number) => formatNumber(value, 'en-US', '1.0-0');

/**
 * The player count over a range, drawn in the browser: the range's peak, the chart and its legend. Daily ranges show a
 * panel instead of a chart until there's more than one day.
 */
@Component({
  selector: 'player-count-history',
  template: `
    <article card>
      <h2 title>History</h2>
      <segmented actions label="Range" [options]="rangeOptions" [value]="range()" (valueChange)="selectRange($event)" />

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

      @if (history.error()) {
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
        @if (series.points.length > 1) {
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
            class="flex items-center justify-center h-56 sm:h-70 p-6 rounded-xl border border-dashed border-line text-center text-muted"
          >
            @if (!series.points.length) {
              No players counted yet.
            } @else if (daily()) {
              Daily averages start once {{ firstDay() }} is complete. Pick 24h or 7D for today's counts.
            } @else {
              Only one count so far. The chart starts with the next one, 10 minutes later.
            }
          </p>
        }
      }

      <div class="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 mt-4 text-sm">
        @if (!singleDay()) {
          <div class="flex flex-wrap gap-x-5 gap-y-2" aria-hidden="true">
            <span class="flex items-center gap-2"><span class="w-4.5 h-0.75 bg-accent"></span>{{ lineName() }}</span>
            @if (daily()) {
              <span class="flex items-center gap-2"
                ><span class="w-4.5 border-t-2 border-dashed border-muted"></span>Daily peak</span
              >
            }
          </div>
        }
        @if (countingStarted(); as started) {
          <span class="text-muted">Counting started on {{ started }}. Longer ranges fill in from there.</span>
        }
      </div>
    </article>
  `,
  host: { class: 'block' },
  imports: [Card, LoadError, PlayerCountChart, Segmented, Skeleton],
})
export class PlayerCountHistory {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** The hero card's order of locations, which the tooltip keeps */
  readonly locationOrder: InputSignal<readonly string[]> = input.required();

  readonly rangeOptions: SegmentedOption<PlayerCountRange>[] = (Object.keys(RANGES) as PlayerCountRange[]).map(
    range => ({ value: range, label: RANGES[range].label, title: RANGES[range].title }),
  );
  readonly range: WritableSignal<PlayerCountRange> = signal('24h');
  readonly daily: Signal<boolean> = computed(() => isDaily(this.range()));
  readonly lineName: Signal<string> = computed(() => lineName(this.range()));

  // Browser only: the server renders the loading state. A resource cancels the previous request when the range changes,
  // so a slow response can't overwrite a newer one
  readonly history: ResourceRef<PlayerCountPoint[] | undefined> = rxResource({
    params: () => (this.isBrowser ? this.range() : undefined),
    stream: ({ params: range }) =>
      this.osrsTrackerRepo
        .getPlayerCountHistory(range)
        .pipe(
          map(points => (isDaily(range) ? points.map(point => ({ ...point, date: localDay(point.date) })) : points)),
        ),
  });

  readonly loading: Signal<boolean> = computed(() => !this.isBrowser || this.history.isLoading());

  readonly series: Signal<PlayerCountSeries | undefined> = computed(() =>
    this.history.hasValue() && !this.history.isLoading()
      ? { range: this.range(), points: this.history.value()!, locationOrder: this.locationOrder() }
      : undefined,
  );

  /** A daily range on the first day of counting: one point, so no line */
  readonly singleDay: Signal<boolean> = computed(() => this.series()?.points.length === 1);

  readonly firstDay: Signal<string> = computed(() => {
    const first = this.series()?.points[0];
    return first ? format(first.date, 'd MMMM') : '';
  });

  readonly peak: Signal<{ label: string; value: string; when: string } | undefined> = computed(() => {
    const points = this.series()?.points;
    if (!points?.length) return undefined;

    const peak = points.reduce((top, point) => ((point.peak ?? point.total) > (top.peak ?? top.total) ? point : top));
    const value = fmt(peak.peak ?? peak.total);
    if (this.daily())
      return points.length === 1
        ? { label: 'Peak so far', value, when: `on ${format(peak.date, 'd MMMM')}` }
        : { label: 'Peak', value, when: `on ${format(peak.date, 'd MMMM yyyy')}` };

    const time = format(peak.date, 'HH:mm');
    const when = isToday(peak.date)
      ? `at ${time}`
      : isYesterday(peak.date)
        ? `at ${time} yesterday`
        : `on ${format(peak.date, 'EEEE d MMMM')} at ${time}`;
    // 30D's points are hourly averages: its peak is the busiest hour's
    return { label: this.range() === '30d' ? 'Busiest hour' : 'Peak', value, when };
  });

  /** When counting started, if that's within the range */
  readonly countingStarted: Signal<string | undefined> = computed(() => {
    const first = this.series()?.points[0];
    const { span, slack } = RANGES[this.range()];
    if (!first || span === undefined || first.date.getTime() < Date.now() - span + slack!) return undefined;
    return format(first.date, 'd MMMM yyyy');
  });

  readonly chartLabel: Signal<string> = computed(() => {
    const points = this.series()?.points ?? [];
    const totals = points.map(point => point.total);
    return (
      `Players online over ${RANGES[this.range()].name}, between ${fmt(Math.min(...totals))} and ` +
      `${fmt(Math.max(...totals))}; now ${fmt(totals.at(-1) ?? 0)}`
    );
  });

  selectRange(range: PlayerCountRange): void {
    this.range.set(range);
    this.analyticsService.trackOption('player_count_range', range);
  }
}

/** A daily point's UTC day as the viewer's own midnight, so the axis and the tooltip show that day in every time zone */
function localDay(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}
