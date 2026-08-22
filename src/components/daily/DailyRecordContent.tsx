import { StyleSheet, View } from 'react-native';

import { MobbyAssetSurface } from '@/components/mobby-ui';
import { sheetStyles as s } from '@/components/ShellSheet';
import { STAMP_REWARDS } from '@/data/dailyRewards';
import type { MissionState } from '@/game/dailyLoopStorage';
import { Text } from '@/ui/layout/visualPrimitives';

export function DailyRecordContent({ stampCount, missions, isHydrated, presentation = 'sheet' }: {
  stampCount: number;
  missions: MissionState;
  isHydrated: boolean;
  presentation?: 'sheet' | 'popover';
}) {
  const nextIndex = Math.min(stampCount, 6);

  return <>
    <View style={s.section}>
      <Text style={s.sectionTitle}>7日スタンプ</Text>
      <View style={styles.stamps}>
        {STAMP_REWARDS.map((reward, index) => {
          const earned = index < stampCount;
          return <View
            accessible
            accessibilityLabel={`${index + 1}日目、${reward.label}、${earned ? '獲得済み' : '未獲得'}`}
            key={reward.id}
            style={[styles.stamp, earned && styles.stampEarned]}
          >
            <Text style={styles.stampDay}>{index + 1}</Text>
            <Text style={[styles.stampMark, !earned && styles.stampMarkPending]}>{earned ? '✓' : '○'}</Text>
          </View>;
        })}
      </View>
      <Text style={s.secondary}>次のごほうび：{STAMP_REWARDS[nextIndex].label}</Text>
    </View>

    <View style={s.section}>
      <Text style={s.sectionTitle}>今日のミッション</Text>
      {presentation === 'popover' ? <>
        <View style={[styles.mission, styles.missionContent, styles.missionPlain]}>
          <Text style={s.body}>ほっぺを引っぱる　{missions.pullReleases}/3</Text>
        </View>
        <View style={[styles.mission, styles.missionContent, styles.missionPlain]}>
          <Text style={s.body}>MOBBY TIME　{missions.mobbyTimeOpened ? 'できた' : 'まだ'}</Text>
        </View>
      </> : <>
        <MobbyAssetSurface variant="notice" style={styles.mission} contentStyle={styles.missionContent}>
          <Text style={s.body}>ほっぺを引っぱる　{missions.pullReleases}/3</Text>
        </MobbyAssetSurface>
        <MobbyAssetSurface variant="notice" style={styles.mission} contentStyle={styles.missionContent}>
          <Text style={s.body}>MOBBY TIME　{missions.mobbyTimeOpened ? 'できた' : 'まだ'}</Text>
        </MobbyAssetSurface>
      </>}
    </View>

    {!isHydrated ? <Text style={s.secondary}>記録を読み込んでいます…</Text> : null}
  </>;
}

const styles = StyleSheet.create({
  stamps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stamp: { width: 40, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'rgba(89, 60, 93, 0.16)' },
  stampEarned: { borderBottomColor: '#D77A82' },
  mission: { minHeight: 58 },
  missionContent: { minHeight: 58, justifyContent: 'center', paddingHorizontal: 18 },
  missionPlain: { paddingHorizontal: 2, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(89, 60, 93, 0.12)' },
  stampDay: { fontSize: 12, color: '#6E5864' },
  stampMark: { fontSize: 18, lineHeight: 22, color: '#A4485A', fontWeight: '800' },
  stampMarkPending: { color: '#B8A3AC', fontWeight: '700' },
});
