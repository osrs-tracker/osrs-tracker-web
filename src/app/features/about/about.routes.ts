import { inject } from '@angular/core';
import { Route } from '@angular/router';
import { catchError } from 'rxjs';
import { GithubRepo } from 'src/app/common/repositories/github.repo';
import { resolverErrorHandler } from 'src/app/core/routing/resolver-error';

export default [
  {
    path: 'changelog',
    pathMatch: 'prefix',
    title: 'Changelog - OSRS Tracker',
    loadComponent: () => import('./changelog/changelog.component'),
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
    loadComponent: () => import('./privacy/privacy.component'),
  },
  {
    path: 'terms',
    title: 'Terms - OSRS Tracker',
    loadComponent: () => import('./terms/terms.component'),
  },
] as Route[];
