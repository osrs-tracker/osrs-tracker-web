import { DecimalPipe } from '@angular/common';
import { afterNextRender, Component, computed, inject, Signal, signal, WritableSignal } from '@angular/core';
import { PlayerCount } from '@osrs-tracker/models';
import { format } from 'date-fns';
import { PlayerCountStore } from '@app/common/player-count/player-count-store';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { PlayerCountHistory } from './player-count-history';
import { formatShare, LocationCount, locationCounts } from './world-locations';

/**
 * The players online: the count (`PlayerCountStore`: live, rendered on the server and refreshed in the browser), its
 * members and free-to-play split and its world locations, and the history below, drawn in the browser.
 */
@Component({
  selector: 'players-online',
  templateUrl: './players-online.html',
  imports: [DecimalPipe, LoadError, PlayerCountHistory, Skeleton],
})
export default class PlayersOnline {
  private readonly hydrated: WritableSignal<boolean> = signal(false);

  private readonly playerCountStore = inject(PlayerCountStore);

  readonly count: Signal<PlayerCount | undefined> = this.playerCountStore.count;
  readonly failed: Signal<boolean> = this.playerCountStore.failed;

  readonly locations: Signal<(LocationCount & { share: string; percent: number })[]> = computed(() => {
    const count = this.count();
    if (!count) return [];
    const { byLocation, total } = count;
    return locationCounts(byLocation).map(location => ({
      ...location,
      share: formatShare(location.players, total),
      percent: total ? (location.players / total) * 100 : 0,
    }));
  });

  readonly locationOrder: Signal<string[]> = computed(() => this.locations().map(location => location.key));

  readonly split: Signal<{ label: string; players: number; share: string; color: string }[]> = computed(() => {
    const count = this.count();
    if (!count) return [];
    const players = count.members + count.f2p;
    return [
      { label: 'Members', players: count.members, share: formatShare(count.members, players), color: 'bg-accent' },
      { label: 'Free-to-play', players: count.f2p, share: formatShare(count.f2p, players), color: 'bg-muted' },
    ];
  });

  readonly membersPercent: Signal<number> = computed(() => {
    const count = this.count();
    return count && count.members + count.f2p ? (count.members / (count.members + count.f2p)) * 100 : 0;
  });

  /** The count's time in the viewer's time zone, so only set in the browser, after hydration */
  readonly countedAt: Signal<string | undefined> = computed(() => {
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
