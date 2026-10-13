import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID, Service, Signal, signal, WritableSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { SkillEnum } from '@osrs-tracker/hiscores';
import { HiscoreEntry, Player, PlayerStatus, PlayerType, skillLevel } from '@osrs-tracker/models';
import { catchError, of, throwError } from 'rxjs';
import { JagexHiscoreTable, OsrsProxyRepo } from '@app/common/api/osrs-proxy-repo';
import { isNotFound } from '@app/core/routing/resolver-error';

/** A hiscore table the player is ranked on besides the main one */
export interface RankTable {
  table: JagexHiscoreTable;
  /** Names its rank: "Ironman rank" */
  label: string;
}

// Constants, so a table picked again from a newer hiscore is the same object and doesn't load again
const IRONMAN: RankTable = { table: 'hiscore_oldschool_ironman', label: 'Ironman' };
const HARDCORE: RankTable = { table: 'hiscore_oldschool_hardcore_ironman', label: 'Hardcore' };
const ULTIMATE: RankTable = { table: 'hiscore_oldschool_ultimate', label: 'Ultimate' };
const SKILLER: RankTable = { table: 'hiscore_oldschool_skiller', label: 'Skiller' };
const ONE_DEFENCE: RankTable = { table: 'hiscore_oldschool_skiller_defence', label: '1 Defence' };

/**
 * The game mode's table, from the type and status the API found. A table the player left keeps their rank from then,
 * so a dead hardcore ranks on the ironman table, a de-ultimated ultimate too, and a de-ironed player on none.
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

/** The build's table: Skiller at combat level 3 (who also has 1 Defence), else 1 Defence at Defence level 1 */
export function buildTable(
  combatLevel: number,
  hiscore: Pick<HiscoreEntry, 'skills'> | undefined,
): RankTable | undefined {
  if (combatLevel === 3) return SKILLER;
  if (hiscore && skillLevel(hiscore.skills[SkillEnum.Defence]) === 1) return ONE_DEFENCE;
  return undefined;
}

/** One table's ranks as a tooltip shows them */
export interface TableRanks extends RankTable {
  /** `undefined` while it loads or after it failed */
  hiscore?: Pick<HiscoreEntry, 'skills' | 'activities'>;
  failed: boolean;
  reload(): void;
}

/** What the player page gives `ModeRanks` */
export interface ModeRanksSource {
  username: string;
  /** `null` when there's no such player */
  player: Signal<Player | null>;
  /** The hiscore the page shows, for the Defence level */
  hiscore: Signal<HiscoreEntry | undefined>;
}

/**
 * The player's ranks among their game mode and build, besides the main table's: at most two more tables. Each is a
 * Jagex request through the proxy, which the API and the daily check share, so they load when the first tooltip with
 * ranks opens (`load()`), in the browser only. A table the player isn't on (a 404) is left out. Provided by the player
 * page, which `connect`s it.
 */
@Service({ autoProvided: false })
export class ModeRanks {
  private readonly osrsProxyRepo = inject(OsrsProxyRepo);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly #source: WritableSignal<ModeRanksSource | undefined> = signal(undefined);
  readonly #wanted: WritableSignal<boolean> = signal(false);

  readonly #mode: Signal<RankTable | undefined> = computed(() => {
    const player = this.#source()?.player();
    return player ? modeTable(player) : undefined;
  });
  readonly #build: Signal<RankTable | undefined> = computed(() => {
    const source = this.#source();
    const player = source?.player();
    return player ? buildTable(player.combatLevel, source!.hiscore()) : undefined;
  });

  readonly #modeRanks: Signal<TableRanks | undefined> = this.ranksOn(this.#mode);
  readonly #buildRanks: Signal<TableRanks | undefined> = this.ranksOn(this.#build);
  /** The tables the player is on besides the main one, mode first; empty until `load()` */
  readonly tables: Signal<TableRanks[]> = computed(() =>
    [this.#modeRanks(), this.#buildRanks()].filter((ranks): ranks is TableRanks => !!ranks),
  );

  connect(source: ModeRanksSource): void {
    this.#source.set(source);
  }

  /** Loads the tables, once: a tooltip with ranks opened */
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
