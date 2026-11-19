import { DecimalPipe } from '@angular/common';
import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { format } from 'date-fns';
import { FROZEN_MESSAGE } from '@app/common/player-count/frozen-count';
import { PlayerCountStore } from '@app/common/player-count/player-count-store';
import { Card } from '@app/common/ui/cards/card';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { PlayerCountHistory } from './player-count-history';
import { formatShare, locationCounts } from './world-locations';
import { LucideActivity } from '@lucide/angular';

@Component({
  selector: 'players-online',
  templateUrl: './players-online.html',
  imports: [Card, DecimalPipe, LoadError, PlayerCountHistory, Skeleton, LucideActivity],
})
export default class PlayersOnline {
  private readonly hydrated = signal(false);

  private readonly playerCountStore = inject(PlayerCountStore);

  readonly count = this.playerCountStore.count;
  readonly failed = this.playerCountStore.failed;
  readonly frozen = this.playerCountStore.frozen;
  protected readonly frozenMessage = FROZEN_MESSAGE;

  readonly locations = computed(() => {
    const count = this.count();
    if (!count) return [];
    const { byLocation, total } = count;
    return locationCounts(byLocation).map(location => ({
      ...location,
      share: formatShare(location.players, total),
      percent: total ? (location.players / total) * 100 : 0,
    }));
  });

  readonly locationOrder = computed(() => this.locations().map(location => location.key));

  /**
   * The total split two ways, each over one two-part bar. Hardcore Worlds gets a split of its own, not a part of the
   * Members bar: the one `hardcore` count can't be divided over members and free-to-play exactly. Counts from before
   * Hardcore Worlds were counted (2026-11-19), or from an older API, have no `hardcore`: unknown, so no split, never 0.
   */
  readonly splits = computed(() => {
    const count = this.count();
    if (!count) return [];
    const membership = split(
      { label: 'Members', players: count.members, color: 'bg-accent' },
      { label: 'Free-to-play', players: count.f2p, color: 'bg-muted' },
    );
    if (count.hardcore === undefined) return [membership];
    const worldType = split(
      { label: 'Main game', players: Math.max(count.total - count.hardcore, 0), color: 'bg-accent' },
      { label: 'Hardcore Worlds', players: count.hardcore, color: 'bg-sold' },
    );
    return [worldType, membership];
  });

  /** The count's time in the viewer's time zone, so only set in the browser, after hydration */
  readonly countedAt = computed(() => {
    const count = this.count();
    return this.hydrated() && count ? format(count.date, 'HH:mm') : undefined;
  });

  readonly skeletonRows: number[] = Array.from({ length: 8 }, (_, i) => i);

  constructor() {
    afterNextRender(() => this.hydrated.set(true));
    this.playerCountStore.watch();
  }

  retry(): void {
    this.playerCountStore.refresh();
  }
}

interface SplitPart {
  label: string;
  players: number;
  color: string;
}

/** `percent`: the first part's width in the bar */
function split(first: SplitPart, second: SplitPart) {
  const players = first.players + second.players;
  return {
    parts: [first, second].map(part => ({ ...part, share: formatShare(part.players, players) })),
    percent: players ? (first.players / players) * 100 : 0,
  };
}
