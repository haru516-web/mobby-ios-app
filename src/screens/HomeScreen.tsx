import type { ComponentProps } from 'react';
import { useDailyLoop } from '@/game/DailyLoopContext';
import { WelcomeBackOverlay } from '@/components/daily/WelcomeBackOverlay';
import { HomeScreen as HomeScreenImplementation } from './screenImplementations';

type HomeScreenProps = Omit<ComponentProps<typeof HomeScreenImplementation>, 'dailyState' | 'dailyHydrated' | 'onDailyPullRelease' | 'onDailyReaction'>;

export function HomeScreen(props: HomeScreenProps) {
  const daily = useDailyLoop();
  return <>
    <HomeScreenImplementation
      {...props}
      dailyState={daily.state}
      dailyHydrated={daily.isHydrated}
      onDailyPullRelease={daily.recordPullRelease}
      onDailyReaction={(_reactionId) => { void daily.recordReaction(); }}
    />
    <WelcomeBackOverlay logicalDate={daily.state.logicalDate} mobbyName={props.selected.name} image={props.selected.image} enabled={daily.isHydrated} />
  </>;
}
