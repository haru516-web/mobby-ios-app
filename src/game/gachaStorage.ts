import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  GACHA_CATEGORY_RATES,
  GACHA_GOODS_REWARDS,
  GACHA_THEME_REWARDS,
  GACHA_TOOL_REWARDS,
  getGachaReward,
  isGachaRewardId,
  isGachaStackableRewardId,
  isGachaThemeRewardId,
  type GachaCharacterId,
  type GachaGoodsVariant,
  type GachaReward,
  type GachaRewardCategory,
  type GachaRewardId,
  type GachaStackableRewardId,
  type GachaStyleNumber,
  type GachaThemeRewardId,
  type GachaToolKind,
} from '@/data/gachaCatalog';

export const GACHA_STORAGE_KEY = '@mobby/gacha-inventory-v1';
export const GACHA_HISTORY_LIMIT = 12;

/**
 * Local-development preview switch. Production builds keep the normal gacha
 * ownership flow; the preview simply exposes every dress-up theme while the
 * current feature set is being reviewed.
 */
export const GACHA_DEVELOPMENT_FLAGS = {
  temporaryUnlockAllThemes: true,
} as const;

export type GachaPullSize = 1 | 10;
export type GachaRerollReason = 'none' | 'duplicate-theme' | 'all-themes-owned';

export type GachaPullHistoryEntry = {
  id: string;
  pulledAt: number;
  size: GachaPullSize;
  rewardIds: GachaRewardId[];
};

export type GachaInventoryState = {
  version: 1;
  stackableCounts: Partial<Record<GachaStackableRewardId, number>>;
  ownedThemeIds: GachaThemeRewardId[];
  equippedThemeId: GachaThemeRewardId | null;
  totalPulls: number;
  singlePulls: number;
  tenPulls: number;
  history: GachaPullHistoryEntry[];
  createdAt: number;
  updatedAt: number;
};

export type GachaPullResult = {
  rewardId: GachaRewardId;
  reward: GachaReward;
  isNew: boolean;
  inventoryCount: number;
  rerollReason: GachaRerollReason;
};

export type GachaPullOutcome = {
  state: GachaInventoryState;
  results: GachaPullResult[];
  pulledAt: number;
  size: GachaPullSize;
};

type RandomSource = () => number;
export type GachaPullOptions = {
  random?: RandomSource;
  now?: number;
};

const MAX_TIMESTAMP = 8_640_000_000_000_000;
const listeners = new Set<(state: GachaInventoryState) => void>();
let transactionQueue: Promise<void> = Promise.resolve();

export function isTemporaryThemeUnlockEnabled(): boolean {
  return (
    typeof __DEV__ !== 'undefined' &&
    __DEV__ &&
    GACHA_DEVELOPMENT_FLAGS.temporaryUnlockAllThemes
  );
}

function developmentOwnedThemeIds(): GachaThemeRewardId[] {
  return GACHA_THEME_REWARDS.map((theme) => theme.id);
}

function applyDevelopmentThemeOwnership(state: GachaInventoryState): GachaInventoryState {
  if (!isTemporaryThemeUnlockEnabled()) return state;
  return { ...state, ownedThemeIds: developmentOwnedThemeIds() };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isTimestamp(value: unknown): value is number {
  return isSafeCount(value) && (value as number) <= MAX_TIMESTAMP;
}

function normalizeTimestamp(value: number) {
  return Number.isFinite(value) && value >= 0
    ? Math.min(MAX_TIMESTAMP, Math.floor(value))
    : Date.now();
}

function normalizeRandom(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(0.9999999999999999, value);
}

function pickOne<T>(items: readonly T[], random: RandomSource): T {
  if (items.length === 0) throw new Error('Gacha reward pool is empty.');
  return items[Math.floor(normalizeRandom(random()) * items.length)];
}

function pickCategory(random: RandomSource): GachaRewardCategory {
  const roll = normalizeRandom(random()) * 100;
  if (roll < GACHA_CATEGORY_RATES.tool) return 'tool';
  if (roll < GACHA_CATEGORY_RATES.tool + GACHA_CATEGORY_RATES.goods) return 'goods';
  return 'theme';
}

function pickStackableAfterThemeCompletion(random: RandomSource) {
  const stackableRate = GACHA_CATEGORY_RATES.tool + GACHA_CATEGORY_RATES.goods;
  const toolThreshold = GACHA_CATEGORY_RATES.tool / stackableRate;
  return normalizeRandom(random()) < toolThreshold
    ? pickOne(GACHA_TOOL_REWARDS, random)
    : pickOne(GACHA_GOODS_REWARDS, random);
}

function drawReward(
  state: GachaInventoryState,
  random: RandomSource,
): { reward: GachaReward; rerollReason: GachaRerollReason } {
  const category = pickCategory(random);
  if (category === 'tool') return { reward: pickOne(GACHA_TOOL_REWARDS, random), rerollReason: 'none' };
  if (category === 'goods') return { reward: pickOne(GACHA_GOODS_REWARDS, random), rerollReason: 'none' };

  const ownedThemes = new Set<GachaThemeRewardId>(state.ownedThemeIds);
  const firstTheme = pickOne(GACHA_THEME_REWARDS, random);
  if (!ownedThemes.has(firstTheme.id)) return { reward: firstTheme, rerollReason: 'none' };

  const unownedThemes = GACHA_THEME_REWARDS.filter((theme) => !ownedThemes.has(theme.id));
  if (unownedThemes.length > 0) {
    return { reward: pickOne(unownedThemes, random), rerollReason: 'duplicate-theme' };
  }

  return {
    reward: pickStackableAfterThemeCompletion(random),
    rerollReason: 'all-themes-owned',
  };
}

function awardReward(
  state: GachaInventoryState,
  reward: GachaReward,
): { state: GachaInventoryState; isNew: boolean; inventoryCount: number } {
  if (reward.category === 'theme') {
    const alreadyOwned = state.ownedThemeIds.includes(reward.id);
    return {
      state: alreadyOwned
        ? state
        : { ...state, ownedThemeIds: [...state.ownedThemeIds, reward.id] },
      isNew: !alreadyOwned,
      inventoryCount: 1,
    };
  }

  const currentCount = state.stackableCounts[reward.id] ?? 0;
  const nextCount = currentCount + 1;
  return {
    state: {
      ...state,
      stackableCounts: { ...state.stackableCounts, [reward.id]: nextCount },
    },
    isNew: currentCount === 0,
    inventoryCount: nextCount,
  };
}

function decodeHistoryEntry(value: unknown): GachaPullHistoryEntry | null {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id.length === 0 ||
      !isTimestamp(value.pulledAt) || (value.size !== 1 && value.size !== 10) ||
      !Array.isArray(value.rewardIds) || value.rewardIds.length !== value.size ||
      !value.rewardIds.every(isGachaRewardId)) return null;
  return {
    id: value.id,
    pulledAt: value.pulledAt,
    size: value.size,
    rewardIds: [...value.rewardIds],
  };
}

export function createInitialGachaState(now = Date.now()): GachaInventoryState {
  const timestamp = normalizeTimestamp(now);
  return {
    version: 1,
    stackableCounts: {},
    ownedThemeIds: isTemporaryThemeUnlockEnabled() ? developmentOwnedThemeIds() : [],
    equippedThemeId: null,
    totalPulls: 0,
    singlePulls: 0,
    tenPulls: 0,
    history: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** Decode untrusted local data without allowing unknown reward IDs into inventory. */
export function decodeGachaState(value: unknown, now = Date.now()): GachaInventoryState | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.stackableCounts) ||
      !Array.isArray(value.ownedThemeIds) || !Array.isArray(value.history) ||
      !isSafeCount(value.totalPulls) || !isSafeCount(value.singlePulls) || !isSafeCount(value.tenPulls) ||
      !isTimestamp(value.createdAt) || !isTimestamp(value.updatedAt)) return null;

  const stackableCounts: Partial<Record<GachaStackableRewardId, number>> = {};
  for (const [id, count] of Object.entries(value.stackableCounts)) {
    if (isGachaStackableRewardId(id) && isSafeCount(count) && count > 0) stackableCounts[id] = count;
  }

  const ownedThemeIds = Array.from(new Set(value.ownedThemeIds.filter(isGachaThemeRewardId)));
  const equippedThemeId = value.equippedThemeId === null || value.equippedThemeId === undefined
    ? null
    : isGachaThemeRewardId(value.equippedThemeId) && ownedThemeIds.includes(value.equippedThemeId)
      ? value.equippedThemeId
      : null;
  const history = value.history
    .map(decodeHistoryEntry)
    .filter((entry): entry is GachaPullHistoryEntry => entry !== null)
    .slice(-GACHA_HISTORY_LIMIT);

  return {
    version: 1,
    stackableCounts,
    ownedThemeIds,
    equippedThemeId,
    totalPulls: value.totalPulls,
    singlePulls: value.singlePulls,
    tenPulls: value.tenPulls,
    history,
    createdAt: Math.min(value.createdAt, normalizeTimestamp(now)),
    updatedAt: value.updatedAt,
  };
}

export function runGachaPull(
  current: GachaInventoryState,
  size: GachaPullSize,
  options: GachaPullOptions = {},
): GachaPullOutcome {
  if (size !== 1 && size !== 10) throw new Error('Gacha pull size must be 1 or 10.');
  const random = options.random ?? Math.random;
  const pulledAt = normalizeTimestamp(options.now ?? Date.now());
  let state = current;
  const results: GachaPullResult[] = [];

  for (let index = 0; index < size; index += 1) {
    const { reward, rerollReason } = drawReward(state, random);
    const awarded = awardReward(state, reward);
    state = awarded.state;
    results.push({
      rewardId: reward.id,
      reward,
      isNew: awarded.isNew,
      inventoryCount: awarded.inventoryCount,
      rerollReason,
    });
  }

  const historyEntry: GachaPullHistoryEntry = {
    id: `pull:${pulledAt}:${current.totalPulls + size}`,
    pulledAt,
    size,
    rewardIds: results.map((result) => result.rewardId),
  };
  state = {
    ...state,
    totalPulls: current.totalPulls + size,
    singlePulls: current.singlePulls + (size === 1 ? 1 : 0),
    tenPulls: current.tenPulls + (size === 10 ? 1 : 0),
    history: [...current.history, historyEntry].slice(-GACHA_HISTORY_LIMIT),
    updatedAt: pulledAt,
  };

  return { state, results, pulledAt, size };
}

async function readStoredGachaState(): Promise<GachaInventoryState> {
  const now = Date.now();
  try {
    const raw = await AsyncStorage.getItem(GACHA_STORAGE_KEY);
    if (!raw) return createInitialGachaState(now);
    const decoded = decodeGachaState(JSON.parse(raw), now) ?? createInitialGachaState(now);
    return applyDevelopmentThemeOwnership(decoded);
  } catch {
    return createInitialGachaState(now);
  }
}

async function persistState(state: GachaInventoryState) {
  await AsyncStorage.setItem(GACHA_STORAGE_KEY, JSON.stringify(state));
}

function publish(state: GachaInventoryState) {
  for (const listener of listeners) listener(state);
}

function enqueueTransaction<T>(operation: () => Promise<T>): Promise<T> {
  const result = transactionQueue.catch(() => undefined).then(operation);
  transactionQueue = result.then(() => undefined, () => undefined);
  return result;
}

export async function loadGachaState(): Promise<GachaInventoryState> {
  await transactionQueue.catch(() => undefined);
  return readStoredGachaState();
}

export function performGachaPull(
  size: GachaPullSize,
  options: GachaPullOptions = {},
): Promise<GachaPullOutcome> {
  return enqueueTransaction(async () => {
    const current = await readStoredGachaState();
    const outcome = runGachaPull(current, size, options);
    await persistState(outcome.state);
    publish(outcome.state);
    return outcome;
  });
}

export function equipGachaTheme(themeId: GachaThemeRewardId | null): Promise<GachaInventoryState> {
  return enqueueTransaction(async () => {
    const current = await readStoredGachaState();
    if (themeId !== null && !current.ownedThemeIds.includes(themeId)) {
      throw new Error('未所持のテーマは装着できません。');
    }
    const next = { ...current, equippedThemeId: themeId, updatedAt: Date.now() };
    await persistState(next);
    publish(next);
    return next;
  });
}

export function subscribeGachaState(listener: (state: GachaInventoryState) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getGachaInventoryCount(state: GachaInventoryState, rewardId: GachaRewardId) {
  return isGachaThemeRewardId(rewardId)
    ? Number(state.ownedThemeIds.includes(rewardId))
    : state.stackableCounts[rewardId] ?? 0;
}

export function getGachaGoodsCount(
  state: GachaInventoryState,
  characterId: GachaCharacterId,
  variant: GachaGoodsVariant,
) {
  return state.stackableCounts[`goods:${characterId}:${variant}`] ?? 0;
}

export function getGachaToolCount(
  state: GachaInventoryState,
  toolKind: GachaToolKind,
  styleNumber: GachaStyleNumber,
) {
  return state.stackableCounts[`tool:${toolKind}:${styleNumber}`] ?? 0;
}

export function isGachaThemeOwned(
  state: GachaInventoryState,
  characterId: GachaCharacterId,
  styleNumber: GachaStyleNumber,
) {
  return state.ownedThemeIds.includes(`theme:${characterId}:${styleNumber}`);
}

export function resolveGachaHistoryRewards(entry: GachaPullHistoryEntry) {
  return entry.rewardIds.map(getGachaReward);
}
