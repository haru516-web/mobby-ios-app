import { useEffect, useState, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { MobbyAssetButton, MobbyAssetCloseButton } from '@/components/mobby-ui';
import { MobbyTimeScreen } from '@/screens/MobbyTimeScreen';
import { TradeScreen } from '@/screens/TradeScreen';
import { Text } from '@/ui/layout/visualPrimitives';

const MOBBY_TIME_EXCHANGE_BUTTON = require('../../assets/mobby-time/exchange-button.png');

type HubView = 'time' | 'exchange';

export type MobbyTimeHubScreenProps = {
  entryNonce?: number;
  mobbyTimeProps: Omit<ComponentProps<typeof MobbyTimeScreen>, 'entryNonce'>;
  tradeProps: ComponentProps<typeof TradeScreen>;
};

/** Opens on MOBBY TIME, with exchange as a temporary child view. */
export function MobbyTimeHubScreen({
  entryNonce = 0,
  mobbyTimeProps,
  tradeProps,
}: MobbyTimeHubScreenProps) {
  const [view, setView] = useState<HubView>('time');

  useEffect(() => setView('time'), [entryNonce]);

  return (
    <View style={styles.root} testID="mobby-time-hub">
      {view === 'time' ? (
        <MobbyAssetButton
          accessibilityLabel="交換を開く"
          tone="cream"
          backgroundSource={MOBBY_TIME_EXCHANGE_BUTTON}
          backgroundResizeMode="cover"
          preferBackgroundSource
          onPress={() => setView('exchange')}
          style={styles.exchangeButton}
          contentStyle={styles.exchangeButtonContent}
        >
          <Text style={styles.exchangeButtonText}>交換</Text>
        </MobbyAssetButton>
      ) : (
        <MobbyAssetCloseButton
          accessibilityLabel="MOBBY TIMEに戻る"
          onPress={() => setView('time')}
          style={styles.closeButton}
        />
      )}
      <View style={styles.scene}>
        {view === 'time'
          ? <MobbyTimeScreen {...mobbyTimeProps} entryNonce={entryNonce} />
          : <TradeScreen {...tradeProps} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, position: 'relative' },
  scene: { flex: 1, minHeight: 0 },
  exchangeButton: {
    position: 'absolute',
    top: 6,
    right: 12,
    width: 86,
    height: 40,
    minHeight: 40,
    borderRadius: 16,
    zIndex: 20,
    overflow: 'hidden',
  },
  exchangeButtonContent: { minHeight: 40, paddingHorizontal: 9, paddingVertical: 6 },
  exchangeButtonText: { color: '#68465F', fontSize: 13, lineHeight: 17, fontWeight: '900' },
  closeButton: { position: 'absolute', top: 6, right: 12, zIndex: 20 },
});
