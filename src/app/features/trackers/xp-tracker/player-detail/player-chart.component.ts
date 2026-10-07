import { Component, computed, inject, input, InputSignal, Signal } from '@angular/core';
import { HiscoreEntry } from '@osrs-tracker/models';
import { SkeletonComponent } from 'src/app/common/components/general/skeleton.component';
import { ActivityChartComponent } from './player-logs/activity-chart.component';
import { XpGainedChartComponent } from './player-logs/xp-gained-chart.component';
import { ActivityView, ChartView, PlayerView } from './player-view';

const TITLES: Record<ChartView, string> = {
  skills: 'XP gained',
  bosses: 'Bosses',
  raids: 'Raids',
  clues: 'Clues',
  minigames: 'Minigames',
};

/**
 * The chart card: it follows the page's last chartable pick (a tab, a skill or an activity). From 1024px up it's as tall
 * as the Skills card beside it, and the plot takes what the legend leaves.
 */
@Component({
  selector: 'player-chart',
  template: `
    <div class="flex items-center min-h-14 px-5 py-1.5 border-b border-line">
      <h2 class="text-xl font-bold text-strong">{{ title() }}</h2>
    </div>

    @switch (state()) {
      @case ('loading') {
        <div class="flex flex-col grow min-h-0 gap-4 px-5 py-4.5" aria-hidden="true">
          <div class="flex items-center gap-3">
            <skeleton class="size-11 rounded-xl" />
            <div class="flex flex-col grow gap-2">
              <skeleton class="h-4 w-37.5" />
              <skeleton class="h-3 w-27.5" />
            </div>
            <skeleton class="h-7 w-24 rounded-lg" />
          </div>
          <skeleton class="h-55 lg:h-auto lg:grow rounded-xl" />
          <div class="flex flex-wrap gap-2">
            @for (width of ['w-24', 'w-21', 'w-23', 'w-26', 'w-22', 'w-20']; track $index) {
              <skeleton class="h-9 rounded-full" [class]="width" />
            }
          </div>
        </div>
      }
      @case ('empty') {
        <div class="flex flex-col grow items-center justify-center gap-4 px-8 py-10 text-center">
          <span class="flex items-center justify-center size-16 rounded-full bg-ground text-accent" aria-hidden="true">
            <svg
              class="size-7.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15.5 14" />
            </svg>
          </span>
          <div class="flex flex-col items-center gap-2">
            <h3 class="text-xl font-bold text-strong">No gains yet</h3>
            <p class="max-w-md text-base/6 text-muted">{{ emptyText() }}</p>
          </div>
        </div>
      }
      @case ('ready') {
        <div class="flex flex-col grow min-h-0 px-5 py-4.5">
          @if (activityView(); as category) {
            <activity-chart [data]="diffs()" [category]="category" [minigame]="minigame()" />
          } @else {
            <xp-gained-chart [data]="diffs()" />
          }
        </div>
      }
    }
  `,
  host: { class: 'flex flex-col min-w-0 rounded-2xl bg-card overflow-hidden lg:h-115.5' },
  imports: [ActivityChartComponent, SkeletonComponent, XpGainedChartComponent],
})
export class PlayerChartComponent {
  readonly playerView = inject(PlayerView);

  /** The daily diffs, newest first */
  readonly diffs: InputSignal<HiscoreEntry[]> = input.required();
  /** `empty` until there's a second entry to compare with */
  readonly state: InputSignal<'loading' | 'empty' | 'ready'> = input.required();
  readonly emptyText: InputSignal<string> = input('');
  /** The charted minigame */
  readonly minigame: InputSignal<string | undefined> = input();

  readonly title: Signal<string> = computed(() => TITLES[this.playerView.chart()]);
  readonly activityView: Signal<ActivityView | undefined> = computed(() => {
    const chart = this.playerView.chart();
    return chart === 'skills' ? undefined : chart;
  });
}
