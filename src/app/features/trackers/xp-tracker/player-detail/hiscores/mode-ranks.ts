import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID, Service, Signal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HiscoreEntry, Player, PlayerStatus, PlayerType, SkillEnum, skillLevel } from '@osrs-tracker/models';
import { catchError, of, throwError } from 'rxjs';
import { JagexHiscoreTable, OsrsProxyRepo } from '@app/common/api/osrs-proxy-repo';
import { isNotFound } from '@app/core/routing/resolver-error';

export interface RankTable {
  table: JagexHiscoreTable;
  label: string;
}

// Constants, so a table picked again from a newer hiscore is the same object and doesn't load again
const IRONMAN: RankTable = { table: 'hiscore_oldschool_ironman', label: 'Ironman' };
const HARDCORE: RankTable = { table: 'hiscore_oldschool_hardcore_ironman', label: 'Hardcore' };
const ULTIMATE: RankTable = { table: 'hiscore_oldschool_ultimate', label: 'Ultimate' };
const SKILLER: RankTable = { table: 'hiscore_oldschool_skiller', label: 'Skiller' };
const ONE_DEFENCE: RankTable = { table: 'hiscore_oldschool_skiller_defence', label: '1 Defence' };

/**
 * A table the player left keeps their rank from then, so a dead hardcore ranks on the ironman table, a de-ultimated
 * ultimate too, and a de-ironed player on none.
 */
export function modeTable(player: Pick<Player, 'type' | 'status' | 'diedAsHardcore'>): RankTable | undefined {
  if (player.status === PlayerStatus.DeIroned) return undefined;
  switch (player.type) {
    case PlayerType.Ironman:
      return IRONMAN;
    case PlayerType.Hardcore:
      return player.diedAsHardcore ? IRONMAN : HARDCORE;
    case PlayerType.Ultimate:
      return player.status === PlayerStatus.DeUltimated ? IRONMAN : ULTIMATE;
    default:
      return undefined;
  }
}

/** Skiller at combat level 3 (who also has 1 Defence), else 1 Defence at Defence level 1 */
export function buildTable(
  combatLevel: number,
  hiscore: Pick<HiscoreEntry, 'skills'> | undefined,
): RankTable | undefined {
  if (combatLevel === 3) return SKILLER;
  if (hiscore && skillLevel(hiscore.skills[SkillEnum.Defence]) === 1) return ONE_DEFENCE;
  return undefined;
}

export interface TableRanks extends RankTable {
  /** `undefined` while it loads or after it failed */
  hiscore?: Pick<HiscoreEntry, 'skills' | 'activities'>;
  failed: boolean;
  reload(): void;
}

export interface ModeRanksSource {
  username: string;
  player: Signal<Player | null>;
  /** The hiscore the page shows, for the Defence level */
  hiscore: Signal<HiscoreEntry | undefined>;
}

/**
 * Each table is a Jagex request through the proxy, which the API and the daily check share, so they load when the
 * first tooltip with ranks opens (`load()`), in the browser only. A table the player isn't on (a 404) is left out.
 */
@Service({ autoProvided: false })
export class ModeRanks {
  private readonly osrsProxyRepo = inject(OsrsProxyRepo);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly #source = signal<ModeRanksSource | undefined>(undefined);
  readonly #wanted = signal(false);

  readonly #mode = computed(() => {
    const player = this.#source()?.player();
    return player ? modeTable(player) : undefined;
  });
  readonly #build = computed(() => {
    const source = this.#source();
    const player = source?.player();
    return player ? buildTable(player.combatLevel, source!.hiscore()) : undefined;
  });

  readonly #modeRanks = this.ranksOn(this.#mode);
  readonly #buildRanks = this.ranksOn(this.#build);
  /** Empty until `load()` */
  readonly tables = computed(() =>
    [this.#modeRanks(), this.#buildRanks()].filter((ranks): ranks is TableRanks => !!ranks),
  );

  connect(source: ModeRanksSource): void {
    this.#source.set(source);
  }

  load(): void {
    this.#wanted.set(true);
  }

  private ranksOn(table: Signal<RankTable | undefined>): Signal<TableRanks | undefined> {
    const resource = rxResource({
      params: () => {
        const source = this.#source();
        const picked = table();
        return this.isBrowser && this.#wanted() && source && picked
          ? { username: source.username, table: picked.table }
          : undefined;
      },
      stream: ({ params }) =>
        this.osrsProxyRepo.getHiscoreTable(params.username, params.table).pipe(
          // not on the table: no rank to show, rather than a failure
          catchError((err: unknown) => (isNotFound(err) ? of(null) : throwError(() => err))),
        ),
    });

    return computed(() => {
      const picked = table();
      if (!picked || !this.#wanted()) return undefined;
      const hiscore = resource.hasValue() ? resource.value() : undefined;
      if (hiscore === null) return undefined;
      return { ...picked, hiscore, failed: !!resource.error(), reload: () => resource.reload() };
    });
  }
}
