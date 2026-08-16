export type DailyRewardKind = 'memory' | 'mobby-time' | 'mission-bonus' | 'reaction-milestone';

export type DailyReward = {
  id: string;
  kind: DailyRewardKind;
  amount: number;
  label: string;
  itemId?: string;
  variant?: 'key-normal' | 'key-small' | 'plush';
};

export const STAMP_REWARDS: readonly DailyReward[] = [
  { id: 'stamp-1', kind: 'memory', amount: 1, label: 'もびち ぬいキー（S）', itemId: 'mobichi-key', variant: 'key-small' },
  { id: 'stamp-2', kind: 'memory', amount: 1, label: 'もびやん ぬいぐるみ', itemId: 'mobiyan-plush', variant: 'plush' },
  { id: 'stamp-3', kind: 'memory', amount: 1, label: '病みモビー ぬいキー（S）', itemId: 'yami-key', variant: 'key-small' },
  { id: 'stamp-4', kind: 'memory', amount: 1, label: 'もびぼう ぬいぐるみ', itemId: 'mobibou-plush', variant: 'plush' },
  { id: 'stamp-5', kind: 'memory', amount: 1, label: 'もびりん ぬいキー（S）', itemId: 'mobirin-key', variant: 'key-small' },
  { id: 'stamp-6', kind: 'memory', amount: 1, label: 'もびゆら ぬいぐるみ', itemId: 'mobiyura-plush', variant: 'plush' },
  { id: 'stamp-7', kind: 'memory', amount: 1, label: 'れおモビー ぬいキー', itemId: 'reo-key', variant: 'key-normal' },
] as const;

export const MISSION_BONUS: DailyReward = {
  id: 'daily-missions',
  kind: 'mission-bonus',
  amount: 1,
  label: 'ぽてもび ぬいキー（S）',
  itemId: 'pote-plush',
  variant: 'key-small',
};

export const REACTION_MILESTONES = [25, 50, 75, 100] as const;
export type ReactionMilestone = (typeof REACTION_MILESTONES)[number];

export function reactionMilestoneReward(milestone: ReactionMilestone): DailyReward {
  return {
    id: `reaction-${milestone}`,
    kind: 'reaction-milestone',
    amount: 1,
    label: `ちょっかい ${milestone} 回記念グッズ`,
    itemId: milestone === 25 ? 'babu-key' : milestone === 50 ? 'mobiyan-plush' : milestone === 75 ? 'yami-key' : 'mobirin-key',
    variant: milestone === 25 ? 'key-small' : milestone === 50 ? 'key-normal' : milestone === 75 ? 'plush' : 'key-normal',
  };
}
