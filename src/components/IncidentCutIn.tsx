import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

export type IncidentCutInProps = {
  enemyName: string;
  enemyImage: ImageSourcePropType;
  targetName: string;
  targetImage: ImageSourcePropType;
  onPlay: () => void;
  onLater: () => void;
};

/** The incident alert is now the culprit's visible crime scene, not a mystery prompt. */
export function IncidentCutIn({ enemyName, enemyImage, targetName, targetImage, onPlay, onLater }: IncidentCutInProps) {
  return <View style={styles.overlay} accessibilityViewIsModal accessibilityLiveRegion="assertive">
    <View style={styles.card}>
      <Text style={styles.kicker}>事件発生・犯行シーン</Text>
      <Text style={styles.title}>{enemyName}が、{targetName}を連れ去った！</Text>
      <View style={styles.scene}>
        <Image accessibilityLabel={enemyName} source={enemyImage} resizeMode="contain" style={styles.enemy} />
        <Text style={styles.arrow}>→</Text>
        <Image accessibilityLabel={targetName} source={targetImage} resizeMode="contain" style={styles.target} />
      </View>
      <Text style={styles.copy}>犯人は最初から判明。どうしてこうなったのか、短編エピソードで見届けよう。</Text>
      <Pressable accessibilityRole="button" onPress={onPlay} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>第1話を再生</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={onLater} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}><Text style={styles.secondaryText}>あとで事件タブから</Text></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 170, backgroundColor: 'rgba(16,10,20,.94)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', borderRadius: 24, backgroundColor: '#271A30', borderWidth: 1, borderColor: '#A96A78', padding: 20, gap: 14 },
  kicker: { color: '#FFB5BF', fontSize: 13, fontWeight: '900' },
  title: { color: '#FFF8EF', fontSize: 25, lineHeight: 33, fontWeight: '900', textAlign: 'center' },
  scene: { height: 230, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  enemy: { width: 155, height: 220 }, target: { width: 130, height: 180 },
  arrow: { color: '#FFCF79', fontSize: 34, fontWeight: '900' },
  copy: { color: '#F3DFDC', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  primary: { minHeight: 54, borderRadius: 17, backgroundColor: '#D85C70', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  secondary: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: '#E8C9CF', fontWeight: '800' },
  pressed: { opacity: .78, transform: [{ scale: .98 }] },
});
