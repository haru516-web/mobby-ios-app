import { StyleSheet, Text, View } from 'react-native';

import { PULL_RELEASE_MISSION_TARGET } from '@/data/reactions';
import type { MissionState } from '@/game/dailyLoopStorage';

type Props = { missions: MissionState; testID?: string };

function MissionRow({ done, title, progress }: { done: boolean; title: string; progress: string }) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="checkbox"
      accessibilityLabel={`${title}、${done ? '達成' : progress}`}
      accessibilityState={{ checked: done }}>
      <View style={[styles.check, done && styles.checkDone]}><Text style={styles.checkText}>{done ? '✓' : ''}</Text></View>
      <View style={styles.copy}><Text style={styles.mission}>{title}</Text><Text style={styles.progress}>{done ? '達成！' : progress}</Text></View>
    </View>
  );
}

export function DailyMissionPanel({ missions, testID }: Props) {
  const pullCount = Math.min(PULL_RELEASE_MISSION_TARGET, missions.pullReleases);
  const allDone = pullCount >= PULL_RELEASE_MISSION_TARGET && missions.mobbyTimeOpened;
  return (
    <View
      style={styles.panel}
      testID={testID}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`きょうのミッション、${Number(pullCount >= PULL_RELEASE_MISSION_TARGET) + Number(missions.mobbyTimeOpened)} / 2達成`}
      accessibilityState={{ busy: false }}
      accessibilityValue={{ min: 0, max: 2, now: Number(pullCount >= PULL_RELEASE_MISSION_TARGET) + Number(missions.mobbyTimeOpened) }}>
      <View style={styles.heading}><Text style={styles.title} accessibilityRole="header">きょうのミッション</Text><Text style={styles.badge}>2 MISSIONS</Text></View>
      <MissionRow done={pullCount >= PULL_RELEASE_MISSION_TARGET} title="ちょっかいを3回離す" progress={`${pullCount} / ${PULL_RELEASE_MISSION_TARGET}`} />
      <MissionRow done={missions.mobbyTimeOpened} title="MOBBY TIMEを開く" progress="未達成" />
      <View
        style={[styles.bonus, allDone && styles.bonusDone]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={allDone ? 'コンプリートボーナス達成' : '2つ達成でボーナス'}
        accessibilityLiveRegion="polite">
        <Text style={[styles.bonusText, allDone && styles.bonusTextDone]}>{allDone ? 'コンプリートボーナス達成' : '2つ達成でボーナス'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 20, padding: 16, backgroundColor: '#FBF3F5', borderWidth: 1, borderColor: '#E4C4CC' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  title: { color: '#593E55', fontSize: 17, fontWeight: '900' },
  badge: { color: '#A06D7B', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  row: { minHeight: 55, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5CBD1' },
  check: { width: 25, height: 25, borderRadius: 13, borderWidth: 2, borderColor: '#CBAAB3', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkDone: { backgroundColor: '#8C6683', borderColor: '#8C6683' },
  checkText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  copy: { flex: 1 }, mission: { color: '#684C60', fontSize: 12, fontWeight: '800' },
  progress: { color: '#A17D87', fontSize: 9, fontWeight: '700', marginTop: 2 },
  bonus: { marginTop: 12, paddingVertical: 9, borderRadius: 12, alignItems: 'center', backgroundColor: '#E9DADF' },
  bonusDone: { backgroundColor: '#76546F' }, bonusText: { color: '#8F6F79', fontSize: 10, fontWeight: '900' },
  bonusTextDone: { color: '#FFF9EC' },
});
