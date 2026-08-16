import type { ComponentProps } from 'react';
import { useDailyLoop } from '@/game/DailyLoopContext';
import { TouchScreen as TouchScreenImplementation } from './screenImplementations';

type TouchScreenProps = Omit<ComponentProps<typeof TouchScreenImplementation>, 'dailyHydrated' | 'onDailyPullRelease' | 'onDailyReaction'>;

export function TouchScreen(props: TouchScreenProps) {
  const daily = useDailyLoop();
  return <TouchScreenImplementation {...props} dailyHydrated={daily.isHydrated} onDailyPullRelease={daily.recordPullRelease} onDailyReaction={(_reactionId) => { void daily.recordReaction(); }} />;
}
