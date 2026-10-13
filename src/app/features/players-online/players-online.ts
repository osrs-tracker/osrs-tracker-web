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
import { everyMinute } from './every-minute';
import { PlayerCountHistory } from './player-count-history';
import { formatShare, LocationCount, locationCounts } from './world-locations';

/**
 * The players online: the count, its members and free-to-play split and its world locations, rendered on the server
 * from the stored sample and live in the browser, and the history below, drawn in the browser.
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

  /** The newest stored sample (sampled every 10 minutes): rendered on the server, so its render never waits on Jagex */
  private readonly stored: ResourceRef<PlayerCount | undefined> = rxResource({
    stream: () => this.osrsTrackerRepo.getLatestPlayerCount(),
  });

  /** The live count, from right after hydration (browser only), replacing the stored sample */
  readonly live: ResourceRef<PlayerCount | undefined> = rxResource({
    params: () => this.hydrated() || undefined,
    stream: () => this.osrsTrackerRepo.getLivePlayerCount(),
  });

  readonly count: Signal<PlayerCount | undefined> = computed(() =>
    this.live.hasValue() ? this.live.value() : this.stored.hasValue() ? this.stored.value() : undefined,
  );

  /** Only the live count can fail: during SSR a failed stored sample renders as loading, until the live count loads */
  readonly failed: Signal<boolean> = computed(() => !!this.live.error());

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
    everyMinute(() => this.live.reload());
  }
}
