import { ResourceRef, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Player } from '@osrs-tracker/models';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import { XpTrackerStore } from './xp-tracker-store';

/** Call in an injection context, as a field initialiser */
export function recentPlayerLookups(): ResourceRef<Player[]> {
  const osrsTrackerRepo = inject(OsrsTrackerRepo);
  const scrapingOffset = inject(XpTrackerStore).scrapingOffset;

  return rxResource({
    params: () => ({ offset: scrapingOffset() }),
    stream: ({ params: { offset } }) => osrsTrackerRepo.getRecentPlayerLookups(offset),
    defaultValue: [],
  });
}
