import { inject } from '@angular/core';
import { Route } from '@angular/router';
import { catchError } from 'rxjs';
import { GithubRepo } from '@app/common/api/github-repo';
import { resolverErrorHandler } from '@app/core/routing/resolver-error';

export default [
  {
    path: 'changelog',
    pathMatch: 'prefix',
    title: 'Changelog - OSRS Tracker',
    loadComponent: () => import('./changelog/changelog'),
    resolve: {
      changelog: () =>
        inject(GithubRepo)
          .getChangelog()
          .pipe(catchError(resolverErrorHandler('/about/changelog'))),
    },
  },
  {
    path: 'privacy',
    title: 'Privacy - OSRS Tracker',
    loadComponent: () => import('./privacy/privacy'),
  },
  {
    path: 'terms',
    title: 'Terms - OSRS Tracker',
    loadComponent: () => import('./terms/terms'),
  },
] as Route[];
