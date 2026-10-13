import { Route } from '@angular/router';
import { PageMeta, RouteMeta } from '@app/common/seo/page-meta-strategy';
import { breadcrumbList } from '@app/common/seo/structured-data';
import { playerDetailResolver } from './player-detail/player-detail-resolver';
import { playerDetailMeta } from './player-detail/player-detail-meta';

export default [
  {
    title: 'OSRS XP Tracker: Daily gains, boss kills and clues',
    path: '',
    pathMatch: 'full',
    data: {
      meta: {
        description:
          "Track your OSRS XP gains, boss kills and clue scrolls day by day with the OSRS XP Tracker. Stay motivated by following your own and your friends' progress!",
        canonicalPath: '/trackers/xp',
        jsonLd: [breadcrumbList([{ name: 'XP Tracker', path: '/trackers/xp' }])],
      } satisfies PageMeta,
    },
    loadComponent: () => import('./xp-tracker'),
  },
  {
    // The meta's title, or this one when there's no meta
    title: 'Player not found - OSRS Tracker',
    path: ':username',
    data: { meta: playerDetailMeta satisfies RouteMeta },
    loadComponent: () => import('./player-detail/player-detail'),
    resolve: { player: playerDetailResolver },
  },
] as Route[];
