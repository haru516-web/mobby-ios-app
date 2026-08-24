import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  INCIDENT_COMICS,
  type IncidentComicId,
} from '@/data/incidentComics';
import type { EnemyId } from '@/data/enemies';

export const INCIDENT_COMIC_PROGRESS_STORAGE_KEY = '@mobby/incident-comic-progress-v1';
export const INCIDENT_APPEARANCE_MIN_DAYS = 1;
export const INCIDENT_APPEARANCE_MAX_DAYS = 3;

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const INCIDENT_IDS = new Set<IncidentComicId>(INCIDENT_COMICS.map((incident) => incident.id));
const ENEMY_IDS = new Set<EnemyId>(INCIDENT_COMICS.map((incident) => incident.enemyId));

export type IncidentComicProgressV1 = {
  version: 1;
  completedIncidentIds: IncidentComicId[];
  unlockedEnemyIds: EnemyId[];
  /** One not-yet-completed incident may remain visible until it is finished. */
  availableIncidentId: IncidentComicId | null;
  /** Epoch milliseconds. Null while an incident is visible or all are complete. */
  nextAppearanceAt: number | null;
  lastAppearanceAt: number | null;
};

export type IncidentComicRandom = () => number;

let incidentComicWriteQueue: Promise<void> = Promise.resolve();

function boundedRandom(random: IncidentComicRandom) {
  const value = random();
  if (!Number.isFinite(value)) return 0;
  return Math.min(0.999999999, Math.max(0, value));
}

export function scheduleNextIncidentAppearance(
  now = Date.now(),
  random: IncidentComicRandom = Math.random,
): number {
  const dayOffset = INCIDENT_APPEARANCE_MIN_DAYS
    + Math.floor(boundedRandom(random) * (INCIDENT_APPEARANCE_MAX_DAYS - INCIDENT_APPEARANCE_MIN_DAYS + 1));
  return now + dayOffset * DAY_IN_MS;
}

export function createInitialIncidentComicProgress(
  now = Date.now(),
  random: IncidentComicRandom = Math.random,
): IncidentComicProgressV1 {
  return {
    version: 1,
    completedIncidentIds: [],
    unlockedEnemyIds: [],
    availableIncidentId: null,
    nextAppearanceAt: scheduleNextIncidentAppearance(now, random),
    lastAppearanceAt: null,
  };
}

function orderedIncidentIds(values: Iterable<IncidentComicId>): IncidentComicId[] {
  const valueSet = new Set(values);
  return INCIDENT_COMICS.filter((incident) => valueSet.has(incident.id)).map((incident) => incident.id);
}

function unlockedEnemiesFor(completedIncidentIds: readonly IncidentComicId[]): EnemyId[] {
  const completedSet = new Set(completedIncidentIds);
  return INCIDENT_COMICS
    .filter((incident) => completedSet.has(incident.id))
    .map((incident) => incident.enemyId);
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export function decodeIncidentComicProgress(
  raw: string | null,
  now = Date.now(),
  random: IncidentComicRandom = Math.random,
): IncidentComicProgressV1 {
  if (!raw) return createInitialIncidentComicProgress(now, random);

  try {
    const parsed = JSON.parse(raw) as Partial<IncidentComicProgressV1> & { version?: unknown };
    if (parsed.version !== 1) return createInitialIncidentComicProgress(now, random);

    const completedIncidentIds = orderedIncidentIds(
      Array.isArray(parsed.completedIncidentIds)
        ? parsed.completedIncidentIds.filter((value): value is IncidentComicId => typeof value === 'string' && INCIDENT_IDS.has(value as IncidentComicId))
        : [],
    );
    const completedSet = new Set(completedIncidentIds);
    const availableIncidentId = typeof parsed.availableIncidentId === 'string'
      && INCIDENT_IDS.has(parsed.availableIncidentId as IncidentComicId)
      && !completedSet.has(parsed.availableIncidentId as IncidentComicId)
      ? parsed.availableIncidentId as IncidentComicId
      : null;
    const allComplete = completedIncidentIds.length === INCIDENT_COMICS.length;
    const storedNextAppearanceAt = numberOrNull(parsed.nextAppearanceAt);

    return {
      version: 1,
      completedIncidentIds,
      // Unlocks are derived from completed stories so corrupted or stale data
      // cannot grant a different Black Star than the story that was watched.
      unlockedEnemyIds: unlockedEnemiesFor(completedIncidentIds),
      availableIncidentId: allComplete ? null : availableIncidentId,
      nextAppearanceAt: allComplete || availableIncidentId
        ? null
        : storedNextAppearanceAt ?? scheduleNextIncidentAppearance(now, random),
      lastAppearanceAt: numberOrNull(parsed.lastAppearanceAt),
    };
  } catch {
    return createInitialIncidentComicProgress(now, random);
  }
}

function firstUncompletedIncident(progress: IncidentComicProgressV1): IncidentComicId | null {
  const completedSet = new Set(progress.completedIncidentIds);
  return INCIDENT_COMICS.find((incident) => !completedSet.has(incident.id))?.id ?? null;
}

/**
 * Makes a scheduled incident visible when its deadline has passed. Incidents
 * remain in story order because the seventh story resolves details from the
 * previous six.
 */
export function reconcileIncidentComicSchedule(
  progress: IncidentComicProgressV1,
  now = Date.now(),
  random: IncidentComicRandom = Math.random,
): IncidentComicProgressV1 {
  const normalized = decodeIncidentComicProgress(JSON.stringify(progress), now, random);
  const nextIncidentId = firstUncompletedIncident(normalized);
  if (!nextIncidentId) {
    return { ...normalized, availableIncidentId: null, nextAppearanceAt: null };
  }
  if (normalized.availableIncidentId) return normalized;
  if (normalized.nextAppearanceAt !== null && normalized.nextAppearanceAt > now) return normalized;

  return {
    ...normalized,
    availableIncidentId: nextIncidentId,
    nextAppearanceAt: null,
    lastAppearanceAt: now,
  };
}

export function completeIncidentComic(
  progress: IncidentComicProgressV1,
  incidentId: IncidentComicId,
  now = Date.now(),
  random: IncidentComicRandom = Math.random,
): IncidentComicProgressV1 {
  if (progress.completedIncidentIds.includes(incidentId)) return progress;

  const completedIncidentIds = orderedIncidentIds([...progress.completedIncidentIds, incidentId]);
  const hasRemainingIncident = completedIncidentIds.length < INCIDENT_COMICS.length;
  return {
    ...progress,
    completedIncidentIds,
    unlockedEnemyIds: unlockedEnemiesFor(completedIncidentIds),
    availableIncidentId: progress.availableIncidentId === incidentId ? null : progress.availableIncidentId,
    nextAppearanceAt: progress.availableIncidentId === incidentId && hasRemainingIncident
      ? scheduleNextIncidentAppearance(now, random)
      : hasRemainingIncident
        ? progress.nextAppearanceAt
        : null,
  };
}

/** Skipping closes the player but deliberately grants no unlock or progress. */
export function skipIncidentComic(progress: IncidentComicProgressV1): IncidentComicProgressV1 {
  return progress;
}

/**
 * Developer-only integration hook. Call from a debug action to bypass the
 * 1–3 day timer and surface the next (or requested) uncompleted incident.
 */
export function forceIncidentComicAppearance(
  progress: IncidentComicProgressV1,
  requestedIncidentId?: IncidentComicId,
  now = Date.now(),
): IncidentComicProgressV1 {
  const completedSet = new Set(progress.completedIncidentIds);
  const requested = requestedIncidentId && !completedSet.has(requestedIncidentId)
    ? requestedIncidentId
    : null;
  const incidentId = requested ?? firstUncompletedIncident(progress);
  if (!incidentId) return progress;
  return {
    ...progress,
    availableIncidentId: incidentId,
    nextAppearanceAt: null,
    lastAppearanceAt: now,
  };
}

export function getStoryUnlockedBlackStars(progress: IncidentComicProgressV1): readonly EnemyId[] {
  return progress.unlockedEnemyIds.filter((enemyId) => ENEMY_IDS.has(enemyId));
}

export function persistIncidentComicProgress(progress: IncidentComicProgressV1): Promise<void> {
  const snapshot = JSON.stringify(progress);
  incidentComicWriteQueue = incidentComicWriteQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(INCIDENT_COMIC_PROGRESS_STORAGE_KEY, snapshot));
  return incidentComicWriteQueue;
}

export async function loadIncidentComicProgress(
  now = Date.now(),
  random: IncidentComicRandom = Math.random,
): Promise<IncidentComicProgressV1> {
  await incidentComicWriteQueue.catch(() => undefined);
  const raw = await AsyncStorage.getItem(INCIDENT_COMIC_PROGRESS_STORAGE_KEY);
  const decoded = decodeIncidentComicProgress(raw, now, random);
  const reconciled = reconcileIncidentComicSchedule(decoded, now, random);
  await persistIncidentComicProgress(reconciled).catch(() => undefined);
  return reconciled;
}

export async function resetIncidentComicProgress(
  now = Date.now(),
  random: IncidentComicRandom = Math.random,
): Promise<IncidentComicProgressV1> {
  const fresh = createInitialIncidentComicProgress(now, random);
  await persistIncidentComicProgress(fresh);
  return fresh;
}
