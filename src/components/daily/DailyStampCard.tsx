import { StyleSheet, Text, View } from 'react-native';

import { STAMP_REWARDS } from '@/data/dailyRewards';

type Props = { stampCount: number; cycle?: number; testID?: string };

export function DailyStampCard({ stampCount, cycle = 1, testID }: Props) {
  const completed = Math.max(0, Math.min(7, stampCount));
  return (
    <View
      style={styles.card}
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
              <View style={[styles.stamp, done && styles.stampDone]}>
                <Text style={[styles.day, done && styles.dayDone]}>{done ? '✓' : index + 1}</Text>
              </View>
              <Text numberOfLines={1} style={styles.reward}>{index === 6 ? 'TIME' : reward.amount}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, backgroundColor: '#FFF9EC', borderWidth: 1, borderColor: '#E6C8A7' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  title: { color: '#5C4055', fontSize: 17, fontWeight: '900' },
  cycle: { color: '#A47A83', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { flex: 1, alignItems: 'center' },
  stamp: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0E4D8', borderWidth: 1, borderColor: '#DABFA8' },
  stampDone: { backgroundColor: '#D98494', borderColor: '#C66D82' },
  day: { color: '#8D7472', fontSize: 12, fontWeight: '900' },
  dayDone: { color: '#FFF9EC' },
  reward: { color: '#9B777C', fontSize: 8, fontWeight: '800', marginTop: 5 },
});
