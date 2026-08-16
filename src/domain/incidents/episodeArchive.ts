import type { EnemyId } from '@/data/enemyCases';
import { createInitialPlaybackState, normalizePlaybackState } from '@/data/episodes/playback';
import { getEpisode } from '@/data/episodes/registry';
import type { EpisodeId, PlaybackState } from '@/data/episodes/types';
import type { MobbyId } from '@/data/mobies';

export const INCIDENT_STORAGE_SCHEMA_VERSION = 5 as const;

export type EpisodeEndingId = string;

export type ActiveEpisode = {
  runId: string;
  episodeId: EpisodeId;
  targetItemId: string;
  targetMobbyId: MobbyId;
  enemyId: EnemyId;
  playback: PlaybackState;
  notification: { pending: boolean; cutInSeen: boolean };
};

export type EpisodeArchiveEntry = {
  episodeId: EpisodeId;
  playCount: number;
  firstCompletedAt: number | null;
  lastCompletedAt: number | null;
  endingIds: readonly EpisodeEndingId[];
  lastEndingId: EpisodeEndingId;
  memorableLine: string;
};

export type RelationshipArchiveEntry = {
  enemyId: EnemyId;
  mobbyId: MobbyId;
  label: string;
  updatedAt: number;
};

export type LegacyV4Archive = {
  cases: readonly { caseId: string; solveCount: number; firstSolvedAt: number | null; lastSolvedAt: number | null }[];
};

export type EpisodeArchive = {
  episodes: readonly EpisodeArchiveEntry[];
  relationships: readonly RelationshipArchiveEntry[];
  legacyV4: LegacyV4Archive | null;
};

export type PendingEpisodeResolution = {
  runId: string;
  episodeId: EpisodeId;
  targetItemId: string;
  targetMobbyId: MobbyId;
  enemyId: EnemyId;
  endingId: EpisodeEndingId;
  completedAt: number;
  step: 'returning' | 'aftermath';
};

export type IncidentStorageV5 = {
  schemaVersion: typeof INCIDENT_STORAGE_SCHEMA_VERSION;
  archive: EpisodeArchive;
  activeEpisode: ActiveEpisode | null;
  pendingResolution: PendingEpisodeResolution | null;
};

export type EpisodeStorageCodec = {
  validTargetItemIds: ReadonlySet<string>;
  validEnemyIds?: ReadonlySet<string>;
  validMobbyIds?: ReadonlySet<string>;
  mobbyIdForTargetItem: (itemId: string) => MobbyId | null;
  targetItemIdForMobby?: (mobbyId: MobbyId) => string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const isTime = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const isNullableTime = (value: unknown): value is number | null => value === null || isTime(value);

export function freshEpisodeStorage(): IncidentStorageV5 {
  return { schemaVersion: 5, archive: { episodes: [], relationships: [], legacyV4: null }, activeEpisode: null, pendingResolution: null };
}

function endingFromPlayback(playback: PlaybackState): EpisodeEndingId {
  return Object.values(playback.choices).at(-1) ?? 'completed';
}

function sanitizeEpisodeEntries(value: unknown): EpisodeArchiveEntry[] {
  if (!Array.isArray(value)) return [];
  const result: EpisodeArchiveEntry[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || !isString(raw.episodeId) || !getEpisode(raw.episodeId as EpisodeId)) continue;
    if (!Number.isSafeInteger(raw.playCount) || Number(raw.playCount) < 1 || !isNullableTime(raw.firstCompletedAt) || !isNullableTime(raw.lastCompletedAt)) continue;
    const episode = getEpisode(raw.episodeId as EpisodeId);
    const validEndingIds = new Set(episode?.scenes.flatMap((scene) => scene.interaction?.kind === 'choice' ? scene.interaction.options.map((option) => option.id) : []) ?? []);
    const endingIds = Array.isArray(raw.endingIds)
      ? [...new Set(raw.endingIds.filter((id): id is EpisodeEndingId => typeof id === 'string' && (id === 'completed' || validEndingIds.has(id))))]
      : [];
    if (!endingIds.length || !isString(raw.lastEndingId) || !endingIds.includes(raw.lastEndingId) || !isString(raw.memorableLine)) continue;
    if (result.some((entry) => entry.episodeId === raw.episodeId)) continue;
    result.push({ episodeId: raw.episodeId as EpisodeId, playCount: Number(raw.playCount), firstCompletedAt: raw.firstCompletedAt, lastCompletedAt: raw.lastCompletedAt, endingIds, lastEndingId: raw.lastEndingId, memorableLine: raw.memorableLine });
  }
  return result;
}

function sanitizeRelationships(value: unknown, codec: EpisodeStorageCodec): RelationshipArchiveEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!isRecord(raw) || !isString(raw.enemyId) || !isString(raw.mobbyId) || !isString(raw.label) || !isTime(raw.updatedAt)) return [];
    if (codec.validEnemyIds && !codec.validEnemyIds.has(raw.enemyId)) return [];
    if (codec.validMobbyIds && !codec.validMobbyIds.has(raw.mobbyId)) return [];
    return [{ enemyId: raw.enemyId as EnemyId, mobbyId: raw.mobbyId as MobbyId, label: raw.label, updatedAt: raw.updatedAt }];
  });
}

function sanitizeLegacy(value: unknown): LegacyV4Archive | null {
  if (!isRecord(value) || !Array.isArray(value.cases)) return null;
  const cases = value.cases.flatMap((raw) => {
    if (!isRecord(raw) || !isString(raw.caseId) || !Number.isSafeInteger(raw.solveCount) || Number(raw.solveCount) < 1 || !isNullableTime(raw.firstSolvedAt) || !isNullableTime(raw.lastSolvedAt)) return [];
    return [{ caseId: raw.caseId, solveCount: Number(raw.solveCount), firstSolvedAt: raw.firstSolvedAt, lastSolvedAt: raw.lastSolvedAt }];
  });
  return { cases };
}

function sanitizeActive(value: unknown, codec: EpisodeStorageCodec): ActiveEpisode | null {
  if (!isRecord(value) || !isString(value.runId) || !isString(value.episodeId) || !isString(value.targetItemId)) return null;
  const episode = getEpisode(value.episodeId as EpisodeId);
  const mobbyId = codec.mobbyIdForTargetItem(value.targetItemId);
  if (!episode || !codec.validTargetItemIds.has(value.targetItemId) || !mobbyId || value.targetMobbyId !== mobbyId || value.enemyId !== episode.enemyId) return null;
  if (!isRecord(value.notification) || typeof value.notification.pending !== 'boolean' || typeof value.notification.cutInSeen !== 'boolean') return null;
  return { runId: value.runId, episodeId: episode.id, targetItemId: value.targetItemId, targetMobbyId: mobbyId, enemyId: episode.enemyId, playback: normalizePlaybackState(episode, isRecord(value.playback) ? value.playback : null), notification: { pending: value.notification.pending, cutInSeen: value.notification.cutInSeen } };
}

function sanitizePending(value: unknown, codec: EpisodeStorageCodec): PendingEpisodeResolution | null {
  if (!isRecord(value) || !isString(value.runId) || !isString(value.episodeId) || !isString(value.targetItemId) || !isTime(value.completedAt)) return null;
  const episode = getEpisode(value.episodeId as EpisodeId);
  const mobbyId = codec.mobbyIdForTargetItem(value.targetItemId);
  const validEndingIds = new Set(episode?.scenes.flatMap((scene) => scene.interaction?.kind === 'choice' ? scene.interaction.options.map((option) => option.id) : []) ?? []);
  if (!episode || !mobbyId || value.targetMobbyId !== mobbyId || value.enemyId !== episode.enemyId || !isString(value.endingId) || (!validEndingIds.has(value.endingId) && value.endingId !== 'completed') || (value.step !== 'returning' && value.step !== 'aftermath')) return null;
  return { runId: value.runId, episodeId: episode.id, targetItemId: value.targetItemId, targetMobbyId: mobbyId, enemyId: episode.enemyId, endingId: value.endingId, completedAt: value.completedAt, step: value.step };
}

export function decodeEpisodeStorage(value: unknown, codec: EpisodeStorageCodec): IncidentStorageV5 {
  if (!isRecord(value)) return freshEpisodeStorage();
  if (value.schemaVersion === 5) {
    const rawArchive = isRecord(value.archive) ? value.archive : {};
    const pendingResolution = sanitizePending(value.pendingResolution, codec);
    return { schemaVersion: 5, archive: { episodes: sanitizeEpisodeEntries(rawArchive.episodes), relationships: sanitizeRelationships(rawArchive.relationships, codec), legacyV4: sanitizeLegacy(rawArchive.legacyV4) }, activeEpisode: pendingResolution ? null : sanitizeActive(value.activeEpisode, codec), pendingResolution };
  }
  if (value.schemaVersion === 4) {
    const rawArchive = isRecord(value.archive) ? value.archive : {};
    const legacyV4 = sanitizeLegacy(rawArchive) ?? { cases: [] };
    const migrated = freshEpisodeStorage();
    const oldActive = isRecord(value.activeIncident) ? value.activeIncident : null;
    if (oldActive && isString(oldActive.targetItemId) && codec.validTargetItemIds.has(oldActive.targetItemId)) {
      const episode = getEpisode('episode-1');
      const episodeTargetItemId = episode ? codec.targetItemIdForMobby?.(episode.featuredMobbyId) ?? oldActive.targetItemId : oldActive.targetItemId;
      const targetMobbyId = codec.mobbyIdForTargetItem(episodeTargetItemId);
      if (episode && targetMobbyId === episode.featuredMobbyId) migrated.activeEpisode = { runId: isString(oldActive.runId) ? `v5:${oldActive.runId}` : `v5:migrated:${Date.now()}`, episodeId: episode.id, targetItemId: episodeTargetItemId, targetMobbyId, enemyId: episode.enemyId, playback: createInitialPlaybackState(episode), notification: { pending: Boolean(oldActive.notificationPending), cutInSeen: false } };
    }
    return { ...migrated, archive: { ...migrated.archive, legacyV4 } };
  }
  return freshEpisodeStorage();
}

export function startEpisode(state: IncidentStorageV5, input: Omit<ActiveEpisode, 'playback'> & { playback?: PlaybackState }): IncidentStorageV5 {
  if (state.activeEpisode || state.pendingResolution) return state;
  const episode = getEpisode(input.episodeId);
  if (!episode) return state;
  return { ...state, activeEpisode: { ...input, playback: normalizePlaybackState(episode, input.playback) } };
}

export function acknowledgeEpisode(state: IncidentStorageV5, runId: string, cutInSeen = false): IncidentStorageV5 {
  if (!state.activeEpisode || state.activeEpisode.runId !== runId) return state;
  return { ...state, activeEpisode: { ...state.activeEpisode, notification: { pending: false, cutInSeen: state.activeEpisode.notification.cutInSeen || cutInSeen } } };
}

export function saveEpisodePlayback(state: IncidentStorageV5, runId: string, playback: PlaybackState): IncidentStorageV5 {
  if (!state.activeEpisode || state.activeEpisode.runId !== runId) return state;
  return { ...state, activeEpisode: { ...state.activeEpisode, playback } };
}

export function completeEpisode(state: IncidentStorageV5, runId: string, playback: PlaybackState, completedAt: number): IncidentStorageV5 {
  const active = state.activeEpisode;
  if (!active || active.runId !== runId || state.pendingResolution) return state;
  const endingId = endingFromPlayback(playback);
  const existing = state.archive.episodes.find((entry) => entry.episodeId === active.episodeId);
  const episode = getEpisode(active.episodeId);
  const choiceScene = episode?.scenes.find((scene) => scene.interaction?.kind === 'choice' && scene.interaction.options.some((option) => option.id === endingId));
  const destination = choiceScene?.interaction?.kind === 'choice' ? choiceScene.interaction.options.find((option) => option.id === endingId)?.nextSceneId : undefined;
  const memorableLine = episode?.scenes.find((scene) => scene.id === destination)?.lines[0]?.text ?? episode?.synopsis ?? '事件は思わぬ関係を残した。';
  const relationshipLabel = episode?.credits.find((credit) => credit.startsWith('関係：'))?.replace('関係：', '') ?? (active.episodeId === 'episode-1' ? '王子専属の紅茶係（本人は否定）' : '因縁の相手');
  const entry: EpisodeArchiveEntry = { episodeId: active.episodeId, playCount: (existing?.playCount ?? 0) + 1, firstCompletedAt: existing?.firstCompletedAt ?? completedAt, lastCompletedAt: completedAt, endingIds: existing?.endingIds.includes(endingId) ? existing.endingIds : [...(existing?.endingIds ?? []), endingId], lastEndingId: endingId, memorableLine };
  const relationship: RelationshipArchiveEntry = { enemyId: active.enemyId, mobbyId: active.targetMobbyId, label: relationshipLabel, updatedAt: completedAt };
  return { schemaVersion: 5, archive: { ...state.archive, episodes: existing ? state.archive.episodes.map((item) => item.episodeId === entry.episodeId ? entry : item) : [...state.archive.episodes, entry], relationships: [...state.archive.relationships.filter((item) => !(item.enemyId === relationship.enemyId && item.mobbyId === relationship.mobbyId)), relationship] }, activeEpisode: null, pendingResolution: { runId, episodeId: active.episodeId, targetItemId: active.targetItemId, targetMobbyId: active.targetMobbyId, enemyId: active.enemyId, endingId, completedAt, step: 'returning' } };
}

export function advanceEpisodeResolution(state: IncidentStorageV5, runId: string): IncidentStorageV5 {
  return state.pendingResolution?.runId === runId && state.pendingResolution.step === 'returning' ? { ...state, pendingResolution: { ...state.pendingResolution, step: 'aftermath' } } : state;
}

export function dismissEpisodeResolution(state: IncidentStorageV5, runId: string): IncidentStorageV5 {
  return state.pendingResolution?.runId === runId ? { ...state, pendingResolution: null } : state;
}
