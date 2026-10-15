import { DecimalPipe } from '@angular/common';
import { Component, InputSignal, ResourceRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { OsrsTrackerRepo, PlayerCountPoint } from '@app/common/api/osrs-tracker-repo';
import { PlayerCountStore } from '@app/common/player-count/player-count-store';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';

const WIDTH = 360;
const HEIGHT = 64;

/**
 * The Game menu's Players online card: the count (`PlayerCountStore`, the same as the page's) and a line of the last 24
 * hours that ends at it, linking to the page. Loads when the menu first opens (never during SSR: the menu is closed on
 * load), and again on every later opening.
 */
@Component({
  selector: 'players-online-card',
  template: `
    <a
      class="group flex flex-col gap-1.5 m-0.5 p-3 rounded-xl bg-inner border border-line hover:bg-row hover:border-border text-sm text-muted transition-colors"
      routerLink="/players-online"
    >
      <span class="flex items-baseline justify-between gap-2">
        <span class="font-bold group-hover:text-accent transition-colors">Players online</span
        ><span>Last 24 hours</span>
      </span>
      @if (history.error() || failed()) {
        <load-error inline source="nav-player-count" message="The player count didn't load" (retry)="reload()" />
      } @else if (latest(); as latest) {
        <span class="text-2xl font-bold text-strong tabular-nums">{{ latest | number }}</span>
        @if (line()) {
          <svg class="block w-full h-12" [attr.viewBox]="viewBox" preserveAspectRatio="none" aria-hidden="true">
            <path class="fill-accent/12" [attr.d]="line() + area" />
            <path
              class="fill-none stroke-accent"
              [attr.d]="line()"
              stroke-width="2.5"
              stroke-linejoin="round"
              stroke-linecap="round"
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

  /** Whether the menu is open */
  readonly active: InputSignal<boolean> = input(false);

  private readonly requested = signal(false);

  readonly history: ResourceRef<PlayerCountPoint[] | undefined> = rxResource({
    params: () => this.requested() || undefined,
    stream: () => this.osrsTrackerRepo.getPlayerCountHistory('24h'),
  });

  readonly failed = this.playerCountStore.failed;

  /** Shown once the history has loaded too, so the number and the line's end appear together */
  readonly latest = computed(() => (this.history.hasValue() ? this.playerCountStore.count()?.total : undefined));

  /** The line through every sample and the live count, scaled to the box with 4px to spare at the top and bottom */
  readonly line = computed(() => {
    const latest = this.latest();
    if (latest === undefined) return '';
    const totals = [...this.history.value()!.map(point => point.total), latest];
    if (totals.length < 2) return '';
    const min = Math.min(...totals);
    const range = Math.max(...totals) - min || 1;
    return totals
      .map((total, i) => {
        const x = (i / (totals.length - 1)) * WIDTH;
        const y = HEIGHT - 4 - ((total - min) / range) * (HEIGHT - 8);
        return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  });

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
