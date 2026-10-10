import { Route } from '@angular/router';
import { PageMeta } from '@app/common/seo/page-meta-strategy';
import { playerDetailResolver } from './player-detail/player-detail-resolver';
import { playerDetailTitleResolver } from './player-detail/player-detail-title-resolver';

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
      } satisfies PageMeta,
    },
    loadComponent: () => import('./xp-tracker'),
  },
  {
    title: playerDetailTitleResolver,
    path: ':username',
    loadComponent: () => import('./player-detail/player-detail'),
    resolve: { player: playerDetailResolver },
  },
] as Route[];
