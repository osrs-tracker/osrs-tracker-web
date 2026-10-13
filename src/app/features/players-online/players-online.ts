import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  ResourceRef,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { PlayerCount } from '@osrs-tracker/models';
import { format } from 'date-fns';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { LoadError } from '@app/common/ui/loading/load-error';
import { Skeleton } from '@app/common/ui/loading/skeleton';
import { PlayerCountHistory } from './player-count-history';
import { formatShare, LocationCount, locationCounts } from './world-locations';

/**
 * The players online: the latest count, its members and free-to-play split and its world locations, rendered on the
 * server, and the history below, drawn in the browser.
 */
@Component({
  selector: 'players-online',
  templateUrl: './players-online.html',
  imports: [DecimalPipe, LoadError, PlayerCountHistory, Skeleton],
})
export default class PlayersOnline {
  private readonly osrsTrackerRepo = inject(OsrsTrackerRepo);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly hydrated: WritableSignal<boolean> = signal(false);

  readonly latest: ResourceRef<PlayerCount | undefined> = rxResource({
    stream: () => this.osrsTrackerRepo.getLatestPlayerCount(),
  });

  /** During SSR a failed load renders as loading, as the browser fetches it again after hydration */
  readonly latestFailed: Signal<boolean> = computed(() => this.isBrowser && !!this.latest.error());

  readonly locations: Signal<(LocationCount & { share: string; percent: number })[]> = computed(() => {
    if (!this.latest.hasValue() || !this.latest.value()) return [];
    const { byLocation, total } = this.latest.value()!;
    return locationCounts(byLocation).map(location => ({
      ...location,
      share: formatShare(location.players, total),
      percent: total ? (location.players / total) * 100 : 0,
    }));
  });

  readonly locationOrder: Signal<string[]> = computed(() => this.locations().map(location => location.key));

  readonly split: Signal<{ label: string; players: number; share: string; color: string }[]> = computed(() => {
    const count = this.latest.hasValue() ? this.latest.value() : undefined;
    if (!count) return [];
    const players = count.members + count.f2p;
    return [
      { label: 'Members', players: count.members, share: formatShare(count.members, players), color: 'bg-accent' },
      { label: 'Free-to-play', players: count.f2p, share: formatShare(count.f2p, players), color: 'bg-muted' },
    ];
  });

  readonly membersPercent: Signal<number> = computed(() => {
    const count = this.latest.hasValue() ? this.latest.value() : undefined;
    return count && count.members + count.f2p ? (count.members / (count.members + count.f2p)) * 100 : 0;
  });

  /** The sample's time in the viewer's time zone, so only set in the browser, after hydration */
  readonly countedAt: Signal<string | undefined> = computed(() =>
    this.hydrated() && this.latest.hasValue() && this.latest.value()
      ? format(this.latest.value()!.date, 'HH:mm')
      : undefined,
  );

  readonly skeletonRows: number[] = Array.from({ length: 8 }, (_, i) => i);

  constructor() {
    afterNextRender(() => this.hydrated.set(true));
  }
}
