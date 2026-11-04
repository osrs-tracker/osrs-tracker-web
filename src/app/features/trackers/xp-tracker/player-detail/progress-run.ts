import { HiscoreEntry, overallOf } from '@osrs-tracker/models';

/**
 * A check below this share of the check before it starts the player's history again: a Hardcore Worlds Reset, or the
 * name taken over by a smaller account. A wipe leaves about 1–2k XP; rollbacks and one-skill corrections cost a few
 * percent, and cutting at those blanks the page (`docs/decisions.md`).
 */
const RESET_SHARE = 0.5;

export interface ProgressRun {
  /** The stored entries since the newest reset, newest first: all of them when there's none */
  entries: HiscoreEntry[];
  /** The first check after the reset (the live entry's date when the reset came after the last check) */
  resetAt?: Date;
}

/**
 * The current run of a player's loaded history: from the newest check that dropped below half the Overall XP of the
 * check before it. Never cut the history itself: its next page is fetched from `entries.length`.
 */
export function progressRun(entries: HiscoreEntry[], live?: HiscoreEntry): ProgressRun {
  const checks = live && live !== entries[0] ? [live, ...entries] : entries;
  const withLive = checks.length - entries.length;
  const reset = checks.findIndex(
    (check, i) => i + 1 < checks.length && overallXp(check) < RESET_SHARE * overallXp(checks[i + 1]),
  );
  if (reset === -1) return { entries };
  return { entries: entries.slice(0, reset + 1 - withLive), resetAt: checks[reset].date };
}

function overallXp(entry: HiscoreEntry): number {
  return Math.max(0, overallOf(entry).xp);
}
