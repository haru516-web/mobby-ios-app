import { REACTION_MILESTONES, type ReactionMilestone } from './dailyRewards';

export const PULL_RELEASE_MISSION_TARGET = 3;

export function isReactionMilestone(value: number): value is ReactionMilestone {
  return REACTION_MILESTONES.some((milestone) => milestone === value);
}

export function claimableReactionMilestones(
  reactionCount: number,
  claimed: readonly ReactionMilestone[],
): ReactionMilestone[] {
  return REACTION_MILESTONES.filter(
    (milestone) => reactionCount >= milestone && !claimed.includes(milestone),
  );
}
