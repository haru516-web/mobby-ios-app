import { StyleSheet, View } from 'react-native';
import { Text } from '@/ui/layout/visualPrimitives';
import { router, type Href } from 'expo-router';
import { SheetScreen, sheetStyles as s } from '@/components/ShellSheet';
import { useDailyLoop } from '@/game/DailyLoopContext';
import { useMobbyAppShell } from '@/state/MobbyAppShell';
import { MobbyAssetSelectable } from '@/components/mobby-ui';

export default function NotificationsRoute() {
  const daily = useDailyLoop();
  const shell = useMobbyAppShell();
  const closeThenNavigate = (href: Href) => { router.back(); requestAnimationFrame(() => router.navigate(href)); };
  const boxWaiting = daily.state.mobbyTime?.state === 'available' || daily.state.mobbyTime?.state === 'expired';
  return <SheetScreen title="お知らせ">
    <View style={s.section}><Text style={s.sectionTitle}>今日</Text>
      <MobbyAssetSelectable accessibilityRole="button" accessibilityLabel="今日の記録を開く" variant="notice" onPress={() => closeThenNavigate('/daily')} style={styles.row} contentStyle={styles.rowContent}><Text style={s.body}>今日の記録</Text><Text style={s.secondary}>スタンプとミッションを確認できます</Text></MobbyAssetSelectable>
      <MobbyAssetSelectable accessibilityRole="button" accessibilityLabel="MOBBY TIMEを開く" variant="notice" onPress={() => closeThenNavigate('/mobby-time')} style={styles.row} contentStyle={styles.rowContent}><Text style={s.body}>MOBBY TIME</Text><Text style={s.secondary}>{boxWaiting ? '開けられる箱が届いています' : '今日の箱の状態を見てみよう'}</Text></MobbyAssetSelectable>
      <MobbyAssetSelectable accessibilityRole="button" accessibilityLabel="関係性エピソードを開く" variant="notice" onPress={() => closeThenNavigate('/stories')} style={styles.row} contentStyle={styles.rowContent}><Text style={s.body}>関係性エピソード</Text><Text style={s.secondary}>{shell.hasUnresolvedEpisode ? `${shell.unresolvedEpisodeTitle ?? '続きのおはなし'}があります` : 'ふたりのおはなしを見返せます'}</Text></MobbyAssetSelectable>
    </View>
  </SheetScreen>;
}

const styles = StyleSheet.create({ row: { minHeight: 70 }, rowContent: { minHeight: 70, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 14 } });
