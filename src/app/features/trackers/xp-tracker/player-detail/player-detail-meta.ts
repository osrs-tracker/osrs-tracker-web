import { ActivatedRouteSnapshot } from '@angular/router';
import { Player } from '@osrs-tracker/models';
import { accountType, capitalise } from '@app/common/format/player-labels';
import { ICON_IMAGE, PageImage, PageMeta } from '@app/common/seo/page-meta-strategy';
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
function playerTitle(player: Player): string {
  return `${capitalise(player.username)} - OSRS XP Tracker`;
}

/**
 * The canonical is the API's name (lower case, spaces), as the app's own player links use it:
 * `/trackers/xp/the%20fraking` for `the_fraking`, `THE-FRAKING` and the rest. The image is the player's preview card,
 * which the server draws (`src/server/routers/og-images.ts`), for a stored player only: it doesn't draw the live preview
 * of one the API doesn't store, who keeps the app icon as a compact card.
 * The structured data describes the player as a `Thing`, like an item: `ProfilePage` and `Person` are meant for
 * people's profiles, not game accounts.
 */
function playerPageMeta(player: Player): PageMeta {
  const canonicalPath = `/trackers/xp/${encodeURIComponent(player.username)}`;
  const name = capitalise(player.username);
  const description = playerDescription(player);
  return {
    title: playerTitle(player),
    description,
    canonicalPath,
    ...(isStored(player)
      ? { image: playerImage(player, name), card: 'summary_large_image' }
      : { image: ICON_IMAGE, card: 'summary' }),
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

/** The API's live preview of a player it doesn't store has no tracked offsets, active or paused */
function isStored(player: Player): boolean {
  return !!(player.scrapingOffsets?.length || player.pausedScrapingOffsets?.length);
}

/**
 * The player's link preview card: who they are and their latest stats, dated. `?v=` busts the caches of shared links
 * when the card's design changes.
 */
function playerImage(player: Player, name: string): PageImage {
  return { url: `/og/player/${encodeURIComponent(player.username)}.png?v=7`, width: 1200, height: 630, alt: name };
}

/**
 * "OSRS stats for The Fraking: daily XP gains, boss kills and clue scrolls, tracked since 11 Aug 2026. Ironman,
 * formerly hardcore, combat level 125." From the player alone: the stats are a separate request.
 */
function playerDescription(player: Player): string {
  const name = capitalise(player.username);
  const since = player.trackedSince ? `, tracked since ${DAY.format(new Date(player.trackedSince))}` : '';
  return (
    `OSRS stats for ${name}: daily XP gains, boss kills and clue scrolls${since}. ` +
    `${accountType(player)}, combat level ${player.combatLevel}.`
  );
}
