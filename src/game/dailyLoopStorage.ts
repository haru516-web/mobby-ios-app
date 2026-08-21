import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  MISSION_BONUS,
  REACTION_MILESTONES,
  STAMP_REWARDS,
  reactionMilestoneReward,
  type DailyReward,
  type ReactionMilestone,
} from '@/data/dailyRewards';
import { isCollectibleSelection, type CollectibleVariant, type ItemId } from '@/data/collectibles';

export const DAILY_LOOP_STORAGE_KEY = '@mobby/daily-loop-v1';
export const MOBBY_TIME_DURATION_MS = 30 * 60 * 1000;

export function receiptBackedInventoryGrant(
  current: Record<string, number>,
  receiptKey: string,
  inventoryKey: string,
  amount: number,
): Record<string, number> {
  if (current[receiptKey] === 1) return current;
  return {
    ...current,
    [inventoryKey]: (current[inventoryKey] ?? 0) + amount,
    [receiptKey]: 1,
  };
}

export type MissionState = { pullReleases: number; mobbyTimeOpened: boolean; bonusQueued: boolean };
export type MobbyTimeEntitlement = {
  id: string;
  grantedOn: string;
  state: 'available' | 'opened' | 'expired';
  openedAt: number | null;
  expiresAt: number | null;
  carriedFrom: string | null;
};
export type MobbyTimeRewardPhase = 'opening' | 'revealed' | 'placing' | 'placed';
export type MobbyTimeReward = {
  eventId: string;
  entitlementId: string;
  itemId: ItemId;
  variant: CollectibleVariant;
  amount: 1;
  selectedAt: number;
  phase: MobbyTimeRewardPhase;
  inventoryGranted: boolean;
};

export function shouldGrantMobbyTimeReceipt(reward: MobbyTimeReward | null): reward is MobbyTimeReward {
  return reward?.phase === 'placed';
}
export type PendingReward = DailyReward & { eventId: string; sourceDate: string; cycle: number | null };
export type DailyLoopState = {
  version: 1;
  logicalDate: string;
  lastSeenAt: number;
  lastLoginDate: string | null;
  stampCycle: number;
  stampCount: number;
  rewardedStampKeys: string[];
  missionDate: string;
  missions: MissionState;
  mobbyTime: MobbyTimeEntitlement | null;
  mobbyTimeReward: MobbyTimeReward | null;
  pendingRewards: PendingReward[];
  reactionCount: number;
  claimedReactionMilestones: ReactionMilestone[];
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const STAMP_KEY_PATTERN = /^(\d+):([1-7])$/;
const MAX_DATE_MS = 8_640_000_000_000_000;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isSafeInt = (value: unknown, min = 0): value is number =>
  Number.isSafeInteger(value) && (value as number) >= min;
const isTimestamp = (value: unknown): value is number =>
  isSafeInt(value) && (value as number) <= MAX_DATE_MS;
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export function isLocalDateKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1000) return false;
  const roundTrip = new Date(0);
  roundTrip.setHours(12, 0, 0, 0);
  roundTrip.setFullYear(year, month - 1, day);
  return roundTrip.getFullYear() === year && roundTrip.getMonth() === month - 1 && roundTrip.getDate() === day;
}

export function localDateKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createInitialDailyLoopState(now = new Date()): DailyLoopState {
  const date = localDateKey(now);
  return {
    version: 1,
    logicalDate: date,
    lastSeenAt: now.getTime(),
    lastLoginDate: null,
    stampCycle: 1,
    stampCount: 0,
    rewardedStampKeys: [],
    missionDate: date,
    missions: { pullReleases: 0, mobbyTimeOpened: false, bonusQueued: false },
    mobbyTime: null,
    mobbyTimeReward: null,
    pendingRewards: [],
    reactionCount: 0,
    claimedReactionMilestones: [],
  };
}

function isLegacyDaySevenReward(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value) || value.id !== 'stamp-7' || value.kind !== 'mobby-time' || value.amount !== 1 || value.label !== 'MOBBY TIME') return false;
  const match = typeof value.eventId === 'string' ? /^stamp:(\d+):7$/.exec(value.eventId) : null;
  return Boolean(match && value.cycle === Number(match[1]) && isLocalDateKey(value.sourceDate));
}

/** Convert the shipped v1 day-7 placeholder before current-schema validation. */
export function migrateLegacyDailyLoopSnapshot(value: unknown): unknown {
  if (!isRecord(value) || !Array.isArray(value.pendingRewards)) return value;
  const legacy = value.pendingRewards.find(isLegacyDaySevenReward);
  if (!legacy) return value;
  const pendingRewards = value.pendingRewards.map((reward) => isLegacyDaySevenReward(reward)
    ? {
        ...STAMP_REWARDS[6],
        eventId: reward.eventId,
        sourceDate: reward.sourceDate,
        cycle: reward.cycle,
      }
    : reward);
  if (value.mobbyTime !== null || !isTimestamp(value.lastSeenAt) || !isLocalDateKey(value.logicalDate)) {
    return { ...value, pendingRewards };
  }
  const sourceDate = legacy.sourceDate as string;
  return {
    ...value,
    pendingRewards,
    mobbyTime: {
      id: `legacy:${String(legacy.eventId)}`,
      grantedOn: value.logicalDate,
      state: 'available',
      openedAt: null,
      expiresAt: Math.min(MAX_DATE_MS, value.lastSeenAt + MOBBY_TIME_DURATION_MS),
      carriedFrom: sourceDate < value.logicalDate ? sourceDate : null,
    },
  };
}

function rewardsEqual(actual: PendingReward, expected: DailyReward): boolean {
  return actual.id === expected.id && actual.kind === expected.kind &&
    actual.amount === expected.amount && actual.label === expected.label &&
    actual.itemId === expected.itemId && actual.variant === expected.variant;
}

function decodeReward(value: unknown): PendingReward | null {
  if (!isRecord(value) || !isNonEmptyString(value.eventId) || !isNonEmptyString(value.id) ||
      !['memory', 'mobby-time', 'mission-bonus', 'reaction-milestone'].includes(String(value.kind)) ||
      !isSafeInt(value.amount, 1) || !isNonEmptyString(value.label) || !isLocalDateKey(value.sourceDate) ||
      !(value.cycle === null || isSafeInt(value.cycle, 1))) return null;
  const reward = value as unknown as PendingReward;
  const stampMatch = /^stamp:(\d+):([1-7])$/.exec(reward.eventId);
  if (stampMatch) {
    const cycle = Number(stampMatch[1]);
    const stamp = Number(stampMatch[2]);
    return reward.cycle === cycle && rewardsEqual(reward, STAMP_REWARDS[stamp - 1]) ? reward : null;
  }
  if (reward.eventId === `mission:${reward.sourceDate}`) {
    return reward.cycle === null && rewardsEqual(reward, MISSION_BONUS) ? reward : null;
  }
  const reactionMatch = /^reaction:(25|50|75|100)$/.exec(reward.eventId);
  if (reactionMatch) {
    const milestone = Number(reactionMatch[1]) as ReactionMilestone;
    return reward.cycle === null && rewardsEqual(reward, reactionMilestoneReward(milestone)) ? reward : null;
  }
  return null;
}

function decodeEntitlement(value: unknown, lastSeenAt: number): MobbyTimeEntitlement | null | undefined {
  if (value === null) return null;
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isLocalDateKey(value.grantedOn) ||
      !['available', 'opened', 'expired'].includes(String(value.state)) ||
      !(value.openedAt === null || isTimestamp(value.openedAt)) ||
      !(value.expiresAt === null || isTimestamp(value.expiresAt)) ||
      !(value.carriedFrom === null || isLocalDateKey(value.carriedFrom))) return undefined;
  const entitlement = value as unknown as MobbyTimeEntitlement;
  if (entitlement.carriedFrom !== null && entitlement.carriedFrom > entitlement.grantedOn) return undefined;

  if (entitlement.state === 'opened') {
    if (entitlement.openedAt === null) return undefined;
    return { ...entitlement, expiresAt: null };
  }
  if (entitlement.state === 'expired') {
    // v1 bug compatibility: an opened box was previously rewritten to expired.
    if (entitlement.openedAt !== null) return { ...entitlement, state: 'opened', expiresAt: null };
    return entitlement.expiresAt === null ? undefined : entitlement;
  }
  if (entitlement.openedAt !== null) return undefined;
  return {
    ...entitlement,
    // Older v1 snapshots did not start the unopened 30-minute window.
    expiresAt: entitlement.expiresAt ?? Math.min(MAX_DATE_MS, lastSeenAt + MOBBY_TIME_DURATION_MS),
  };
}

function decodeMobbyTimeReward(value: unknown): MobbyTimeReward | null {
  if (!isRecord(value) || !isNonEmptyString(value.eventId) || !isNonEmptyString(value.entitlementId) ||
      !isCollectibleSelection(value) ||
      value.amount !== 1 || !isTimestamp(value.selectedAt) ||
      !['opening', 'revealed', 'placing', 'placed'].includes(String(value.phase)) ||
      typeof value.inventoryGranted !== 'boolean') return null;
  const reward = value as unknown as MobbyTimeReward;
  if (reward.eventId !== `mobby-time-reward:${reward.entitlementId}`) return null;
  return reward;
}

function recoverMobbyTimeReward(
  value: unknown,
  entitlement: MobbyTimeEntitlement | null,
): MobbyTimeReward | null {
  const decoded = decodeMobbyTimeReward(value);
  if (decoded) return decoded;
  if (!isRecord(value) || entitlement?.state !== 'opened' ||
      !isCollectibleSelection(value) ||
      value.amount !== 1 || !isTimestamp(value.selectedAt) || typeof value.inventoryGranted !== 'boolean') return null;

  return {
    eventId: `mobby-time-reward:${entitlement.id}`,
    entitlementId: entitlement.id,
    itemId: value.itemId,
    variant: value.variant,
    amount: 1,
    selectedAt: value.selectedAt,
    phase: ['opening', 'revealed', 'placing', 'placed'].includes(String(value.phase))
      ? value.phase as MobbyTimeRewardPhase
      : value.inventoryGranted ? 'placed' : 'opening',
    inventoryGranted: value.inventoryGranted,
  };
}

function decodePendingRewards(
  values: unknown[],
  logicalDate: string,
  stampCycle: number,
  stampCount: number,
): PendingReward[] {
  const seen = new Set<string>();
  const rewards: PendingReward[] = [];
  for (const value of values) {
    const reward = decodeReward(value);
    if (!reward || seen.has(reward.eventId) || reward.sourceDate > logicalDate) continue;
    if (reward.cycle !== null) {
      const stamp = Number(reward.eventId.split(':')[2]);
      if (reward.cycle > stampCycle || (reward.cycle === stampCycle && stamp > stampCount)) continue;
    }
    seen.add(reward.eventId);
    rewards.push(reward);
  }
  return rewards;
}

export function decodeDailyLoopState(value: unknown): DailyLoopState | null {
  value = migrateLegacyDailyLoopSnapshot(value);
  if (!isRecord(value) || value.version !== 1 || !isLocalDateKey(value.logicalDate) || !isTimestamp(value.lastSeenAt) ||
      !(value.lastLoginDate === null || isLocalDateKey(value.lastLoginDate)) || !isSafeInt(value.stampCycle, 1) ||
      !isSafeInt(value.stampCount) || (value.stampCount as number) > 6 || !Array.isArray(value.rewardedStampKeys) ||
      !value.rewardedStampKeys.every(isNonEmptyString) || !isLocalDateKey(value.missionDate) ||
      !isRecord(value.missions) || !isSafeInt(value.missions.pullReleases) || value.missions.pullReleases > 3 ||
      typeof value.missions.mobbyTimeOpened !== 'boolean' || typeof value.missions.bonusQueued !== 'boolean' ||
      !Array.isArray(value.pendingRewards) || !isSafeInt(value.reactionCount) ||
      !Array.isArray(value.claimedReactionMilestones)) return null;

  const logicalDate = value.logicalDate;
  const stampCycle = value.stampCycle;
  const stampCount = value.stampCount;
  const reactionCount = value.reactionCount;
  if ((value.lastLoginDate !== null && value.lastLoginDate > logicalDate) || value.missionDate > logicalDate) return null;
  if (value.missions.bonusQueued && (value.missions.pullReleases < 3 || !value.missions.mobbyTimeOpened)) return null;

  const stampKeys = value.rewardedStampKeys as string[];
  if (new Set(stampKeys).size !== stampKeys.length || stampKeys.some((key) => {
    const match = STAMP_KEY_PATTERN.exec(key);
    if (!match) return true;
    const cycle = Number(match[1]);
    const stamp = Number(match[2]);
    return cycle > stampCycle || (cycle === stampCycle && stamp > stampCount);
  })) return null;

  const decodedRewards = decodePendingRewards(value.pendingRewards, logicalDate, stampCycle, stampCount);

  const claimed = value.claimedReactionMilestones;
  if (!claimed.every((item) => REACTION_MILESTONES.includes(item as ReactionMilestone)) ||
      new Set(claimed).size !== claimed.length || claimed.some((item) => item > reactionCount)) return null;

  let mobbyTime = decodeEntitlement(value.mobbyTime, value.lastSeenAt);
  if (mobbyTime === undefined || (mobbyTime !== null && mobbyTime.grantedOn > logicalDate)) return null;
  // Older snapshots have no reward field. If a write was torn around the
  // event identity/phase, rebuild those fields from the opened entitlement;
  // the selected item and receipt state remain authoritative.
  const mobbyTimeReward = recoverMobbyTimeReward(value.mobbyTimeReward, mobbyTime);
  if (mobbyTime?.state === 'opened' && (!mobbyTimeReward || mobbyTimeReward.entitlementId !== mobbyTime.id)) {
    mobbyTime = {
      ...mobbyTime,
      state: 'available',
      openedAt: null,
      expiresAt: Math.min(MAX_DATE_MS, value.lastSeenAt + MOBBY_TIME_DURATION_MS),
    };
  }

  return {
    ...(value as unknown as DailyLoopState),
    mobbyTime,
    mobbyTimeReward,
    pendingRewards: decodedRewards,
    claimedReactionMilestones: [...claimed].sort((a, b) => a - b) as ReactionMilestone[],
  };
}

export function reconcileDailyLoop(state: DailyLoopState, now = new Date()): DailyLoopState {
  const observedDate = localDateKey(now);
  const logicalDate = observedDate < state.logicalDate ? state.logicalDate : observedDate;
  const effectiveNow = Math.max(now.getTime(), state.lastSeenAt);
  const dayChanged = logicalDate > state.logicalDate;
  let mobbyTime = state.mobbyTime;

  if (mobbyTime?.state === 'available' && mobbyTime.expiresAt !== null && effectiveNow >= mobbyTime.expiresAt) {
    mobbyTime = { ...mobbyTime, state: 'expired' };
  }
  if (dayChanged && mobbyTime?.state === 'expired' && mobbyTime.openedAt === null && mobbyTime.grantedOn < logicalDate) {
    mobbyTime = {
      ...mobbyTime,
      state: 'available',
      grantedOn: logicalDate,
      expiresAt: Math.min(MAX_DATE_MS, effectiveNow + MOBBY_TIME_DURATION_MS),
      carriedFrom: mobbyTime.carriedFrom ?? mobbyTime.grantedOn,
    };
  }
  if (dayChanged && mobbyTime?.state === 'available' && mobbyTime.grantedOn < logicalDate) {
    mobbyTime = {
      ...mobbyTime,
      grantedOn: logicalDate,
      expiresAt: Math.min(MAX_DATE_MS, effectiveNow + MOBBY_TIME_DURATION_MS),
      carriedFrom: mobbyTime.carriedFrom ?? mobbyTime.grantedOn,
    };
  }

  return {
    ...state,
    logicalDate,
    lastSeenAt: effectiveNow,
    mobbyTime,
    missionDate: dayChanged ? logicalDate : state.missionDate,
    missions: dayChanged ? { pullReleases: 0, mobbyTimeOpened: false, bonusQueued: false } : state.missions,
  };
}

export type HydratedDailyLoopQueue = {
  ready: Promise<void>;
  hydrate: (loaded: DailyLoopState) => Promise<void>;
  mutate: (recipe: (current: DailyLoopState) => DailyLoopState) => Promise<DailyLoopState>;
  getState: () => DailyLoopState;
};

export function createHydratedDailyLoopQueue(
  initial: DailyLoopState,
  onState: (state: DailyLoopState) => void,
  persist: (state: DailyLoopState) => Promise<void>,
): HydratedDailyLoopQueue {
  let current = initial;
  let resolveReady: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => { resolveReady = resolve; });
  let hydration: Promise<void> | null = null;
  let mutations: Promise<unknown> = Promise.resolve();

  return {
    ready,
    hydrate(loaded) {
      if (hydration) return hydration;
      hydration = (async () => {
        current = loaded;
        onState(current);
        try {
          await persist(current);
        } finally {
          resolveReady();
        }
      })();
      return hydration;
    },
    mutate(recipe) {
      const operation = mutations.catch(() => undefined).then(async () => {
        await ready;
        const next = recipe(current);
        await persist(next);
        current = next;
        onState(current);
        return current;
      });
      mutations = operation;
      return operation;
    },
    getState: () => current,
  };
}

let writeQueue: Promise<void> = Promise.resolve();
export async function loadDailyLoopState(now = new Date()): Promise<DailyLoopState> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_LOOP_STORAGE_KEY);
    if (!raw) return createInitialDailyLoopState(now);
    const decoded = decodeDailyLoopState(JSON.parse(raw));
    return reconcileDailyLoop(decoded ?? createInitialDailyLoopState(now), now);
  } catch {
    return createInitialDailyLoopState(now);
  }
}

export function saveDailyLoopState(state: DailyLoopState): Promise<void> {
  writeQueue = writeQueue.catch(() => undefined).then(() =>
    AsyncStorage.setItem(DAILY_LOOP_STORAGE_KEY, JSON.stringify(state)));
  return writeQueue;
}
