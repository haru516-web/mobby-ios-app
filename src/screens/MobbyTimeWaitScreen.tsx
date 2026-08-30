import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/ui/layout/visualPrimitives';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDailyLoop } from '@/game/DailyLoopContext';
import { MobbyAssetButton, MobbyAssetSurface } from '@/components/mobby-ui';

function formatTimer(milliseconds: number) {
  const total = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(total / 60).toString().padStart(2, '0');
  const seconds = (total % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function MobbyTimeWaitScreen() {
  const { state, isHydrated, reconcile } = useDailyLoop();
  const [clientReady, setClientReady] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    setClientReady(true);
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const entitlement = state.mobbyTime;
  useEffect(() => {
    if (!isHydrated || entitlement?.state !== 'available' || entitlement.expiresAt === null || entitlement.expiresAt > now) return;
    void reconcile();
  }, [entitlement, isHydrated, now, reconcile]);
  const status = useMemo(() => {
    if (!clientReady || !isHydrated) return { title: '確認しています', detail: 'MOBBY TIMEの状態を読み込み中です', action: null };
    if (state.mobbyTimeReward) return { title: '受け取りの途中です', detail: '保存したところから、同じグッズの受け取りを続けられます', action: 'resume' as const };
    if (!entitlement) return { title: '次のBOXを待っています', detail: '届いたBOXは、ここでお知らせします', action: null };
    if (entitlement.state === 'opened') return { title: '今日は受け取り済み', detail: `${entitlement.grantedOn} のMOBBY TIMEは完了しています`, action: 'collection' as const };
    if (entitlement.state === 'expired') return { title: '今日の受付は終了しました', detail: '未開封のBOXは、翌日に1回だけ持ち越されます', action: null };
    if (entitlement.carriedFrom) return { title: '持ち越しBOXが届いています', detail: `${entitlement.carriedFrom} から大切に預かっていたBOXです`, action: 'open' as const };
    return { title: '今日のBOXが届きました', detail: 'どのモビーのグッズかは、開けてからのお楽しみ', action: 'open' as const };
  }, [clientReady, entitlement, isHydrated, state.mobbyTimeReward]);
  const remaining = entitlement?.expiresAt ? entitlement.expiresAt - now : 0;
  return (
    <SafeAreaView edges={['left', 'right']} style={waitStyles.safeArea}>
      <ScrollView contentContainerStyle={waitStyles.content}>
        <Text style={waitStyles.title}>MOBBY TIME</Text>
        <MobbyAssetSurface variant="statusWide" accessibilityLiveRegion="polite" style={waitStyles.statusPanel} contentStyle={waitStyles.statusPanelContent}>
          {!clientReady || !isHydrated ? <ActivityIndicator color="#e76f51" /> : null}
          <Text style={waitStyles.statusTitle}>{status.title}</Text>
          <Text style={waitStyles.body}>{status.detail}</Text>
          {clientReady && isHydrated && entitlement?.state === 'available' && entitlement.expiresAt ? (
            <Text accessibilityLabel={`残り時間 ${formatTimer(remaining)}`} style={waitStyles.timer}>{formatTimer(remaining)}</Text>
          ) : null}
        </MobbyAssetSurface>
        {status.action ? (
          <MobbyAssetButton
            accessibilityLabel={status.action === 'resume' ? '受け取りを再開' : status.action === 'collection' ? 'コレクションで見る' : 'BOXを開ける'}
            tone={status.action === 'collection' ? 'cream' : 'coral'}
            onPress={() => router.push(status.action === 'collection' ? '/collection' : '/mobby-time/open')}
            style={status.action === 'collection' ? waitStyles.secondaryButton : waitStyles.openButton}
          >
            <Text style={status.action === 'collection' ? waitStyles.secondaryButtonText : waitStyles.openButtonText}>
                {status.action === 'resume' ? '受け取りを再開' : status.action === 'collection' ? 'コレクションで見る' : 'BOXを開ける'}
            </Text>
          </MobbyAssetButton>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const waitStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff9ef' },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 20, gap: 12 },
  title: { color: '#48372f', fontSize: 32, lineHeight: 40, fontWeight: '900' },
  statusPanel: { width: '100%', overflow: 'hidden' },
  statusPanelContent: { justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 18 },
  statusTitle: { color: '#48372f', fontSize: 22, lineHeight: 30, fontWeight: '800', textAlign: 'center' },
  body: { color: '#65544b', fontSize: 16, lineHeight: 24 },
  timer: { color: '#e05d45', fontSize: 36, lineHeight: 44, fontWeight: '900', fontVariant: ['tabular-nums'] },
  openButton: { minHeight: 52, borderRadius: 18, overflow: 'hidden' },
  openButtonText: { color: '#fff', fontSize: 18, lineHeight: 24, fontWeight: '900' },
  secondaryButton: { minHeight: 48, borderRadius: 18, overflow: 'hidden' },
  secondaryButtonText: { color: '#7b4e40', fontSize: 16, lineHeight: 22, fontWeight: '800' },
});
