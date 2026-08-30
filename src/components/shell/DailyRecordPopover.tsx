import { StyleSheet } from 'react-native';

import { DailyRecordContent } from '@/components/daily/DailyRecordContent';
import { MobbyAssetButton } from '@/components/mobby-ui';
import { ShellDetailPopover } from '@/components/shell/ShellDetailPopover';
import type { MissionState } from '@/game/dailyLoopStorage';
import { Text } from '@/ui/layout/visualPrimitives';

export function DailyRecordPopover({
  stampCount,
  missions,
  isHydrated,
  onBack,
  onClose,
  onOpenMobbyTime,
}: {
  stampCount: number;
  missions: MissionState;
  isHydrated: boolean;
  onBack: () => void;
  onClose: () => void;
  onOpenMobbyTime: () => void;
}) {
  return <ShellDetailPopover
    accessibilityLabel="きょうの記録"
    contentContainerStyle={styles.content}
    footer={<MobbyAssetButton
      accessibilityLabel="MOBBY TIMEを見る"
      contentStyle={styles.actionContent}
      disabled={!isHydrated}
      onPress={onOpenMobbyTime}
      style={styles.action}
    >
      <Text style={styles.actionText}>MOBBY TIMEを見る</Text>
    </MobbyAssetButton>}
    onBack={onBack}
    onClose={onClose}
    title="きょうの記録"
  >
    <DailyRecordContent stampCount={stampCount} missions={missions} isHydrated={isHydrated} presentation="popover" />
  </ShellDetailPopover>;
}

const styles = StyleSheet.create({
  content: { gap: 24 },
  action: { minHeight: 48 },
  actionContent: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  actionText: { color: '#FFFFFF', fontSize: 16, lineHeight: 22, fontWeight: '900' },
});
