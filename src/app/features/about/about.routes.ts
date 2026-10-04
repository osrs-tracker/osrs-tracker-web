import { inject } from '@angular/core';
import { Route } from '@angular/router';
import { GithubRepo } from 'src/app/common/repositories/github.repo';

export default [
  {
    path: 'changelog',
    pathMatch: 'prefix',
    title: 'Changelog - OSRS Tracker',
    loadComponent: () => import('./changelog/changelog.component'),
    resolve: {
      changelog: () => inject(GithubRepo).getChangelog(),
    },
  },
  {
    path: 'privacy',
    title: 'Privacy - OSRS Tracker',
    loadComponent: () => import('./privacy/privacy.component'),
  },
  {
    path: 'terms',
    title: 'Terms - OSRS Tracker',
    loadComponent: () => import('./terms/terms.component'),
  },
] as Route[];
