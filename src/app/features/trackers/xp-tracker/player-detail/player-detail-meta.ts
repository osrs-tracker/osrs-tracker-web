import { ActivatedRouteSnapshot } from '@angular/router';
import { Player, PlayerStatus, PlayerType } from '@osrs-tracker/models';
import { CapitalizePipe } from '@app/common/format/capitalize-pipe';
import { ICON_IMAGE, PageMeta } from '@app/common/seo/page-meta-strategy';
import { breadcrumbList, webPage } from '@app/common/seo/structured-data';

/** "11 Aug 2026", in UTC like the rest of the player page */
const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/**
 * The player page's meta, from the player `playerDetailResolver` resolved. None for an unknown player (`null`): the page
 * shows its not-found state, titled by the route, without a canonical. Other failures show the error page.
 */
export function playerDetailMeta(route: ActivatedRouteSnapshot): PageMeta | undefined {
  const player: Player | null = route.data['player'];
  return player ? playerPageMeta(player) : undefined;
}

/**
 * "The Fraking - OSRS XP Tracker": from the player, not the URL, so every spelling of a name gets the same title. No
 * site name, which search results and link previews show on their own.
 */
export function playerTitle(player: Player): string {
  return `${CapitalizePipe.capitalise(player.username)} - OSRS XP Tracker`;
}

/**
 * The canonical is the API's name (lower case, spaces), as the app's own player links use it:
 * `/trackers/xp/the%20fraking` for `the_fraking`, `THE-FRAKING` and the rest. A compact card, like item pages.
 * The structured data describes the player as a `Thing`, like an item: `ProfilePage` and `Person` are meant for
 * people's profiles, not game accounts.
 */
export function playerPageMeta(player: Player): PageMeta {
  const canonicalPath = `/trackers/xp/${encodeURIComponent(player.username)}`;
  const name = CapitalizePipe.capitalise(player.username);
  const description = playerDescription(player);
  return {
    title: playerTitle(player),
    description,
    canonicalPath,
    image: ICON_IMAGE,
    card: 'summary',
    jsonLd: [
      breadcrumbList([
        { name: 'XP Tracker', path: '/trackers/xp' },
        { name, path: canonicalPath },
      ]),
      webPage({
        path: canonicalPath,
        title: playerTitle(player),
        description,
        about: { '@type': 'Thing', name },
      }),
    ],
  };
}

/**
 * "OSRS stats for The Fraking: daily XP gains, boss kills and clue scrolls, tracked since 11 Aug 2026. Ironman,
 * formerly hardcore, combat level 125." From the player alone: the stats are a separate request.
 */
export function playerDescription(player: Player): string {
  const name = CapitalizePipe.capitalise(player.username);
  const since = player.trackedSince ? `, tracked since ${DAY.format(new Date(player.trackedSince))}` : '';
  return (
    `OSRS stats for ${name}: daily XP gains, boss kills and clue scrolls${since}. ` +
    `${accountType(player)}, combat level ${player.combatLevel}.`
  );
}

function accountType({ type, status, diedAsHardcore }: Player): string {
  if (type === PlayerType.Normal) return 'Regular account';
  if (status === PlayerStatus.DeIroned) return 'Former ironman';
  if (status === PlayerStatus.DeUltimated) return 'Ironman, formerly ultimate';
  if (diedAsHardcore) return 'Ironman, formerly hardcore';
  return {
    [PlayerType.Ironman]: 'Ironman',
    [PlayerType.Hardcore]: 'Hardcore ironman',
    [PlayerType.Ultimate]: 'Ultimate ironman',
  }[type];
}
