import { StyleSheet, View } from 'react-native';
import { Text } from '@/ui/layout/visualPrimitives';

import { STAMP_REWARDS } from '@/data/dailyRewards';
import { MobbyAssetSurface } from '@/components/mobby-ui';

type Props = { stampCount: number; cycle?: number; testID?: string };

export function DailyStampCard({ stampCount, cycle = 1, testID }: Props) {
  const completed = Math.max(0, Math.min(7, stampCount));
  return (
    <MobbyAssetSurface
      style={styles.card}
      contentStyle={styles.cardContent}
      testID={testID}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`7日ログインスタンプ、サイクル${cycle}、${completed}個獲得済み`}
      accessibilityState={{ busy: false }}
      accessibilityValue={{ min: 0, max: 7, now: completed, text: `${completed} / 7` }}>
      <View style={styles.heading}>
        <Text style={styles.title} accessibilityRole="header">7日スタンプ</Text>
        <Text style={styles.cycle}>CYCLE {cycle}</Text>
      </View>
      <View style={styles.row}>
        {STAMP_REWARDS.map((reward, index) => {
          const done = index < completed;
          return (
            <View
              key={reward.id}
              style={styles.cell}
              accessible
              accessibilityRole="checkbox"
              accessibilityLabel={`${index + 1}日目、報酬${reward.label}`}
              accessibilityState={{ checked: done }}>
              <MobbyAssetSurface variant={done ? 'tileSelected' : 'tile'} style={[styles.stamp, done && styles.stampDone]} contentStyle={styles.stampContent}>
                <Text style={[styles.day, done && styles.dayDone]}>{done ? '✓' : index + 1}</Text>
              </MobbyAssetSurface>
              <Text numberOfLines={1} style={styles.reward}>{index === 6 ? 'TIME' : reward.amount}</Text>
            </View>
          );
        })}
      </View>
    </MobbyAssetSurface>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 132 }, cardContent: { padding: 20 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  title: { color: '#5C4055', fontSize: 17, fontWeight: '900' },
  cycle: { color: '#A47A83', fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { flex: 1, alignItems: 'center' },
  stamp: { width: 34, height: 34, overflow: 'hidden' },
  stampDone: { opacity: 0.92 },
  stampContent: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  day: { color: '#8D7472', fontSize: 12, fontWeight: '900' },
  dayDone: { color: '#FFF9EC' },
  reward: { color: '#9B777C', fontSize: 12, fontWeight: '800', marginTop: 5 },
});
