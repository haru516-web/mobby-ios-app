import type { ComponentProps } from 'react';
import { useDailyLoop } from '@/game/DailyLoopContext';
import { router } from 'expo-router';
import { HomeScreenVisual as HomeScreenImplementation } from '@/components/home/HomeScreenVisual';

type HomeScreenProps = Omit<ComponentProps<typeof HomeScreenImplementation>, 'dailyState' | 'dailyHydrated' | 'onDailyPullRelease' | 'onDailyReaction' | 'todayAction'> & { hasUnresolvedEpisode: boolean };

export type TodayAction = { label: string; detail: string; disabled: boolean; kind: 'navigate' | 'cheek' | 'status'; onPress?: () => void };

export function selectTodayAction(input: { hydrated: boolean; hasEpisode: boolean; mobbyTimeState: 'available' | 'opened' | 'expired' | null; hasRewardInProgress: boolean; pullReleases: number }): Omit<TodayAction, 'onPress' | 'kind'> & { destination: 'stories' | 'mobby-time' | 'scene' | null } {
  if (!input.hydrated) return { label: '今日の一手', detail: '記録を読み込んでいます…', disabled: true, destination: null };
  if (input.hasEpisode) return { label: '今日の一手', detail: '続きのおはなしを、のぞいてみる？', disabled: false, destination: 'stories' };
  if (input.hasRewardInProgress || input.mobbyTimeState === 'available') return { label: '今日の一手', detail: input.hasRewardInProgress ? 'グッズの受け取りを続けよう' : 'きょうのMOBBY TIMEが届いているよ', disabled: false, destination: 'mobby-time' };
  if (input.mobbyTimeState === 'expired') return { label: '今日の一手', detail: '受付は終了しました。未開封分は翌日に1回だけ持ち越されます', disabled: true, destination: null };
  if (input.pullReleases < 3) return { label: '今日の一手', detail: `ほっぺをあと${3 - input.pullReleases}回、引っぱってみよう`, disabled: false, destination: 'scene' };
  return { label: '今日の一手', detail: 'きょうもいっしょにのんびりしよう', disabled: true, destination: null };
}

export function HomeScreen(props: HomeScreenProps) {
  const daily = useDailyLoop();
  const { hasUnresolvedEpisode, ...implementationProps } = props;
  const selectedAction = selectTodayAction({ hydrated: daily.isHydrated, hasEpisode: hasUnresolvedEpisode, mobbyTimeState: daily.state.mobbyTime?.state ?? null, hasRewardInProgress: Boolean(daily.state.mobbyTimeReward), pullReleases: daily.state.missions.pullReleases });
  const todayAction: TodayAction = { ...selectedAction, kind: selectedAction.destination === 'scene' ? 'cheek' : selectedAction.destination ? 'navigate' : 'status', onPress: selectedAction.destination === 'stories' ? () => router.navigate('/stories') : selectedAction.destination === 'mobby-time' ? () => router.navigate('/mobby-time') : undefined };
  return (
    <HomeScreenImplementation
      {...implementationProps}
      dailyState={daily.state}
      dailyHydrated={daily.isHydrated}
      onDailyPullRelease={daily.recordPullRelease}
      onDailyReaction={(_reactionId) => { void daily.recordReaction(); }}
      todayAction={todayAction}
    />
  );
}
