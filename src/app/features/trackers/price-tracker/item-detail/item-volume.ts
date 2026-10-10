import { Component, InputSignal, OutputEmitterRef, Signal, computed, input, output } from '@angular/core';
import { LoadError } from '@app/common/components/general/load-error';
import { Skeleton } from '@app/common/components/general/skeleton';
import { InfoTooltip } from '@app/common/components/general/tooltip/info-tooltip';
import { VolumeChart } from './charts/volume-chart';
import { DailyVolume, formatUtcDay, formatWhole } from './item-prices';

interface VolumeSummary {
  label: string;
  info: string;
  value: string;
}

/** Items bought and sold per UTC day, today last, with today's totals and the daily average above the bars. */
@Component({
  selector: 'article[item-volume]',
  template: `
    <div class="flex flex-wrap items-center justify-between gap-2 min-h-14 px-5 py-1.5 border-b border-line">
      <h2 class="text-xl/6 font-bold text-strong">Daily volume</h2>
      <div class="flex flex-wrap gap-x-3.5 gap-y-1 text-sm">
        <span class="flex items-center gap-1.5">
          <span class="size-2.5 rounded bg-accent" aria-hidden="true"></span>Bought (instant buy)
        </span>
        <span class="flex items-center gap-1.5">
          <span class="size-2.5 rounded bg-orange" aria-hidden="true"></span>Sold (instant sell)
        </span>
      </div>
    </div>

    @if (error()) {
      <load-error class="flex-1" source="item-volume" message="Couldn't load the volume." (retry)="retry.emit()" />
    } @else {
      <dl class="grid sm:grid-cols-3 gap-px bg-line border-b border-line">
        @for (stat of summary(); track stat.label) {
          <div class="flex items-center justify-between gap-1 px-4 py-3 bg-card sm:flex-col sm:items-start sm:px-5">
            <dt class="flex items-center text-sm text-muted">
              {{ stat.label }}
              <info-tooltip>{{ stat.info }}</info-tooltip>
            </dt>
            <dd class="flex items-center h-7 text-xl font-bold text-strong tabular-nums">
              @if (loading()) {
                <skeleton class="h-5 w-20" />
              } @else {
                {{ stat.value }}
              }
            </dd>
          </div>
        }
      </dl>

      <div class="relative flex-1 min-h-50 mx-5 mt-4 mb-2">
        @if (loading()) {
          <skeleton class="absolute inset-0 h-full w-full rounded-xl" />
        } @else {
          @defer {
            <volume-chart class="absolute inset-0" role="img" [attr.aria-label]="chartLabel()" [data]="volumes()" />
          } @placeholder {
            <skeleton class="absolute inset-0 h-full w-full rounded-xl" />
          }
        }
      </div>
      <div class="flex justify-between px-5 pb-4 text-sm text-muted">
        <span>{{ firstDay() }}</span>
        <span>Today</span>
      </div>
    }
  `,
  host: { class: 'flex flex-col rounded-2xl bg-card overflow-hidden' },
  imports: [InfoTooltip, LoadError, Skeleton, VolumeChart],
})
export class ItemVolume {
  /** Oldest first, today (so far) last */
  readonly volumes: InputSignal<DailyVolume[]> = input.required();
  readonly loading: InputSignal<boolean> = input(false);
  readonly error: InputSignal<boolean> = input(false);

  readonly retry: OutputEmitterRef<void> = output();

  readonly summary: Signal<VolumeSummary[]> = computed(() => {
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

  readonly firstDay: Signal<string> = computed(() => {
    const first = this.volumes()[0];
    return first ? formatUtcDay(first.day) : '';
  });

  readonly chartLabel: Signal<string> = computed(
    () => `Items bought and sold per day over the last ${this.volumes().length} days`,
  );
}
