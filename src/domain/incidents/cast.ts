import type { ImageSourcePropType } from 'react-native';

import type { MobbyId } from '@/data/mobies';

export type IncidentAllySlot = 'lead' | 'support';

export type IncidentAllyCandidate = {
  itemId: string;
  mobbyId: MobbyId;
  name: string;
  image: ImageSourcePropType;
  owned: boolean;
  homeVisible: boolean;
};

export type IncidentAllySelection = {
  slot: IncidentAllySlot;
  id: MobbyId;
  name: string;
  image: ImageSourcePropType;
};

export type PersistedIncidentAllyIds = {
  lead: MobbyId | null;
  support: MobbyId | null;
};

export type SupportedIncidentStorageSchema = 2 | 3;

export type IncidentStorageEnvelope = {
  schemaVersion: SupportedIncidentStorageSchema;
  solved: unknown[];
  reactions: unknown[];
  activeId: string | null;
  targetItemId: string | null;
  progress: Record<string, unknown> | null;
  notificationPending: boolean;
  allies?: unknown;
  introSeen?: boolean;
};

const EMPTY_ALLY_IDS: PersistedIncidentAllyIds = { lead: null, support: null };
const MOBBY_ID_SET: ReadonlySet<string> = new Set<MobbyId>([
  'mobirin',
  'mobichi',
  'yami',
  'mobiyan',
  'mobiyura',
  'reomoby',
  'potemoby',
  'mobibou',
  'babumoby',
]);

export function parseIncidentStorageEnvelope(value: unknown): IncidentStorageEnvelope | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.schemaVersion !== 2 && raw.schemaVersion !== 3) return null;
  if (!Array.isArray(raw.solved) || !Array.isArray(raw.reactions)) return null;
  if (raw.activeId !== null && typeof raw.activeId !== 'string') return null;
  if (raw.targetItemId !== null && typeof raw.targetItemId !== 'string') return null;
  if (raw.progress !== null && (typeof raw.progress !== 'object' || Array.isArray(raw.progress))) return null;
  if (typeof raw.notificationPending !== 'boolean') return null;
  if (raw.schemaVersion === 3) {
    if (typeof raw.allies !== 'object' || raw.allies === null || Array.isArray(raw.allies)) return null;
    if (typeof raw.introSeen !== 'boolean') return null;
  }
  return {
    schemaVersion: raw.schemaVersion,
    solved: raw.solved,
    reactions: raw.reactions,
    activeId: raw.activeId,
    targetItemId: raw.targetItemId,
    progress: raw.progress as Record<string, unknown> | null,
    notificationPending: raw.notificationPending,
    allies: raw.allies,
    introSeen: raw.introSeen as boolean | undefined,
  };
}

export function sanitizeIncidentHintLevels(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  migrateV2 = false,
): Record<string, number> | null {
  // Version 2 did not define bounded hint levels. Ignore any legacy payload
  // instead of allowing it to poison otherwise recoverable progress.
  if (migrateV2 || value === undefined) return {};
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const result: Record<string, number> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!allowedKeys.has(key) || !Number.isInteger(entry) || Number(entry) < 0 || Number(entry) > 3) return null;
    result[key] = Number(entry);
  }
  return result;
}

function eligibleCandidates(candidates: readonly IncidentAllyCandidate[], targetItemId: string) {
  return candidates.filter((candidate) => MOBBY_ID_SET.has(candidate.mobbyId) && candidate.owned && candidate.itemId !== targetItemId);
}

/**
 * Selects allies deterministically in source order, preferring Mobies currently
 * visible at home. Enemy IDs cannot enter this boundary because `mobbyId` is a
 * closed MobbyId union.
 */
export function selectIncidentAllies(
  candidates: readonly IncidentAllyCandidate[],
  targetItemId: string,
): readonly IncidentAllySelection[] {
  const eligible = eligibleCandidates(candidates, targetItemId);
  const ordered = [
    ...eligible.filter((candidate) => candidate.homeVisible),
    ...eligible.filter((candidate) => !candidate.homeVisible),
  ];
  return ordered.slice(0, 2).map((candidate, index) => ({
    slot: index === 0 ? 'lead' : 'support',
    id: candidate.mobbyId,
    name: candidate.name,
    image: candidate.image,
  }));
}

export function incidentAllyIds(allies: readonly IncidentAllySelection[]): PersistedIncidentAllyIds {
  return {
    lead: allies.find((ally) => ally.slot === 'lead')?.id ?? null,
    support: allies.find((ally) => ally.slot === 'support')?.id ?? null,
  };
}

export function restoreIncidentAllies(
  raw: unknown,
  candidates: readonly IncidentAllyCandidate[],
  targetItemId: string,
): readonly IncidentAllySelection[] | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const lead = value.lead === null || typeof value.lead === 'string' ? value.lead : undefined;
  const support = value.support === null || typeof value.support === 'string' ? value.support : undefined;
  if (lead === undefined || support === undefined || (lead === null && support !== null) || lead === support) return null;

  const eligible = eligibleCandidates(candidates, targetItemId);
  const byId = new Map(eligible.map((candidate) => [candidate.mobbyId, candidate]));
  const ids = [lead, support].filter((id): id is string => id !== null);
  const restored: IncidentAllySelection[] = [];
  for (const [index, id] of ids.entries()) {
    const candidate = byId.get(id as MobbyId);
    if (!candidate) return null;
    restored.push({ slot: index === 0 ? 'lead' : 'support', id: candidate.mobbyId, name: candidate.name, image: candidate.image });
  }
  return restored;
}

/** v2 had no cast payload; migration derives a safe, deterministic cast. */
export function migrateV2IncidentAllies(
  candidates: readonly IncidentAllyCandidate[],
  targetItemId: string,
): readonly IncidentAllySelection[] {
  return selectIncidentAllies(candidates, targetItemId);
}

export function emptyIncidentAllyIds(): PersistedIncidentAllyIds {
  return { ...EMPTY_ALLY_IDS };
}
