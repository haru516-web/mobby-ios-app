import { isCollectibleVariant, isItemId, resolveCollectibleName, type CollectibleVariant, type ItemId } from './collectibles';

export type DailyRewardKind = 'memory' | 'mobby-time' | 'mission-bonus' | 'reaction-milestone';
export type DailyReward = { id: string; kind: DailyRewardKind; amount: number; label: string; rewardTitle?: string; itemId: ItemId; variant: CollectibleVariant };
type RewardInput = Omit<DailyReward, 'label'>;
const reward = (input: RewardInput): DailyReward => ({ ...input, label: resolveCollectibleName(input.itemId, input.variant) ?? input.id });

export const STAMP_REWARDS = [
  reward({ id: 'stamp-1', kind: 'memory', amount: 1, itemId: 'mobichi-key', variant: 'key-small' }),
  reward({ id: 'stamp-2', kind: 'memory', amount: 1, itemId: 'mobiyan-plush', variant: 'plush' }),
  reward({ id: 'stamp-3', kind: 'memory', amount: 1, itemId: 'yami-key', variant: 'key-small' }),
  reward({ id: 'stamp-4', kind: 'memory', amount: 1, itemId: 'mobibou-plush', variant: 'plush' }),
  reward({ id: 'stamp-5', kind: 'memory', amount: 1, itemId: 'mobirin-key', variant: 'key-small' }),
  reward({ id: 'stamp-6', kind: 'memory', amount: 1, itemId: 'mobiyura-plush', variant: 'plush' }),
  reward({ id: 'stamp-7', kind: 'memory', amount: 1, itemId: 'reo-key', variant: 'key-normal' }),
] as const;
export const MISSION_BONUS = reward({ id: 'daily-missions', kind: 'mission-bonus', amount: 1, itemId: 'pote-plush', variant: 'key-small' });
export const REACTION_MILESTONES = [25, 50, 75, 100] as const;
export type ReactionMilestone = (typeof REACTION_MILESTONES)[number];
const REACTION_REWARDS: Record<ReactionMilestone, DailyReward> = {
  25: reward({ id: 'reaction-25', kind: 'reaction-milestone', amount: 1, itemId: 'babu-key', variant: 'key-small', rewardTitle: 'ちょっかい 25 回記念グッズ' }),
  50: reward({ id: 'reaction-50', kind: 'reaction-milestone', amount: 1, itemId: 'mobiyan-plush', variant: 'key-normal', rewardTitle: 'ちょっかい 50 回記念グッズ' }),
  75: reward({ id: 'reaction-75', kind: 'reaction-milestone', amount: 1, itemId: 'yami-key', variant: 'plush', rewardTitle: 'ちょっかい 75 回記念グッズ' }),
  100: reward({ id: 'reaction-100', kind: 'reaction-milestone', amount: 1, itemId: 'mobirin-key', variant: 'key-normal', rewardTitle: 'ちょっかい 100 回記念グッズ' }),
};
export const reactionMilestoneReward = (milestone: ReactionMilestone) => REACTION_REWARDS[milestone];
export const ALL_DAILY_REWARDS = [...STAMP_REWARDS, MISSION_BONUS, ...REACTION_MILESTONES.map(reactionMilestoneReward)] as const;

export function validateRewardCatalog(): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const entry of ALL_DAILY_REWARDS) {
    if (ids.has(entry.id)) issues.push(`duplicate reward id: ${entry.id}`);
    ids.add(entry.id);
    if (!isItemId(entry.itemId)) issues.push(`unknown item: ${entry.id}/${entry.itemId}`);
    if (!isCollectibleVariant(entry.variant)) issues.push(`invalid variant: ${entry.id}/${entry.variant}`);
    const canonicalLabel = resolveCollectibleName(entry.itemId, entry.variant);
    if (canonicalLabel === null) issues.push(`unresolved selection: ${entry.id}/${entry.itemId}::${entry.variant}`);
    else if (entry.label !== canonicalLabel) issues.push(`non-canonical label: ${entry.id} expected "${canonicalLabel}" got "${entry.label}"`);
    if (!Number.isSafeInteger(entry.amount) || entry.amount <= 0) issues.push(`invalid amount: ${entry.id}`);
    if (!entry.label.trim()) issues.push(`empty label: ${entry.id}`);
  }
  if (ALL_DAILY_REWARDS.length !== 12) issues.push(`expected 12 rewards, got ${ALL_DAILY_REWARDS.length}`);
  return issues;
}

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  const issues = validateRewardCatalog();
  if (issues.length) throw new Error(`Invalid daily reward catalog: ${issues.join('; ')}`);
}
