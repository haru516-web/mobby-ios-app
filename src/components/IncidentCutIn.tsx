import { Image } from 'expo-image';
import { StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { Text } from '@/ui/layout/visualPrimitives';

import { MobbyAssetButton, MobbyAssetSurface } from '@/components/mobby-ui';

export type IncidentCutInProps = {
  enemyName: string;
  enemyImage: ImageSourcePropType;
  targetName: string;
  targetImage: ImageSourcePropType;
  onPlay: () => void;
  onLater: () => void;
};

export function IncidentCutIn({ enemyName, enemyImage, targetName, targetImage, onPlay, onLater }: IncidentCutInProps) {
  return <View style={styles.overlay} accessibilityViewIsModal accessibilityLiveRegion="assertive">
    <MobbyAssetSurface variant="darkCaseTall" style={styles.card} contentStyle={styles.cardContent}>
      <Text style={styles.title}>{enemyName}と{targetName}が、まさかの共演！</Text>
      <View style={styles.scene}>
        <Image accessibilityLabel={enemyName} source={enemyImage} contentFit="contain" style={styles.enemy} />
        <Text style={styles.arrow}>→</Text>
        <Image accessibilityLabel={targetName} source={targetImage} contentFit="contain" style={styles.target} />
      </View>
      <Text style={styles.copy}>正反対のふたりがどうして出会ったのか、短編エピソードで見届けよう。</Text>
      <MobbyAssetButton accessibilityLabel="第1話を再生" onPress={onPlay} style={styles.primary}><Text style={styles.primaryText}>第1話を再生</Text></MobbyAssetButton>
      <MobbyAssetButton accessibilityLabel="あとでエピソードタブから見る" tone="cream" onPress={onLater} style={styles.secondary}><Text style={styles.secondaryText}>あとでエピソードタブから</Text></MobbyAssetButton>
    </MobbyAssetSurface>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 170, backgroundColor: 'rgba(16,10,20,.94)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', minHeight: 560 }, cardContent: { minHeight: 560, padding: 28, gap: 14, justifyContent: 'center' },
  title: { color: '#FFF8EF', fontSize: 25, lineHeight: 33, fontWeight: '900', textAlign: 'center' },
  scene: { height: 230, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  enemy: { width: 155, height: 220 }, target: { width: 130, height: 180 },
  arrow: { color: '#FFCF79', fontSize: 34, fontWeight: '900' },
  copy: { color: '#F3DFDC', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  primary: { minHeight: 54 },
  primaryText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  secondary: { minHeight: 48 }, secondaryText: { color: '#70485E', fontWeight: '800' },
});
