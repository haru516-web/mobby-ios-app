import type { EnemyCaseId, EnemyId } from '@/data/enemyCases';
import type { IncidentComicId } from '@/data/incidentComics';
import type { MobbyId } from '@/data/mobies';

import type { PersistedIncidentAllyIds } from './cast';

export const INCIDENT_STORAGE_SCHEMA_VERSION = 4 as const;

export type IncidentCaseArchive = {
  caseId: EnemyCaseId;
  solveCount: number;
  firstSolvedAt: number | null;
  lastSolvedAt: number | null;
};

export type IncidentComicUnlock = {
  comicId: IncidentComicId;
  targetMobbyId: MobbyId;
  sourceCaseId: EnemyCaseId;
  unlockedAt: number | null;
};

export type IncidentArchive = {
  organizationIntroSeen: boolean;
  cases: readonly IncidentCaseArchive[];
  identifiedEnemyIds: readonly EnemyId[];
  comicUnlocks: readonly IncidentComicUnlock[];
};

export type ActiveIncident<TProgress> = {
  runId: string;
  status: 'investigating';
  caseId: EnemyCaseId;
  targetItemId: string;
  targetMobbyId: MobbyId;
  allies: PersistedIncidentAllyIds;
  caseIntroSeen: boolean;
  progress: TProgress;
  notificationPending: boolean;
};

export type PendingIncidentReward = {
  runId: string;
  step: 'returning' | 'reward';
  caseId: EnemyCaseId;
  targetItemId: string;
  targetMobbyId: MobbyId;
  enemyId: EnemyId;
  comicId: IncidentComicId;
  newEnemyId: EnemyId | null;
  newComicId: IncidentComicId | null;
  allies: PersistedIncidentAllyIds;
  solvedAt: number;
};

export type IncidentStorageV4<TProgress> = {
  schemaVersion: typeof INCIDENT_STORAGE_SCHEMA_VERSION;
  archive: IncidentArchive;
  activeIncident: ActiveIncident<TProgress> | null;
  pendingReward: PendingIncidentReward | null;
};

export type IncidentStorageCodec<TProgress> = {
  caseIds: ReadonlySet<string>;
  playableCaseIds: ReadonlySet<string>;
  enemyIds: ReadonlySet<string>;
  mobbyIds: ReadonlySet<string>;
  enemyIdForCase: (caseId: EnemyCaseId) => EnemyId | null;
  comicIdForMobby: (mobbyId: MobbyId) => IncidentComicId | null;
  mobbyIdForTargetItem: (itemId: string) => MobbyId | null;
  isValidTargetItem: (itemId: string) => boolean;
  sanitizeAllies: (value: unknown, targetItemId: string) => PersistedIncidentAllyIds | null;
  sanitizeProgress: (value: unknown, source: 'v3' | 'v4') => TProgress | null;
};

export type IncidentStorageDecodeResult<TProgress> = {
  state: IncidentStorageV4<TProgress>;
  source: 'fresh' | 'v3' | 'v4';
};

export type StartIncidentRunInput<TProgress> = {
  runId: string;
  caseId: EnemyCaseId;
  targetItemId: string;
  targetMobbyId: MobbyId;
  allies: PersistedIncidentAllyIds;
  progress: TProgress;
  notificationPending: boolean;
};

export type SolveIncidentRunInput = {
  runId: string;
  caseId: EnemyCaseId;
  targetItemId: string;
  targetMobbyId: MobbyId;
  enemyId: EnemyId;
  comicId: IncidentComicId;
  solvedAt: number;
};

export type IncidentRewardResolver = {
  enemyIdForCase: (caseId: EnemyCaseId) => EnemyId | null;
  comicIdForMobby: (mobbyId: MobbyId) => IncidentComicId | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isTimestamp(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isNullableTimestamp(value: unknown): value is number | null {
  return value === null || isTimestamp(value);
}

function uniqueStrings(value: unknown, allowed: ReadonlySet<string>): string[] | null {
  if (!Array.isArray(value)) return null;
  const result: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || !allowed.has(entry) || result.includes(entry)) return null;
    result.push(entry);
  }
  return result;
}

function sameStringSet(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function emptyAllies(allies: PersistedIncidentAllyIds) {
  return allies.lead === null && allies.support === null;
}

export function freshIncidentStorage<TProgress>(): IncidentStorageV4<TProgress> {
  return {
    schemaVersion: INCIDENT_STORAGE_SCHEMA_VERSION,
    archive: {
      organizationIntroSeen: false,
      cases: [],
      identifiedEnemyIds: [],
      comicUnlocks: [],
    },
    activeIncident: null,
    pendingReward: null,
  };
}

function sanitizeCaseArchive(value: unknown, codec: IncidentStorageCodec<unknown>): IncidentCaseArchive[] | null {
  if (!Array.isArray(value)) return null;
  const result: IncidentCaseArchive[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.caseId !== 'string' || !codec.caseIds.has(entry.caseId)) return null;
    if (!Number.isSafeInteger(entry.solveCount) || Number(entry.solveCount) < 1) return null;
    if (!isNullableTimestamp(entry.firstSolvedAt) || !isNullableTimestamp(entry.lastSolvedAt)) return null;
    // A migrated v3 record has an unknown historical first-solve time. Its
    // last-solve time can become known after a replay without inventing the
    // original timestamp.
    if (entry.firstSolvedAt !== null && entry.lastSolvedAt === null) return null;
    if (entry.firstSolvedAt !== null && entry.lastSolvedAt !== null && entry.firstSolvedAt > entry.lastSolvedAt) return null;
    if (result.some((record) => record.caseId === entry.caseId)) return null;
    result.push({
      caseId: entry.caseId as EnemyCaseId,
      solveCount: Number(entry.solveCount),
      firstSolvedAt: entry.firstSolvedAt,
      lastSolvedAt: entry.lastSolvedAt,
    });
  }
  return result;
}

function sanitizeComicUnlocks(value: unknown, codec: IncidentStorageCodec<unknown>): IncidentComicUnlock[] | null {
  if (!Array.isArray(value)) return null;
  const result: IncidentComicUnlock[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.targetMobbyId !== 'string' || !codec.mobbyIds.has(entry.targetMobbyId)) return null;
    if (typeof entry.sourceCaseId !== 'string' || !codec.caseIds.has(entry.sourceCaseId) || !isNonEmptyString(entry.comicId)) return null;
    if (!isNullableTimestamp(entry.unlockedAt)) return null;
    const mobbyId = entry.targetMobbyId as MobbyId;
    const expectedComicId = codec.comicIdForMobby(mobbyId);
    if (!expectedComicId || entry.comicId !== expectedComicId) return null;
    if (result.some((record) => record.comicId === entry.comicId || record.targetMobbyId === mobbyId)) return null;
    result.push({
      comicId: entry.comicId as IncidentComicId,
      targetMobbyId: mobbyId,
      sourceCaseId: entry.sourceCaseId as EnemyCaseId,
      unlockedAt: entry.unlockedAt,
    });
  }
  return result;
}

function sanitizeActiveIncident<TProgress>(value: unknown, codec: IncidentStorageCodec<TProgress>): ActiveIncident<TProgress> | null | undefined {
  if (value === null) return null;
  if (!isRecord(value) || !isNonEmptyString(value.runId) || value.status !== 'investigating') return undefined;
  if (typeof value.caseId !== 'string' || !codec.playableCaseIds.has(value.caseId)) return undefined;
  if (!isNonEmptyString(value.targetItemId) || !codec.isValidTargetItem(value.targetItemId)) return undefined;
  if (typeof value.targetMobbyId !== 'string' || !codec.mobbyIds.has(value.targetMobbyId)) return undefined;
  const targetMobbyId = codec.mobbyIdForTargetItem(value.targetItemId);
  if (!targetMobbyId || targetMobbyId !== value.targetMobbyId) return undefined;
  if (typeof value.caseIntroSeen !== 'boolean' || typeof value.notificationPending !== 'boolean') return undefined;
  if (value.caseIntroSeen && value.notificationPending) return undefined;
  const allies = codec.sanitizeAllies(value.allies, value.targetItemId);
  const progress = codec.sanitizeProgress(value.progress, 'v4');
  if (!allies || !progress) return undefined;
  return {
    runId: value.runId,
    status: 'investigating',
    caseId: value.caseId as EnemyCaseId,
    targetItemId: value.targetItemId,
    targetMobbyId,
    allies,
    caseIntroSeen: value.caseIntroSeen,
    progress,
    notificationPending: value.notificationPending,
  };
}

function sanitizePendingReward(value: unknown, codec: IncidentStorageCodec<unknown>): PendingIncidentReward | null | undefined {
  if (value === null) return null;
  if (!isRecord(value) || !isNonEmptyString(value.runId) || (value.step !== 'returning' && value.step !== 'reward')) return undefined;
  if (typeof value.caseId !== 'string' || !codec.caseIds.has(value.caseId)) return undefined;
  if (!isNonEmptyString(value.targetItemId) || !codec.isValidTargetItem(value.targetItemId)) return undefined;
  if (typeof value.targetMobbyId !== 'string' || !codec.mobbyIds.has(value.targetMobbyId)) return undefined;
  const targetMobbyId = codec.mobbyIdForTargetItem(value.targetItemId);
  if (!targetMobbyId || targetMobbyId !== value.targetMobbyId) return undefined;
  const caseId = value.caseId as EnemyCaseId;
  const expectedEnemyId = codec.enemyIdForCase(caseId);
  const expectedComicId = codec.comicIdForMobby(targetMobbyId);
  if (!expectedEnemyId || value.enemyId !== expectedEnemyId || !expectedComicId || value.comicId !== expectedComicId) return undefined;
  if (value.newEnemyId !== null && value.newEnemyId !== expectedEnemyId) return undefined;
  if (value.newComicId !== null && value.newComicId !== expectedComicId) return undefined;
  if (!isTimestamp(value.solvedAt)) return undefined;
  const allies = codec.sanitizeAllies(value.allies, value.targetItemId);
  if (!allies) return undefined;
  return {
    runId: value.runId,
    step: value.step,
    caseId,
    targetItemId: value.targetItemId,
    targetMobbyId,
    enemyId: expectedEnemyId,
    comicId: expectedComicId,
    newEnemyId: value.newEnemyId as EnemyId | null,
    newComicId: value.newComicId as IncidentComicId | null,
    allies,
    solvedAt: value.solvedAt,
  };
}

export function sanitizeIncidentStorageV4<TProgress>(value: unknown, codec: IncidentStorageCodec<TProgress>): IncidentStorageV4<TProgress> | null {
  if (!isRecord(value) || value.schemaVersion !== INCIDENT_STORAGE_SCHEMA_VERSION || !isRecord(value.archive)) return null;
  const rawArchive = value.archive;
  if (typeof rawArchive.organizationIntroSeen !== 'boolean') return null;
  const cases = sanitizeCaseArchive(rawArchive.cases, codec as IncidentStorageCodec<unknown>);
  const enemyIds = uniqueStrings(rawArchive.identifiedEnemyIds, codec.enemyIds);
  const comicUnlocks = sanitizeComicUnlocks(rawArchive.comicUnlocks, codec as IncidentStorageCodec<unknown>);
  const activeIncident = sanitizeActiveIncident(value.activeIncident, codec);
  const pendingReward = sanitizePendingReward(value.pendingReward, codec as IncidentStorageCodec<unknown>);
  if (!cases || !enemyIds || !comicUnlocks || activeIncident === undefined || pendingReward === undefined) return null;
  if (activeIncident && pendingReward) return null;

  const solvedIds = new Set(cases.map((record) => record.caseId));
  if (comicUnlocks.some((unlock) => !solvedIds.has(unlock.sourceCaseId))) return null;
  const expectedEnemyIds: EnemyId[] = [];
  for (const record of cases) {
    const enemyId = codec.enemyIdForCase(record.caseId);
    if (!enemyId) return null;
    if (!expectedEnemyIds.includes(enemyId)) expectedEnemyIds.push(enemyId);
  }
  if (!sameStringSet(enemyIds, expectedEnemyIds)) return null;
  if (activeIncident && solvedIds.has(activeIncident.caseId)) {
    // Replays are allowed. A run is distinguished by runId, not by case history.
  }
  if (pendingReward) {
    if (!solvedIds.has(pendingReward.caseId)) return null;
    if (!enemyIds.includes(pendingReward.enemyId)) return null;
    if (!comicUnlocks.some((unlock) => unlock.comicId === pendingReward.comicId)) return null;
    if (pendingReward.newEnemyId && !enemyIds.includes(pendingReward.newEnemyId)) return null;
    if (pendingReward.newComicId && !comicUnlocks.some((unlock) => unlock.comicId === pendingReward.newComicId)) return null;
  }

  return {
    schemaVersion: INCIDENT_STORAGE_SCHEMA_VERSION,
    archive: {
      organizationIntroSeen: rawArchive.organizationIntroSeen,
      cases,
      identifiedEnemyIds: enemyIds as EnemyId[],
      comicUnlocks,
    },
    activeIncident,
    pendingReward,
  };
}

export function migrateIncidentStorageV3<TProgress>(value: Record<string, unknown>, codec: IncidentStorageCodec<TProgress>): IncidentStorageV4<TProgress> | null {
  const solved = uniqueStrings(value.solved, codec.caseIds);
  const reactions = uniqueStrings(value.reactions, codec.caseIds);
  if (!solved || !reactions || typeof value.notificationPending !== 'boolean') return null;
  if (value.activeId !== null && (typeof value.activeId !== 'string' || !codec.playableCaseIds.has(value.activeId))) return null;
  if (value.targetItemId !== null && typeof value.targetItemId !== 'string') return null;
  if (typeof value.introSeen !== 'boolean') return null;

  const cases: IncidentCaseArchive[] = solved.map((caseId) => ({
    caseId: caseId as EnemyCaseId,
    solveCount: 1,
    firstSolvedAt: null,
    lastSolvedAt: null,
  }));
  const identifiedEnemyIds: EnemyId[] = [];
  for (const record of cases) {
    const enemyId = codec.enemyIdForCase(record.caseId);
    if (!enemyId) return null;
    if (!identifiedEnemyIds.includes(enemyId)) identifiedEnemyIds.push(enemyId);
  }

  let activeIncident: ActiveIncident<TProgress> | null = null;
  if (typeof value.activeId === 'string') {
    if (solved.includes(value.activeId) || !isNonEmptyString(value.targetItemId) || !codec.isValidTargetItem(value.targetItemId)) return null;
    const targetMobbyId = codec.mobbyIdForTargetItem(value.targetItemId);
    const allies = codec.sanitizeAllies(value.allies, value.targetItemId);
    const progress = codec.sanitizeProgress(value.progress, 'v3');
    if (!targetMobbyId || !allies || !progress || (value.notificationPending && value.introSeen)) return null;
    activeIncident = {
      runId: `migrated-v3:${value.activeId}:${value.targetItemId}`,
      status: 'investigating',
      caseId: value.activeId as EnemyCaseId,
      targetItemId: value.targetItemId,
      targetMobbyId,
      allies,
      caseIntroSeen: value.introSeen,
      progress,
      notificationPending: value.notificationPending,
    };
  } else {
    if (value.targetItemId !== null || value.progress !== null || value.notificationPending || value.introSeen) return null;
    const allies = codec.sanitizeAllies(value.allies, '');
    if (!allies || !emptyAllies(allies)) return null;
  }

  return {
    schemaVersion: INCIDENT_STORAGE_SCHEMA_VERSION,
    archive: {
      organizationIntroSeen: cases.length > 0,
      cases,
      identifiedEnemyIds,
      // v3 did not retain solved targets, so inventing historical comics would
      // attach rewards to Mobies that may never have been stolen.
      comicUnlocks: [],
    },
    activeIncident,
    pendingReward: null,
  };
}

export function decodeIncidentStorage<TProgress>(value: unknown, codec: IncidentStorageCodec<TProgress>): IncidentStorageDecodeResult<TProgress> {
  if (!isRecord(value)) return { state: freshIncidentStorage<TProgress>(), source: 'fresh' };
  if (value.schemaVersion === INCIDENT_STORAGE_SCHEMA_VERSION) {
    const state = sanitizeIncidentStorageV4(value, codec);
    return state ? { state, source: 'v4' } : { state: freshIncidentStorage<TProgress>(), source: 'fresh' };
  }
  if (value.schemaVersion === 3) {
    const state = migrateIncidentStorageV3(value, codec);
    return state ? { state, source: 'v3' } : { state: freshIncidentStorage<TProgress>(), source: 'fresh' };
  }
  return { state: freshIncidentStorage<TProgress>(), source: 'fresh' };
}

export function createIncidentRunId(caseId: EnemyCaseId, targetItemId: string, startedAt: number) {
  return `${caseId}:${targetItemId}:${startedAt}`;
}

export function startIncidentRun<TProgress>(
  state: IncidentStorageV4<TProgress>,
  input: StartIncidentRunInput<TProgress>,
  playableCaseIds: ReadonlySet<string>,
): IncidentStorageV4<TProgress> {
  if (state.activeIncident || state.pendingReward || !isNonEmptyString(input.runId) || !playableCaseIds.has(input.caseId)) return state;
  return {
    ...state,
    activeIncident: {
      runId: input.runId,
      status: 'investigating',
      caseId: input.caseId,
      targetItemId: input.targetItemId,
      targetMobbyId: input.targetMobbyId,
      allies: input.allies,
      caseIntroSeen: false,
      progress: input.progress,
      notificationPending: input.notificationPending,
    },
  };
}

export function markOrganizationIntroSeen<TProgress>(state: IncidentStorageV4<TProgress>): IncidentStorageV4<TProgress> {
  if (state.archive.organizationIntroSeen) return state;
  return { ...state, archive: { ...state.archive, organizationIntroSeen: true } };
}

export function markIncidentCaseIntroSeen<TProgress>(state: IncidentStorageV4<TProgress>, runId: string): IncidentStorageV4<TProgress> {
  const active = state.activeIncident;
  if (!active || active.runId !== runId || active.caseIntroSeen) return state;
  return { ...state, activeIncident: { ...active, caseIntroSeen: true, notificationPending: false } };
}

export function acknowledgeIncidentNotification<TProgress>(state: IncidentStorageV4<TProgress>, runId: string): IncidentStorageV4<TProgress> {
  const active = state.activeIncident;
  if (!active || active.runId !== runId || !active.notificationPending) return state;
  return { ...state, activeIncident: { ...active, notificationPending: false } };
}

export function updateIncidentProgress<TProgress>(state: IncidentStorageV4<TProgress>, runId: string, progress: TProgress): IncidentStorageV4<TProgress> {
  const active = state.activeIncident;
  if (!active || active.runId !== runId || active.status !== 'investigating') return state;
  return { ...state, activeIncident: { ...active, progress } };
}

export function solveIncidentRun<TProgress>(
  state: IncidentStorageV4<TProgress>,
  input: SolveIncidentRunInput,
  rewards: IncidentRewardResolver,
): IncidentStorageV4<TProgress> {
  const active = state.activeIncident;
  const expectedEnemyId = rewards.enemyIdForCase(input.caseId);
  const expectedComicId = rewards.comicIdForMobby(input.targetMobbyId);
  if (
    !active
    || state.pendingReward
    || active.status !== 'investigating'
    || active.runId !== input.runId
    || active.caseId !== input.caseId
    || active.targetItemId !== input.targetItemId
    || active.targetMobbyId !== input.targetMobbyId
    || input.enemyId !== expectedEnemyId
    || input.comicId !== expectedComicId
    || !isTimestamp(input.solvedAt)
  ) return state;

  const existingCase = state.archive.cases.find((record) => record.caseId === input.caseId);
  const hadEnemy = state.archive.identifiedEnemyIds.includes(input.enemyId);
  const hadComic = state.archive.comicUnlocks.some((unlock) => unlock.comicId === input.comicId || unlock.targetMobbyId === input.targetMobbyId);
  const effectiveSolvedAt = existingCase?.lastSolvedAt === null || existingCase?.lastSolvedAt === undefined
    ? input.solvedAt
    : Math.max(existingCase.lastSolvedAt, input.solvedAt);
  const nextCase: IncidentCaseArchive = existingCase
    ? {
        ...existingCase,
        solveCount: Math.min(Number.MAX_SAFE_INTEGER, existingCase.solveCount + 1),
        firstSolvedAt: existingCase.firstSolvedAt,
        lastSolvedAt: effectiveSolvedAt,
      }
    : { caseId: input.caseId, solveCount: 1, firstSolvedAt: effectiveSolvedAt, lastSolvedAt: effectiveSolvedAt };
  const cases = existingCase
    ? state.archive.cases.map((record) => record.caseId === input.caseId ? nextCase : record)
    : [...state.archive.cases, nextCase];
  const identifiedEnemyIds = hadEnemy ? state.archive.identifiedEnemyIds : [...state.archive.identifiedEnemyIds, input.enemyId];
  const comicUnlocks = hadComic
    ? state.archive.comicUnlocks
    : [...state.archive.comicUnlocks, {
        comicId: input.comicId,
        targetMobbyId: input.targetMobbyId,
        sourceCaseId: input.caseId,
        unlockedAt: effectiveSolvedAt,
      }];

  return {
    ...state,
    archive: {
      organizationIntroSeen: state.archive.organizationIntroSeen,
      cases,
      identifiedEnemyIds,
      comicUnlocks,
    },
    activeIncident: null,
    pendingReward: {
      runId: active.runId,
      step: 'returning',
      caseId: input.caseId,
      targetItemId: input.targetItemId,
      targetMobbyId: input.targetMobbyId,
      enemyId: input.enemyId,
      comicId: input.comicId,
      newEnemyId: hadEnemy ? null : input.enemyId,
      newComicId: hadComic ? null : input.comicId,
      allies: active.allies,
      solvedAt: effectiveSolvedAt,
    },
  };
}

export function completeIncidentReturn<TProgress>(state: IncidentStorageV4<TProgress>, runId: string): IncidentStorageV4<TProgress> {
  const pending = state.pendingReward;
  if (!pending || pending.runId !== runId || pending.step !== 'returning') return state;
  return { ...state, pendingReward: { ...pending, step: 'reward' } };
}

export function dismissIncidentReward<TProgress>(state: IncidentStorageV4<TProgress>, runId: string): IncidentStorageV4<TProgress> {
  const pending = state.pendingReward;
  if (!pending || pending.runId !== runId || pending.step !== 'reward') return state;
  return { ...state, pendingReward: null };
}

export function selectSolvedCaseIds<TProgress>(state: IncidentStorageV4<TProgress>): EnemyCaseId[] {
  return state.archive.cases.map((record) => record.caseId);
}

export function selectIdentifiedEnemyIds<TProgress>(state: IncidentStorageV4<TProgress>): ReadonlySet<EnemyId> {
  return new Set(state.archive.identifiedEnemyIds);
}

export function selectCaseArchive<TProgress>(state: IncidentStorageV4<TProgress>, caseId: EnemyCaseId) {
  return state.archive.cases.find((record) => record.caseId === caseId) ?? null;
}

export function selectComicUnlock<TProgress>(state: IncidentStorageV4<TProgress>, mobbyId: MobbyId) {
  return state.archive.comicUnlocks.find((unlock) => unlock.targetMobbyId === mobbyId) ?? null;
}
