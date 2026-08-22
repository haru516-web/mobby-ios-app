import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { MobbyAssetButton } from '@/components/mobby-ui';
import { ShellDetailPopover } from '@/components/shell/ShellDetailPopover';
import { Text } from '@/ui/layout/visualPrimitives';

export function MobbyTimePopover({
  children,
  resultReady,
  onBack,
  onClose,
  onOpenHome,
  onOpenCollection,
}: {
  children: ReactNode;
  resultReady: boolean;
  onBack: () => void;
  onClose: () => void;
  onOpenHome: () => void;
  onOpenCollection: () => void;
}) {
  return <ShellDetailPopover
    accessibilityLabel="MOBBY TIME"
    eyebrow="MOBBY TIME"
    flush
    footer={resultReady ? <View style={styles.results}>
      <MobbyAssetButton accessibilityLabel="ホームで見る" onPress={onOpenHome} style={styles.resultButton}>
        <Text style={styles.resultText}>ホームで見る</Text>
      </MobbyAssetButton>
      <MobbyAssetButton accessibilityLabel="コレクションで見る" onPress={onOpenCollection} style={styles.resultButton} tone="cream">
        <Text style={styles.resultTextCream}>コレクションで見る</Text>
      </MobbyAssetButton>
    </View> : undefined}
    onBack={onBack}
    onClose={onClose}
    subtitle="今日のBOXを確認しよう"
    title="MOBBY TIME"
  >
    {children}
  </ShellDetailPopover>;
}

const styles = StyleSheet.create({
  results: { flexDirection: 'row', gap: 10 },
  resultButton: { flex: 1, minHeight: 48 },
  resultText: { color: '#FFFFFF', fontSize: 13, lineHeight: 18, fontWeight: '900', textAlign: 'center' },
  resultTextCream: { color: '#72483B', fontSize: 13, lineHeight: 18, fontWeight: '900', textAlign: 'center' },
});
