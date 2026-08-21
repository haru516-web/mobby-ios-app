import type { ComponentProps } from 'react';
import { useDailyLoop } from '@/game/DailyLoopContext';
import { CollectionVisual as CollectionScreenImplementation } from '@/components/collection/CollectionVisual';

type CollectionScreenProps = Omit<ComponentProps<typeof CollectionScreenImplementation>, 'reactionCount' | 'claimedReactionMilestones' | 'dailyHydrated' | 'onClaimReactionMilestone'>;

export function CollectionScreen(props: CollectionScreenProps) {
  const daily = useDailyLoop();
  return <CollectionScreenImplementation {...props} reactionCount={daily.state.reactionCount} claimedReactionMilestones={daily.state.claimedReactionMilestones} dailyHydrated={daily.isHydrated} onClaimReactionMilestone={daily.claimReactionMilestone} />;
}
