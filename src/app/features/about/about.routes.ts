import { inject } from '@angular/core';
import { Route } from '@angular/router';
import { catchError } from 'rxjs';
import { GithubRepo } from '@app/common/api/github-repo';
import { PageMeta } from '@app/common/seo/page-meta-strategy';
import { resolverErrorHandler } from '@app/core/routing/resolver-error';

export default [
  {
    path: 'changelog',
    pathMatch: 'prefix',
    title: 'Changelog - OSRS Tracker',
    data: {
      meta: {
        description:
          'Every change to OSRS Tracker, newest first: new features, fixes and improvements to the XP tracker, the price tracker and the rest of the site.',
        canonicalPath: '/about/changelog',
      } satisfies PageMeta,
    },
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
    data: {
      meta: {
        description:
          'How OSRS Tracker handles your data: no accounts, favourites kept in your browser, Google Analytics cookies, and server logs kept for at most 30 days.',
        canonicalPath: '/about/privacy',
      } satisfies PageMeta,
    },
    loadComponent: () => import('./privacy/privacy'),
  },
  {
    path: 'terms',
    title: 'Terms - OSRS Tracker',
    data: {
      meta: {
        description:
          'The terms of use for OSRS Tracker, a free fan-made XP and Grand Exchange price tracker for Old School RuneScape, not affiliated with Jagex.',
        canonicalPath: '/about/terms',
      } satisfies PageMeta,
    },
    loadComponent: () => import('./terms/terms'),
  },
] as Route[];
