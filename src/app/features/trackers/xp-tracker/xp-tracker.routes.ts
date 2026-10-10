import { Route } from '@angular/router';
import { playerDetailResolver } from './player-detail/player-detail-resolver';
import { playerDetailTitleResolver } from './player-detail/player-detail-title-resolver';

export default [
  {
    title: 'XP Tracker - OSRS Tracker',
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./xp-tracker'),
  },
  {
    title: playerDetailTitleResolver,
    path: ':username',
    loadComponent: () => import('./player-detail/player-detail'),
    resolve: { player: playerDetailResolver },
  },
] as Route[];
