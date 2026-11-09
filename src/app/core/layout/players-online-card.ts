import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { FROZEN_DASH, frozenPoints } from '@app/common/player-count/frozen-count';
import { PlayerCountStore } from '@app/common/player-count/player-count-store';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';

const WIDTH = 360;
const HEIGHT = 64;

/**
 * Loads when the menu first opens (never during SSR: the menu is closed on load), and again on every later opening.
 */
@Component({
  selector: 'players-online-card',
  template: `
    <a
      class="group flex flex-col gap-1.5 m-0.5 p-3 rounded-xl bg-inner border border-line hover:bg-row hover:border-border text-sm text-muted transition-colors"
      routerLink="/players-online"
    >
      <span class="flex items-baseline justify-between gap-2">
        <span class="font-bold group-hover:text-accent transition-colors">Players online</span>
        @if (frozen()) {
          <span class="flex items-center gap-1.5"
            ><span class="size-2 shrink-0 rounded-full bg-amber" aria-hidden="true"></span>Possible game outage</span
          >
        } @else {
          <span>Last 24 hours</span>
        }
      </span>
      @if (history.error() || failed()) {
        <load-error inline source="nav-player-count" message="The player count didn't load" (retry)="reload()" />
      } @else if (latest(); as latest) {
        <span class="text-2xl font-bold text-strong tabular-nums">{{ latest | number }}</span>
        @if (paths(); as paths) {
          <svg class="block w-full h-12" [attr.viewBox]="viewBox" preserveAspectRatio="none" aria-hidden="true">
            <path class="fill-accent/12" [attr.d]="paths.line + area" />
            <path
              class="fill-none stroke-accent"
              [attr.d]="paths.solid"
              stroke-width="2.5"
              stroke-linejoin="round"
              stroke-linecap="round"
              vector-effect="non-scaling-stroke"
            />
            <!-- Dots, as on the Players online chart: the count repeated, the world list stopped updating -->
            <path
              class="fill-none stroke-accent"
              [attr.d]="paths.dotted"
              stroke-width="2.5"
              stroke-linecap="round"
              [attr.stroke-dasharray]="frozenDash"
              vector-effect="non-scaling-stroke"
            />
          </svg>
        }
      } @else {
        <skeleton class="h-8 w-28" tone="ground" />
        <skeleton class="h-12 w-full" tone="ground" />
      }
    </a>
  `,
  imports: [DecimalPipe, LoadError, RouterLink, Skeleton],
})
export class PlayersOnlineCard {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly playerCountStore = inject(PlayerCountStore);

  readonly active = input(false);

  private readonly requested = signal(false);

  readonly history = rxResource({
    params: () => this.requested() || undefined,
    stream: () => this.osrsTrackerRepo.getPlayerCountHistory('24h'),
  });

  readonly failed = this.playerCountStore.failed;

  /** Shown once the history has loaded too, so the number and the line's end appear together */
  readonly latest = computed(() => (this.history.hasValue() ? this.playerCountStore.count()?.total : undefined));

  readonly frozen = this.playerCountStore.frozen;

  /** The whole line, for the area under it, and its segments split by whether they end on a repeated count */
  readonly paths = computed(() => {
    const latest = this.latest();
    if (latest === undefined) return undefined;
    const history = this.history.value()!;
    const totals = [...history.map(point => point.total), latest];
    if (totals.length < 2) return undefined;
    // The last segment ends on the live count, which the store judges against every count it has read
    const dotted = [...frozenPoints('24h', history), this.frozen()];
    const min = Math.min(...totals);
    const range = Math.max(...totals) - min || 1;
    const points = totals.map((total, i) => {
      const x = (i / (totals.length - 1)) * WIDTH;
      const y = HEIGHT - 4 - ((total - min) / range) * (HEIGHT - 8);
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    // One subpath per run of like segments: a dash pattern starts over on every subpath, so a subpath per segment would
    // draw a dot at every sample however far apart the dashes are
    const segments = (ofDotted: boolean) =>
      points
        .map((point, i) => {
          if (!i || dotted[i] !== ofDotted) return '';
          return (i > 1 && dotted[i - 1] === ofDotted ? '' : `M${points[i - 1]} `) + `L${point}`;
        })
        .filter(Boolean)
        .join(' ');
    return {
      line: points.map((point, i) => `${i ? 'L' : 'M'}${point}`).join(' '),
      solid: segments(false),
      dotted: segments(true),
    };
  });

  protected readonly frozenDash = FROZEN_DASH.join(' ');
  protected readonly viewBox = `0 0 ${WIDTH} ${HEIGHT}`;
  protected readonly area = ` L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`;

  constructor() {
    effect(() => {
      if (!this.active()) return;
      untracked(() => (this.requested() ? this.reload() : this.load()));
    });
  }

  /** The count and the history again, as it may be long since the menu was last open */
  reload(): void {
    this.history.reload();
    this.playerCountStore.refresh();
  }

  private load(): void {
    this.requested.set(true);
    this.playerCountStore.refresh();
  }
}
