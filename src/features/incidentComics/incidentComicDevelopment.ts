import { INCIDENT_COMICS, type IncidentComicId } from '@/data/incidentComics';
import type { EnemyId } from '@/data/enemies';

import type { IncidentComicProgressV1 } from './incidentComicStorage';

/**
 * Local-only controls for exercising the irregular incident schedule.
 * Character ownership has its own __DEV__-guarded preview switch; keeping a
 * second unconditional unlock here could accidentally bypass story progress.
 */
export const INCIDENT_COMIC_DEVELOPMENT = {
  previewAllBlackStarsUnlocked: false,
  // The agreed force-appearance hook is available only in local/dev builds;
  // release builds keep the normal irregular 1–3 day schedule.
  showForceAppearanceControl: __DEV__,
} as const;

const ALL_BLACK_STAR_IDS = INCIDENT_COMICS.map((incident) => incident.enemyId);

export function getEffectiveUnlockedBlackStars(
  progress: IncidentComicProgressV1,
  previewAll = INCIDENT_COMIC_DEVELOPMENT.previewAllBlackStarsUnlocked,
): readonly EnemyId[] {
  return previewAll ? ALL_BLACK_STAR_IDS : progress.unlockedEnemyIds;
}

export type IncidentComicDeveloperActions = {
  forceNextIncident: (incidentId?: IncidentComicId) => void;
};
