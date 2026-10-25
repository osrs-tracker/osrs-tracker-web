import { DecimalPipe } from '@angular/common';
import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { format } from 'date-fns';
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

  readonly split = computed(() => {
    const count = this.count();
    if (!count) return [];
    const players = count.members + count.f2p;
    return [
      { label: 'Members', players: count.members, share: formatShare(count.members, players), color: 'bg-accent' },
      { label: 'Free-to-play', players: count.f2p, share: formatShare(count.f2p, players), color: 'bg-muted' },
    ];
  });

  readonly membersPercent = computed(() => {
    const count = this.count();
    return count && count.members + count.f2p ? (count.members / (count.members + count.f2p)) * 100 : 0;
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
