import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MobbyColors, PaperPanel } from '@/components/mobby-ui';
import { ROOM_ASSETS } from '@/data/roomAssets';

export default function CommunicationScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ImageBackground source={ROOM_ASSETS.sunnyStitch} resizeMode="cover" style={styles.background}>
        <View style={styles.wash} />
        <View style={styles.screen}>
          <Text style={styles.title}>通信</Text>
          <Text style={styles.subtitle}>モビーたちの小さな便り</Text>
          <PaperPanel style={styles.panel}>
            <Text style={styles.panelTitle}>今日のひとこと</Text>
            <Text style={styles.panelText}>みんなの部屋に、あたらしい思い出が届いています。</Text>
            <View style={styles.message}><Text style={styles.messageEmoji}>✉</Text><Text style={styles.messageText}>無料で楽しめるお知らせをここに集めます。</Text></View>
          </PaperPanel>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EED6A8' },
  background: { flex: 1 },
  wash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,245,215,0.52)' },
  screen: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', padding: 16 },
  title: { color: MobbyColors.ink, fontSize: 30, fontWeight: '900', marginTop: 8 },
  subtitle: { color: MobbyColors.muted, fontSize: 13, fontWeight: '800', marginTop: 3 },
  panel: { marginTop: 22 },
  panelTitle: { color: MobbyColors.ink, fontSize: 20, fontWeight: '900' },
  panelText: { color: MobbyColors.muted, fontSize: 13, fontWeight: '700', marginTop: 9, lineHeight: 20 },
  message: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 20, padding: 12, borderRadius: 16, backgroundColor: '#FFF0DB' },
  messageEmoji: { color: MobbyColors.coralDark, fontSize: 22 },
  messageText: { flex: 1, color: MobbyColors.ink, fontSize: 12, fontWeight: '800' },
});
