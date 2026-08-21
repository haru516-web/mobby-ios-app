import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/ui/layout/visualPrimitives';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDailyLoop } from '@/game/DailyLoopContext';
import { useMobbyAppShell } from '@/state/MobbyAppShell';
import { MobbyAssetButton } from '@/components/mobby-ui';

export default function MobbyTimeOpenRoute() {
  const { mobbyTimeOpenScene, mobbyTimeResultReady } = useMobbyAppShell();
  const { state, completeMobbyTimeReward } = useDailyLoop();
  const reward = state.mobbyTimeReward;
  const resultReady = mobbyTimeResultReady && reward?.phase === 'placed';
  const go = async (destination: '/' | '/collection') => {
    if (!reward || !resultReady || !await completeMobbyTimeReward(reward.eventId)) return;
    router.dismiss();
    requestAnimationFrame(() => router.navigate(destination));
  };
  return (
    <View accessibilityViewIsModal style={modalStyles.root}>
      {mobbyTimeOpenScene}
      <SafeAreaView pointerEvents="box-none" style={modalStyles.overlay}>
        <MobbyAssetButton accessibilityLabel="開封を中断して閉じる" tone="cream" onPress={() => router.back()} style={modalStyles.close} contentStyle={modalStyles.closeContent}>
          <Text style={modalStyles.closeText}>閉じる</Text>
        </MobbyAssetButton>
        {resultReady ? (
          <View style={modalStyles.results}>
            <MobbyAssetButton accessibilityLabel="ホームで見る" onPress={() => void go('/')} style={modalStyles.resultButton}><Text style={modalStyles.resultText}>ホームで見る</Text></MobbyAssetButton>
            <MobbyAssetButton accessibilityLabel="コレクションで見る" tone="cream" onPress={() => void go('/collection')} style={modalStyles.resultButton}><Text style={modalStyles.resultTextCream}>コレクションで見る</Text></MobbyAssetButton>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const modalStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7eddf' },
  overlay: { ...StyleSheet.absoluteFillObject, paddingHorizontal: 12, justifyContent: 'space-between', alignItems: 'flex-end' },
  close: { minWidth: 72, minHeight: 44, marginTop: 8, overflow: 'hidden' },
  closeContent: { minWidth: 72, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  closeText: { color: '#72483b', fontSize: 16, fontWeight: '800' },
  results: { width: '100%', flexDirection: 'row', gap: 12, paddingBottom: 12 },
  resultButton: { flex: 1, minHeight: 52 },
  resultText: { color: '#fff', fontSize: 15, lineHeight: 20, fontWeight: '900', textAlign: 'center' },
  resultTextCream: { color: '#72483b', fontSize: 15, lineHeight: 20, fontWeight: '900', textAlign: 'center' },
});
