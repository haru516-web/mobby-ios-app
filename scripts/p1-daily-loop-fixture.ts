import { STAMP_REWARDS } from '../src/data/dailyRewards';
import {
  createHydratedDailyLoopQueue,
  createInitialDailyLoopState,
  decodeDailyLoopState,
  receiptBackedInventoryGrant,
  type DailyLoopState,
} from '../src/game/dailyLoopStorage';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export async function runP1DailyLoopFixture() {
  const now = new Date('2026-08-15T12:00:00+09:00');
  const timestamp = now.getTime();
  const legacy = {
    version: 1,
    logicalDate: '2026-08-15',
    lastSeenAt: timestamp,
    lastLoginDate: '2026-08-15',
    stampCycle: 2,
    stampCount: 0,
    rewardedStampKeys: ['1:7'],
    missionDate: '2026-08-15',
    missions: { pullReleases: 0, mobbyTimeOpened: false, bonusQueued: false },
    mobbyTime: null,
    pendingRewards: [{
      id: 'stamp-7', kind: 'mobby-time', amount: 1, label: 'MOBBY TIME',
      eventId: 'stamp:1:7', sourceDate: '2026-08-15', cycle: 1,
    }],
    reactionCount: 0,
    claimedReactionMilestones: [],
  };
  const migrated = decodeDailyLoopState(legacy);
  assert(migrated, 'legacy day-7 snapshot must decode');
  assert(migrated.pendingRewards.length === 1, 'legacy reward must remain claimable');
  assert(migrated.pendingRewards[0].kind === STAMP_REWARDS[6].kind, 'legacy reward must use the current day-7 contract');
  assert(migrated.pendingRewards[0].itemId === STAMP_REWARDS[6].itemId, 'legacy day 7 must become the guaranteed keychain');
  assert(migrated.mobbyTime?.state === 'available', 'legacy MOBBY TIME must become an entitlement');
  assert(migrated.mobbyTimeReward === null, 'snapshots without the new payload must sanitize to null');

  const validStampReward = {
    ...STAMP_REWARDS[1], eventId: 'stamp:1:2', sourceDate: '2026-08-15', cycle: 1,
  };
  const validReactionReward = {
    id: 'reaction-25', kind: 'reaction-milestone', amount: 1,
    label: 'ちょっかい 25 回記念グッズ', itemId: 'babu-key', variant: 'key-small',
    eventId: 'reaction:25', sourceDate: '2026-08-15', cycle: null,
  };
  const salvageSnapshot = {
    ...createInitialDailyLoopState(now),
    lastLoginDate: '2026-08-15',
    stampCycle: 1,
    stampCount: 2,
    rewardedStampKeys: ['1:1', '1:2'],
    reactionCount: 31,
    claimedReactionMilestones: [25],
    mobbyTime: {
      id: 'daily:2026-08-15', grantedOn: '2026-08-15', state: 'available',
      openedAt: null, expiresAt: timestamp + 1_800_000, carriedFrom: null,
    },
    pendingRewards: [
      validStampReward,
      { eventId: 'unrelated:broken', kind: 'memory' },
      validReactionReward,
      { ...validStampReward },
    ],
  };
  const salvaged = decodeDailyLoopState(salvageSnapshot);
  assert(salvaged, 'one malformed pending reward must not reset a valid snapshot');
  assert(salvaged.stampCount === 2 && salvaged.rewardedStampKeys.length === 2, 'stamp progress must survive queue salvage');
  assert(salvaged.reactionCount === 31 && salvaged.claimedReactionMilestones[0] === 25, 'reaction progress must survive queue salvage');
  assert(salvaged.mobbyTime?.id === 'daily:2026-08-15', 'same-day entitlement must survive queue salvage');
  assert(salvaged.mobbyTime?.state === 'available' && salvaged.mobbyTime.openedAt === null && salvaged.mobbyTime.expiresAt === timestamp + 1_800_000, 'queue salvage must preserve the exact available entitlement status and deadline');
  assert(salvaged.lastLoginDate === '2026-08-15', 'same-day login marker must survive and prevent entitlement reissue');
  assert(salvaged.pendingRewards.length === 2, 'valid rewards must survive and duplicate event IDs must dedupe');
  assert(salvaged.pendingRewards[0].eventId === 'stamp:1:2' && salvaged.pendingRewards[1].eventId === 'reaction:25', 'dedupe must retain valid rewards in first-seen order');

  const openedWithMalformedCriticalEvent = decodeDailyLoopState({
    ...salvageSnapshot,
    missions: { pullReleases: 0, mobbyTimeOpened: true, bonusQueued: false },
    mobbyTime: {
      id: 'daily:2026-08-15', grantedOn: '2026-08-15', state: 'opened',
      openedAt: timestamp, expiresAt: null, carriedFrom: null,
    },
    mobbyTimeReward: {
      eventId: '', entitlementId: 'daily:2026-08-15', itemId: 'reo-key',
      variant: 'key-normal', amount: 1, selectedAt: timestamp,
      phase: 'torn-write', inventoryGranted: false,
    },
  });
  assert(openedWithMalformedCriticalEvent?.mobbyTimeReward?.eventId === 'mobby-time-reward:daily:2026-08-15', 'malformed Mobby event identity must reconstruct from its entitlement');
  assert(openedWithMalformedCriticalEvent.mobbyTimeReward.phase === 'opening', 'malformed ungranted phase must requeue at a safe opening phase');
  assert(openedWithMalformedCriticalEvent.mobbyTimeReward.itemId === 'reo-key', 'recovery must retain the earned selected reward');

  const available: DailyLoopState = {
    ...createInitialDailyLoopState(now),
    lastLoginDate: '2026-08-15',
    mobbyTime: {
      id: 'daily:2026-08-15', grantedOn: '2026-08-15', state: 'available',
      openedAt: null, expiresAt: timestamp + 1_800_000, carriedFrom: null,
    },
  };
  let failNextWrite = false;
  let observed = available;
  const queue = createHydratedDailyLoopQueue(
    available,
    (state) => { observed = state; },
    async () => { if (failNextWrite) { failNextWrite = false; throw new Error('fixture write failure'); } },
  );
  await queue.hydrate(available);
  const openRecipe = (state: DailyLoopState): DailyLoopState => ({
    ...state,
    mobbyTime: { ...state.mobbyTime!, state: 'opened', openedAt: timestamp, expiresAt: null },
    mobbyTimeReward: {
      eventId: 'mobby-time-reward:daily:2026-08-15', entitlementId: 'daily:2026-08-15',
      itemId: 'reo-key', variant: 'key-normal', amount: 1, selectedAt: timestamp,
      phase: 'opening', inventoryGranted: false,
    },
  });
  failNextWrite = true;
  await queue.mutate(openRecipe).then(
    () => { throw new Error('failed open must reject'); },
    () => undefined,
  );
  assert(queue.getState().mobbyTime?.state === 'available', 'failed open must not publish opened state');
  assert(observed.mobbyTimeReward === null, 'failed open must not publish a reward payload');
  await queue.mutate(openRecipe);
  assert(queue.getState().mobbyTimeReward?.itemId === 'reo-key', 'retry must persist the same selected reward');

  const receipt = '@daily-reward:mobby-time-reward:daily:2026-08-15';
  const inventory = 'reo-key::key-normal';
  const firstGrant = receiptBackedInventoryGrant({}, receipt, inventory, 1);
  const repeatedGrant = receiptBackedInventoryGrant(firstGrant, receipt, inventory, 1);
  assert(firstGrant[inventory] === 1 && repeatedGrant[inventory] === 1, 'receipt retry must grant exactly once');
  assert(repeatedGrant === firstGrant, 'receipt retry must be a no-op');
}

void runP1DailyLoopFixture().then(() => console.log('P1 daily-loop fixtures passed'));
