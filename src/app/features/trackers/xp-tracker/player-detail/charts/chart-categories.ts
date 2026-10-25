import { BOSSES, CLUES, MINIGAMES, RAIDS, UNCHARTED_MINIGAMES } from '../activity-categories';
import { ActivityView } from '../player-view';

/** Each category gets its own chart, so large point totals don't bury kill counts; minigames only chart running totals. */
export const CHART_CATEGORIES: Record<ActivityView, ReadonlySet<string>> = {
  bosses: BOSSES,
  raids: RAIDS,
  clues: CLUES,
  minigames: new Set([...MINIGAMES].filter(name => !(name in UNCHARTED_MINIGAMES))),
};
