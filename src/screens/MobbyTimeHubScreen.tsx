import { useEffect, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MobbyAssetSurface } from '@/components/mobby-ui';
import { MobbyTimeScreen } from '@/screens/MobbyTimeScreen';
import { TradeScreen } from '@/screens/TradeScreen';
import { Text } from '@/ui/layout/visualPrimitives';

type HubTab = 'time' | 'exchange';

export type MobbyTimeHubScreenProps = {
  entryNonce?: number;
  mobbyTimeProps: Omit<ComponentProps<typeof MobbyTimeScreen>, 'entryNonce'>;
  tradeProps: ComponentProps<typeof TradeScreen>;
};

/** Keeps exchange inside MOBBY TIME and always returns to its main tab on re-entry. */
export function MobbyTimeHubScreen({
  entryNonce = 0,
  mobbyTimeProps,
  tradeProps,
}: MobbyTimeHubScreenProps) {
  const [tab, setTab] = useState<HubTab>('time');

  useEffect(() => setTab('time'), [entryNonce]);

  return (
    <View style={styles.root} testID="mobby-time-hub">
      <MobbyAssetSurface
        accessible={false}
        pointerEvents="box-none"
        variant="labelPill"
        style={styles.tabSurface}
        contentStyle={styles.tabSurfaceContent}
      >
        <View accessibilityLabel="MOBBY TIMEの機能" accessibilityRole="tablist" style={styles.tabs}>
          <Pressable
            accessibilityLabel="MOBBY TIME"
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'time' }}
            onPress={() => setTab('time')}
            style={({ pressed }) => [styles.tab, tab === 'time' && styles.tabActive, pressed && styles.tabPressed]}
          >
            <Text style={[styles.tabText, tab === 'time' && styles.tabTextActive]}>MOBBY TIME</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="交換"
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'exchange' }}
            onPress={() => setTab('exchange')}
            style={({ pressed }) => [styles.tab, tab === 'exchange' && styles.tabActive, pressed && styles.tabPressed]}
          >
            <Text style={[styles.tabText, tab === 'exchange' && styles.tabTextActive]}>交換</Text>
          </Pressable>
        </View>
      </MobbyAssetSurface>
      <View style={styles.scene}>
        {tab === 'time'
          ? <MobbyTimeScreen {...mobbyTimeProps} entryNonce={entryNonce} />
          : <TradeScreen {...tradeProps} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, position: 'relative' },
  scene: { flex: 1, minHeight: 0 },
  tabSurface: {
    position: 'absolute',
    top: 6,
    alignSelf: 'center',
    width: 238,
    height: 42,
    zIndex: 20,
    overflow: 'hidden',
  },
  tabSurfaceContent: { minHeight: 42, paddingHorizontal: 5, paddingVertical: 4 },
  tabs: { flex: 1, flexDirection: 'row', alignItems: 'stretch', gap: 4 },
  tab: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    outlineStyle: 'solid',
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  tabActive: { backgroundColor: '#8C667F' },
  tabPressed: { opacity: 0.68 },
  tabText: { color: '#876C79', fontSize: 10, lineHeight: 13, fontWeight: '900' },
  tabTextActive: { color: '#FFF8EA' },
});
