import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDailyLoop } from '@/game/DailyLoopContext';
import { PullableMobby } from '@/components/mobby/PullableMobby';
import { MobbyAssetSurface } from '@/components/mobby-ui';
import type { Item } from '@/data/collectibles';
import { styles } from '@/ui/layout/appStyles';
import { Text } from '@/ui/layout/visualPrimitives';

type TouchScreenProps = Omit<ComponentProps<typeof TouchScreenVisual>, 'dailyHydrated' | 'onDailyPullRelease' | 'onDailyReaction'>;

export function TouchScreen(props: TouchScreenProps) {
  const daily = useDailyLoop();
  return <TouchScreenVisual {...props} dailyHydrated={daily.isHydrated} onDailyPullRelease={daily.recordPullRelease} onDailyReaction={(_reactionId) => { void daily.recordReaction(); }} />;
}

function TouchScreenVisual({ selected, onInteract, reaction, dailyHydrated = true, onDailyPullRelease, onDailyReaction }: { selected: Item; onInteract: (kind: string) => number; reaction: string; dailyHydrated?: boolean; onDailyPullRelease?: () => Promise<void>; onDailyReaction?: (reactionId: string) => void }) {
  return (
    <View style={styles.touchScreenBackground}>
      <View style={styles.touchScrollContent}>
      <View style={styles.touchTop}><View style={styles.touchTitleRow}><Text style={styles.bigTitle}>{selected.name}</Text><MobbyAssetSurface variant="labelPill" accessibilityLabel={`レアリティ ${selected.rarity}`} accessible style={assetStyles.rarityBadge} contentStyle={assetStyles.rarityBadgeContent}><Text style={assetStyles.rarityBadgeText}>{selected.rarity}</Text></MobbyAssetSurface></View></View>
      <View style={styles.touchStage}><PullableMobby selected={selected} onPull={() => onInteract('ほっぺ')} enabled={dailyHydrated} onValidRelease={onDailyPullRelease} onReaction={onDailyReaction} />{reaction ? <MobbyAssetSurface variant="dialogue" accessibilityLiveRegion="polite" style={assetStyles.touchBubble} contentStyle={assetStyles.touchBubbleContent}><Text style={styles.touchBubbleText}>{reaction}</Text></MobbyAssetSurface> : null}<Text style={styles.touchHand}>☝</Text><View style={styles.touchHearts}><Text style={styles.touchHeart}>♥</Text><Text style={styles.touchHeart}>♥</Text><Text style={styles.touchHeart}>♥</Text></View></View>
      </View>
    </View>
  );
}

const assetStyles = StyleSheet.create({
  rarityBadge: { minWidth: 54, minHeight: 34, marginLeft: 6 },
  rarityBadgeContent: { minHeight: 34, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center', justifyContent: 'center' },
  rarityBadgeText: { color: '#5E4057', fontSize: 12, fontWeight: '900', textAlign: 'center' },
  touchBubble: { position: 'absolute', top: 15, left: 14, width: 180, minHeight: 62, transform: [{ rotate: '-3deg' }] },
  touchBubbleContent: { minHeight: 62, paddingHorizontal: 12, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
});
