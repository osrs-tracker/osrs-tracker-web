import { Route } from '@angular/router';
import { PageMeta } from '@app/common/seo/page-meta-strategy';
import { breadcrumbList } from '@app/common/seo/structured-data';
import { playerDetailResolver } from './player-detail/player-detail-resolver';
import { playerDetailMetaResolver, playerDetailTitleResolver } from './player-detail/player-detail-meta';

export default [
  {
    title: 'OSRS XP Tracker: daily gains, boss kills and clues',
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
    title: playerDetailTitleResolver,
    path: ':username',
    loadComponent: () => import('./player-detail/player-detail'),
    resolve: { player: playerDetailResolver, meta: playerDetailMetaResolver },
  },
] as Route[];
