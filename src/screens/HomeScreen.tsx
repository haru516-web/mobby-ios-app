import type { ComponentProps } from 'react';
import { useDailyLoop } from '@/game/DailyLoopContext';
import { HomeScreenVisual as HomeScreenImplementation } from '@/components/home/HomeScreenVisual';

type HomeScreenProps = Omit<ComponentProps<typeof HomeScreenImplementation>, 'dailyHydrated' | 'onDailyPullRelease' | 'onDailyReaction'>;

export function HomeScreen(props: HomeScreenProps) {
  const daily = useDailyLoop();
  return (
    <HomeScreenImplementation
      {...props}
      dailyHydrated={daily.isHydrated}
      onDailyPullRelease={daily.recordPullRelease}
      onDailyReaction={(_reactionId) => { void daily.recordReaction(); }}
    />
  );
}
