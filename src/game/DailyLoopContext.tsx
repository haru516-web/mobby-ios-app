import { AppState, type AppStateStatus } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { MISSION_BONUS, STAMP_REWARDS, reactionMilestoneReward, type ReactionMilestone } from '@/data/dailyRewards';
import { isCollectibleSelection, type CollectibleSelection } from '@/data/collectibles';
import { claimableReactionMilestones, PULL_RELEASE_MISSION_TARGET } from '@/data/reactions';
import {
  MOBBY_TIME_DURATION_MS,
  createHydratedDailyLoopQueue,
  createInitialDailyLoopState,
  loadDailyLoopState,
  reconcileDailyLoop,
  saveDailyLoopState,
  type DailyLoopState,
  type HydratedDailyLoopQueue,
  type MobbyTimeEntitlement,
  type MobbyTimeRewardPhase,
  type PendingReward,
} from './dailyLoopStorage';

export type MobbyTimeRewardSelection = CollectibleSelection;

type DailyLoopValue = {
  state: DailyLoopState;
  isHydrated: boolean;
  recordPullRelease: () => Promise<void>;
  openMobbyTime: (selection: MobbyTimeRewardSelection) => Promise<boolean>;
  setMobbyTimeRewardPhase: (eventId: string, expectedPhase: MobbyTimeRewardPhase, phase: MobbyTimeRewardPhase) => Promise<MobbyTimePhaseTransition>;
  consumeMobbyTimeReward: (eventId: string) => Promise<boolean>;
  completeMobbyTimeReward: (eventId: string) => Promise<boolean>;
  completeReceiptedMobbyTime: (entitlementId: string) => Promise<boolean>;
  grantMobbyTime: () => Promise<boolean>;
  recordReaction: (amount?: number) => Promise<boolean>;
  claimReactionMilestone: (milestone: ReactionMilestone) => Promise<PendingReward | null>;
  consumePendingReward: (eventId: string) => Promise<PendingReward | null>;
  consumePendingCycleReward: () => Promise<PendingReward | null>;
  reconcile: () => Promise<void>;
};

export type PendingMobbyTimeResult = { state: DailyLoopState; reward: PendingReward | null };
export type ReactionCountResult = { state: DailyLoopState; accepted: boolean };
export type MobbyTimePhaseTransition = { committed: boolean; alreadyAtOrBeyond: boolean };
export type MobbyTimePhaseResult = MobbyTimePhaseTransition & { state: DailyLoopState };

const DailyLoopContext = createContext<DailyLoopValue | null>(null);
const MOBBY_TIME_PHASES: readonly MobbyTimeRewardPhase[] = ['opening', 'revealed', 'placing', 'placed'];

export function advanceMobbyTimeRewardPhase(
  state: DailyLoopState,
  eventId: string,
  expectedPhase: MobbyTimeRewardPhase,
  nextPhase: MobbyTimeRewardPhase,
): MobbyTimePhaseResult {
  const reward = state.mobbyTimeReward;
  const expectedIndex = MOBBY_TIME_PHASES.indexOf(expectedPhase);
  const nextIndex = MOBBY_TIME_PHASES.indexOf(nextPhase);
  if (!reward || reward.eventId !== eventId || nextIndex !== expectedIndex + 1) {
    return { state, committed: false, alreadyAtOrBeyond: false };
  }
  const currentIndex = MOBBY_TIME_PHASES.indexOf(reward.phase);
  if (currentIndex >= nextIndex) return { state, committed: false, alreadyAtOrBeyond: true };
  if (reward.phase !== expectedPhase) return { state, committed: false, alreadyAtOrBeyond: false };
  return {
    state: { ...state, mobbyTimeReward: { ...reward, phase: nextPhase } },
    committed: true,
    alreadyAtOrBeyond: false,
  };
}

function queueReward(state: DailyLoopState, reward: PendingReward): DailyLoopState {
  return state.pendingRewards.some((item) => item.eventId === reward.eventId)
    ? state
    : { ...state, pendingRewards: [...state.pendingRewards, reward] };
}

function applyMissionBonus(state: DailyLoopState): DailyLoopState {
  if (state.missions.bonusQueued || state.missions.pullReleases < PULL_RELEASE_MISSION_TARGET || !state.missions.mobbyTimeOpened) return state;
  const next = { ...state, missions: { ...state.missions, bonusQueued: true } };
  return queueReward(next, {
    ...MISSION_BONUS,
    eventId: `mission:${state.logicalDate}`,
    sourceDate: state.logicalDate,
    cycle: null,
  });
}

function hasUnopenedMobbyTime(entitlement: MobbyTimeEntitlement | null): boolean {
  return entitlement !== null && entitlement.openedAt === null &&
    (entitlement.state === 'available' || entitlement.state === 'expired');
}

function availableEntitlement(id: string, state: DailyLoopState): MobbyTimeEntitlement {
  return {
    id,
    grantedOn: state.logicalDate,
    state: 'available',
    openedAt: null,
    expiresAt: state.lastSeenAt + MOBBY_TIME_DURATION_MS,
    carriedFrom: null,
  };
}

function entitlementAlreadyRepresentsReward(
  entitlement: MobbyTimeEntitlement | null,
  reward: PendingReward,
): boolean {
  if (!entitlement) return false;
  if (entitlement.id === `entitlement:${reward.eventId}`) return true;
  const legacyCycle = /^stamp:(\d+):7$/.exec(reward.eventId)?.[1];
  return legacyCycle !== undefined && entitlement.id === `mobby-time:${legacyCycle}`;
}

export function applyDailyLogin(state: DailyLoopState, now = new Date()): DailyLoopState {
  let next = reconcileDailyLoop(state, now);
  if (next.lastLoginDate === next.logicalDate) return next;
  if (!hasUnopenedMobbyTime(next.mobbyTime) && next.mobbyTime?.grantedOn !== next.logicalDate) {
    next = { ...next, mobbyTime: availableEntitlement(`daily:${next.logicalDate}`, next) };
  }
  const stampNumber = next.stampCount + 1;
  const stampKey = `${next.stampCycle}:${stampNumber}`;
  next = { ...next, lastLoginDate: next.logicalDate };
  if (!next.rewardedStampKeys.includes(stampKey)) {
    const reward = STAMP_REWARDS[stampNumber - 1];
    next = queueReward(
      { ...next, rewardedStampKeys: [...next.rewardedStampKeys, stampKey] },
      {
        ...reward,
        eventId: `stamp:${stampKey}`,
        sourceDate: next.logicalDate,
        cycle: next.stampCycle,
      },
    );
  }
  return stampNumber === 7
    ? { ...next, stampCycle: next.stampCycle + 1, stampCount: 0 }
    : { ...next, stampCount: stampNumber };
}

export function activatePendingMobbyTimeReward(
  state: DailyLoopState,
  eventId?: string,
  now = new Date(),
): PendingMobbyTimeResult {
  const next = reconcileDailyLoop(state, now);
  const reward = next.pendingRewards.find((item) =>
    item.kind === 'mobby-time' && (eventId === undefined || item.eventId === eventId));
  if (!reward) return { state: next, reward: null };
  if (entitlementAlreadyRepresentsReward(next.mobbyTime, reward)) {
    return {
      state: { ...next, pendingRewards: next.pendingRewards.filter((item) => item.eventId !== reward.eventId) },
      reward,
    };
  }
  if (hasUnopenedMobbyTime(next.mobbyTime)) return { state: next, reward: null };
  return {
    state: {
      ...next,
      mobbyTime: availableEntitlement(`entitlement:${reward.eventId}`, next),
      pendingRewards: next.pendingRewards.filter((item) => item.eventId !== reward.eventId),
    },
    reward,
  };
}

export function applyReactionCount(
  state: DailyLoopState,
  amount: number,
  now = new Date(),
): ReactionCountResult {
  if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(state.reactionCount + amount)) {
    return { state, accepted: false };
  }
  const next = reconcileDailyLoop(state, now);
  return { state: { ...next, reactionCount: next.reactionCount + amount }, accepted: true };
}

export function DailyLoopProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => createInitialDailyLoopState());
  const [isHydrated, setIsHydrated] = useState(false);
  const mountedRef = useRef(true);
  const queueRef = useRef<HydratedDailyLoopQueue | null>(null);
  const initializationRef = useRef<Promise<void> | null>(null);

  if (!queueRef.current) {
    queueRef.current = createHydratedDailyLoopQueue(
      state,
      (next) => { if (mountedRef.current) setState(next); },
      saveDailyLoopState,
    );
  }

  const commit = useCallback((recipe: (current: DailyLoopState) => DailyLoopState) =>
    queueRef.current!.mutate(recipe).then(() => undefined), []);

  useEffect(() => {
    mountedRef.current = true;
    if (!initializationRef.current) {
      initializationRef.current = loadDailyLoopState()
        .then((loaded) => queueRef.current!.hydrate(applyDailyLogin(loaded)))
        .catch(() => undefined);
    }
    void initializationRef.current.finally(() => {
      if (mountedRef.current) setIsHydrated(true);
    });
    return () => { mountedRef.current = false; };
  }, []);

  const reconcile = useCallback(() => commit((current) => applyDailyLogin(current)), [commit]);
  useEffect(() => {
    if (!isHydrated) return undefined;
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') void reconcile();
    });
    return () => subscription.remove();
  }, [isHydrated, reconcile]);

  const recordPullRelease = useCallback(() => commit((current) => {
    const next = reconcileDailyLoop(current);
    return applyMissionBonus({
      ...next,
      missions: {
        ...next.missions,
        pullReleases: Math.min(PULL_RELEASE_MISSION_TARGET, next.missions.pullReleases + 1),
      },
    });
  }), [commit]);

  const openMobbyTime = useCallback(async (selection: MobbyTimeRewardSelection) => {
    if (!isCollectibleSelection(selection)) return false;
    let opened = false;
    await commit((current) => {
      const next = reconcileDailyLoop(current);
      if (!next.mobbyTime || next.mobbyTime.state !== 'available' || next.mobbyTimeReward) return next;
      opened = true;
      return applyMissionBonus({
        ...next,
        mobbyTime: { ...next.mobbyTime, state: 'opened', openedAt: next.lastSeenAt, expiresAt: null },
        mobbyTimeReward: {
          eventId: `mobby-time-reward:${next.mobbyTime.id}`,
          entitlementId: next.mobbyTime.id,
          itemId: selection.itemId,
          variant: selection.variant,
          amount: 1,
          selectedAt: next.lastSeenAt,
          phase: 'opening',
          inventoryGranted: false,
        },
        missions: { ...next.missions, mobbyTimeOpened: true },
      });
    });
    return opened;
  }, [commit]);

  const setMobbyTimeRewardPhase = useCallback(async (eventId: string, expectedPhase: MobbyTimeRewardPhase, phase: MobbyTimeRewardPhase) => {
    let transition: MobbyTimePhaseTransition = { committed: false, alreadyAtOrBeyond: false };
    await commit((current) => {
      const result = advanceMobbyTimeRewardPhase(current, eventId, expectedPhase, phase);
      transition = { committed: result.committed, alreadyAtOrBeyond: result.alreadyAtOrBeyond };
      return result.state;
    });
    return transition;
  }, [commit]);

  const consumeMobbyTimeReward = useCallback(async (eventId: string) => {
    let consumed = false;
    await commit((current) => {
      const reward = current.mobbyTimeReward;
      if (!reward || reward.eventId !== eventId) return current;
      consumed = true;
      return {
        ...current,
        mobbyTimeReward: { ...reward, inventoryGranted: true },
      };
    });
    return consumed;
  }, [commit]);

  const completeMobbyTimeReward = useCallback(async (eventId: string) => {
    let completed = false;
    await commit((current) => {
      const reward = current.mobbyTimeReward;
      if (!reward || reward.eventId !== eventId) return current;
      completed = true;
      return {
        ...current,
        mobbyTimeReward: reward.inventoryGranted ? null : { ...reward, phase: 'placed' },
      };
    });
    return completed;
  }, [commit]);

  const completeReceiptedMobbyTime = useCallback(async (entitlementId: string) => {
    let completed = false;
    await commit((current) => {
      const entitlement = current.mobbyTime;
      if (!entitlement || entitlement.id !== entitlementId || current.mobbyTimeReward) return current;
      completed = true;
      return {
        ...current,
        mobbyTime: { ...entitlement, state: 'opened', openedAt: entitlement.openedAt ?? current.lastSeenAt, expiresAt: null },
      };
    });
    return completed;
  }, [commit]);

  const grantMobbyTime = useCallback(async () => {
    let granted = false;
    await commit((current) => {
      const next = reconcileDailyLoop(current);
      if (hasUnopenedMobbyTime(next.mobbyTime) || next.mobbyTime?.grantedOn === next.logicalDate) return next;
      granted = true;
      return { ...next, mobbyTime: availableEntitlement(`external:${next.logicalDate}`, next) };
    });
    return granted;
  }, [commit]);

  const recordReaction = useCallback(async (amount = 1) => {
    let accepted = false;
    await commit((current) => {
      const result = applyReactionCount(current, amount);
      accepted = result.accepted;
      return result.state;
    });
    return accepted;
  }, [commit]);

  const claimReactionMilestone = useCallback(async (milestone: ReactionMilestone) => {
    let emitted: PendingReward | null = null;
    await commit((current) => {
      const next = reconcileDailyLoop(current);
      if (!claimableReactionMilestones(next.reactionCount, next.claimedReactionMilestones).includes(milestone)) return next;
      emitted = {
        ...reactionMilestoneReward(milestone),
        eventId: `reaction:${milestone}`,
        sourceDate: next.logicalDate,
        cycle: null,
      };
      return queueReward({
        ...next,
        claimedReactionMilestones: [...next.claimedReactionMilestones, milestone],
      }, emitted);
    });
    return emitted;
  }, [commit]);

  const consumePendingReward = useCallback(async (eventId: string) => {
    let consumed: PendingReward | null = null;
    await commit((current) => {
      const candidate = current.pendingRewards.find((item) => item.eventId === eventId);
      if (!candidate) return current;
      if (candidate.kind === 'mobby-time') {
        const result = activatePendingMobbyTimeReward(current, eventId);
        consumed = result.reward;
        return result.state;
      }
      consumed = candidate;
      return { ...current, pendingRewards: current.pendingRewards.filter((item) => item.eventId !== eventId) };
    });
    return consumed;
  }, [commit]);

  const consumePendingCycleReward = useCallback(async () => {
    let consumed: PendingReward | null = null;
    await commit((current) => {
      const result = activatePendingMobbyTimeReward(current);
      consumed = result.reward;
      return result.state;
    });
    return consumed;
  }, [commit]);

  const value = useMemo<DailyLoopValue>(() => ({
    state,
    isHydrated,
    recordPullRelease,
    openMobbyTime,
    setMobbyTimeRewardPhase,
    consumeMobbyTimeReward,
    completeMobbyTimeReward,
    completeReceiptedMobbyTime,
    grantMobbyTime,
    recordReaction,
    claimReactionMilestone,
    consumePendingReward,
    consumePendingCycleReward,
    reconcile,
  }), [
    claimReactionMilestone,
    completeMobbyTimeReward,
    completeReceiptedMobbyTime,
    consumePendingCycleReward,
    consumePendingReward,
    consumeMobbyTimeReward,
    grantMobbyTime,
    isHydrated,
    openMobbyTime,
    reconcile,
    recordPullRelease,
    recordReaction,
    setMobbyTimeRewardPhase,
    state,
  ]);
  return <DailyLoopContext.Provider value={value}>{children}</DailyLoopContext.Provider>;
}

export function useDailyLoop(): DailyLoopValue {
  const value = useContext(DailyLoopContext);
  if (!value) throw new Error('useDailyLoop must be used inside DailyLoopProvider');
  return value;
}
