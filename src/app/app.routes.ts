import { Route } from '@angular/router';
import { DEFAULT_DESCRIPTION, PageMeta } from './common/seo/page-meta-strategy';
import { webSite } from './common/seo/structured-data';
import RootLayout from './core/layout/root-layout';

export default [
  {
    path: '',
    pathMatch: 'prefix',
    component: RootLayout,
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'OSRS Tracker: XP tracker and Grand Exchange prices',
        data: {
          meta: { description: DEFAULT_DESCRIPTION, canonicalPath: '/', jsonLd: [webSite()] } satisfies PageMeta,
        },
        loadComponent: () => import('./features/home/home'),
      },
      {
        path: 'trackers',
        pathMatch: 'prefix',
        loadChildren: () => import('./features/trackers/trackers.routes'),
      },
      {
        path: 'players-online',
        title: 'OSRS player count: How many people are playing right now',
        data: {
          meta: {
            description:
              'How many people are playing Old School RuneScape right now, per world location, and the player count over the last day, week, month and year.',
            canonicalPath: '/players-online',
            // Drawn by the server from the latest count; `?v=` busts shared links' caches when the design changes
            image: {
              url: '/og/players-online.png?v=6',
              width: 1200,
              height: 630,
              alt: 'Old School RuneScape players online now and over the last 24 hours',
            },
          } satisfies PageMeta,
        },
        loadComponent: () => import('./features/players-online/players-online'),
      },
      {
        path: 'news',
        title: 'OSRS news: Every Old School RuneScape news post',
        data: {
          meta: {
            description:
              'Every Old School RuneScape news post, newest first, by category, with what changed since you last played.',
            canonicalPath: '/news',
          } satisfies PageMeta,
        },
        loadComponent: () => import('./features/news/news'),
      },
      {
        path: 'about',
        pathMatch: 'prefix',
        loadChildren: () => import('./features/about/about.routes'),
      },
      {
        path: 'error',
        title: 'Error - OSRS Tracker',
        loadComponent: () => import('./features/error/error-page'),
      },
      {
        path: '**',
        pathMatch: 'full',
        title: '404 Not Found - OSRS Tracker',
        loadComponent: () => import('./features/not-found/not-found'),
      },
    ],
  },
] as Route[];
