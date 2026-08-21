import { StyleSheet, View } from 'react-native';
import { Text } from '@/ui/layout/visualPrimitives';
import { router } from 'expo-router';
import { SheetScreen, sheetStyles as s } from '@/components/ShellSheet';
import { STAMP_REWARDS } from '@/data/dailyRewards';
import { useDailyLoop } from '@/game/DailyLoopContext';
import { MobbyAssetButton, MobbyAssetSurface } from '@/components/mobby-ui';

export default function DailyRoute() {
  const { state, isHydrated } = useDailyLoop();
  const nextIndex = Math.min(state.stampCount, 6);
  const goToMobbyTime = () => { router.back(); requestAnimationFrame(() => router.navigate('/mobby-time')); };
  return <SheetScreen title="きょうの記録" footer={<MobbyAssetButton accessibilityLabel="MOBBY TIMEを見る" disabled={!isHydrated} onPress={goToMobbyTime}><Text style={s.actionText}>MOBBY TIMEを見る</Text></MobbyAssetButton>}>
    <View style={s.section}><Text style={s.sectionTitle}>7日スタンプ</Text><View style={styles.stamps}>{STAMP_REWARDS.map((reward, index) => <MobbyAssetSurface key={reward.id} variant={index < state.stampCount ? 'tileSelected' : 'tile'} style={styles.stamp} contentStyle={styles.stampContent}><Text style={styles.stampDay}>{index + 1}</Text><Text style={styles.stampMark}>{index < state.stampCount ? '✓' : '・'}</Text></MobbyAssetSurface>)}</View><Text style={s.secondary}>次のごほうび：{STAMP_REWARDS[nextIndex].label}</Text></View>
    <View style={s.section}><Text style={s.sectionTitle}>今日のミッション</Text><MobbyAssetSurface variant="notice" style={styles.mission} contentStyle={styles.missionContent}><Text style={s.body}>ほっぺを引っぱる　{state.missions.pullReleases}/3</Text></MobbyAssetSurface><MobbyAssetSurface variant="notice" style={styles.mission} contentStyle={styles.missionContent}><Text style={s.body}>MOBBY TIME　{state.missions.mobbyTimeOpened ? 'できた' : 'まだ'}</Text></MobbyAssetSurface></View>
    {!isHydrated ? <Text style={s.secondary}>記録を読み込んでいます…</Text> : null}
  </SheetScreen>;
}
const styles = StyleSheet.create({ stamps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, stamp: { width: 44, minHeight: 52 }, stampContent: { minHeight: 52, alignItems: 'center', justifyContent: 'center' }, mission: { minHeight: 58 }, missionContent: { minHeight: 58, justifyContent: 'center', paddingHorizontal: 18 }, stampDay: { fontSize: 12, color: '#6E5864' }, stampMark: { fontSize: 18, color: '#A4485A', fontWeight: '800' } });
