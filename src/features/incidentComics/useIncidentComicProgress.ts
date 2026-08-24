import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  INCIDENT_COMIC_BY_ID,
  INCIDENT_COMICS,
  type IncidentComic,
  type IncidentComicId,
} from '@/data/incidentComics';
import type { EnemyId } from '@/data/enemies';

import {
  completeIncidentComic,
  createInitialIncidentComicProgress,
  forceIncidentComicAppearance,
  loadIncidentComicProgress,
  persistIncidentComicProgress,
  reconcileIncidentComicSchedule,
  skipIncidentComic,
  type IncidentComicProgressV1,
} from './incidentComicStorage';

export type UseIncidentComicProgressOptions = {
  /** Changing this refreshes a possibly elapsed 1–3 day schedule. */
  entryNonce?: number;
  onBlackStarUnlocked?: (enemyId: EnemyId, incidentId: IncidentComicId) => void;
};

export type IncidentComicProgressController = {
  progress: IncidentComicProgressV1;
  hydrated: boolean;
  availableIncident: IncidentComic | null;
  complete: (incidentId: IncidentComicId) => void;
  skip: (incidentId: IncidentComicId) => void;
  forceNextIncident: (incidentId?: IncidentComicId) => void;
  refreshSchedule: () => void;
  isIncidentVisible: (incidentId: IncidentComicId) => boolean;
  isIncidentCompleted: (incidentId: IncidentComicId) => boolean;
  isBlackStarStoryUnlocked: (enemyId: EnemyId) => boolean;
};

export function useIncidentComicProgress({
  entryNonce = 0,
  onBlackStarUnlocked,
}: UseIncidentComicProgressOptions = {}): IncidentComicProgressController {
  const [progress, setProgress] = useState<IncidentComicProgressV1>(() => createInitialIncidentComicProgress());
  const [hydrated, setHydrated] = useState(false);
  const progressRef = useRef(progress);
  const unlockCallbackRef = useRef(onBlackStarUnlocked);

  progressRef.current = progress;
  unlockCallbackRef.current = onBlackStarUnlocked;

  const commit = useCallback((next: IncidentComicProgressV1) => {
    progressRef.current = next;
    setProgress(next);
  }, []);

  const refreshSchedule = useCallback(() => {
    const next = reconcileIncidentComicSchedule(progressRef.current);
    if (next.availableIncidentId !== progressRef.current.availableIncidentId
      || next.nextAppearanceAt !== progressRef.current.nextAppearanceAt) {
      commit(next);
    }
  }, [commit]);

  useEffect(() => {
    let cancelled = false;
    void loadIncidentComicProgress()
      .then((storedProgress) => {
        if (!cancelled) commit(storedProgress);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [commit]);

  useEffect(() => {
    if (!hydrated) return;
    void persistIncidentComicProgress(progress).catch(() => undefined);
  }, [hydrated, progress]);

  useEffect(() => {
    if (!hydrated) return;
    refreshSchedule();
  }, [entryNonce, hydrated, refreshSchedule]);

  useEffect(() => {
    if (!hydrated || progress.availableIncidentId || progress.nextAppearanceAt === null) return;
    const delay = Math.max(0, progress.nextAppearanceAt - Date.now());
    const timer = setTimeout(refreshSchedule, delay);
    return () => clearTimeout(timer);
  }, [hydrated, progress.availableIncidentId, progress.nextAppearanceAt, refreshSchedule]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshSchedule();
    });
    return () => subscription.remove();
  }, [refreshSchedule]);

  const complete = useCallback((incidentId: IncidentComicId) => {
    const current = progressRef.current;
    const alreadyCompleted = current.completedIncidentIds.includes(incidentId);
    const next = completeIncidentComic(current, incidentId);
    commit(next);
    if (!alreadyCompleted) {
      unlockCallbackRef.current?.(INCIDENT_COMIC_BY_ID[incidentId].enemyId, incidentId);
    }
  }, [commit]);

  const skip = useCallback((incidentId: IncidentComicId) => {
    // Keep the parameter in the public API so analytics can be added without
    // changing player integrations. Skipping grants no story progress.
    void incidentId;
    commit(skipIncidentComic(progressRef.current));
  }, [commit]);

  const forceNextIncident = useCallback((incidentId?: IncidentComicId) => {
    commit(forceIncidentComicAppearance(progressRef.current, incidentId));
  }, [commit]);

  const completedSet = useMemo(() => new Set(progress.completedIncidentIds), [progress.completedIncidentIds]);
  const unlockedSet = useMemo(() => new Set(progress.unlockedEnemyIds), [progress.unlockedEnemyIds]);
  const availableIncident = progress.availableIncidentId
    ? INCIDENT_COMIC_BY_ID[progress.availableIncidentId]
    : null;

  const isIncidentCompleted = useCallback(
    (incidentId: IncidentComicId) => completedSet.has(incidentId),
    [completedSet],
  );
  const isIncidentVisible = useCallback(
    (incidentId: IncidentComicId) => completedSet.has(incidentId) || progress.availableIncidentId === incidentId,
    [completedSet, progress.availableIncidentId],
  );
  const isBlackStarStoryUnlocked = useCallback(
    (enemyId: EnemyId) => unlockedSet.has(enemyId),
    [unlockedSet],
  );

  return {
    progress,
    hydrated,
    availableIncident,
    complete,
    skip,
    forceNextIncident,
    refreshSchedule,
    isIncidentVisible,
    isIncidentCompleted,
    isBlackStarStoryUnlocked,
  };
}

/** Ordered ids are convenient for debug menus without importing the data layer. */
export const INCIDENT_COMIC_DEBUG_ORDER = INCIDENT_COMICS.map((incident) => incident.id);
