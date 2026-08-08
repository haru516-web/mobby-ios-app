import { Image, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MobbyColors } from '@/components/mobby-ui';
import { ROOM_ASSETS } from '@/data/roomAssets';

const GACHA = require('../../assets/home-ui/icons/gacha.png');

export default function GachaScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ImageBackground source={ROOM_ASSETS.sunnyStitch} resizeMode="cover" style={styles.background}>
        <View style={styles.wash} />
        <View style={styles.screen}>
          <Text style={styles.title}>ガチャ</Text>
          <Text style={styles.subtitle}>今日も無料で、暮らしの小物を見つけよう</Text>
          <View style={styles.machine}>
            <Image source={GACHA} resizeMode="contain" style={styles.gachaIcon} />
            <Text style={styles.machineTitle}>おたのしみボックス</Text>
            <Text style={styles.machineText}>コインを使わずに、毎日1回あそべます。</Text>
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>無料でひらく</Text></Pressable>
          </View>
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
  machine: { marginTop: 28, minHeight: 300, borderRadius: 30, borderWidth: 2, borderColor: '#D9AA6A', backgroundColor: 'rgba(255,247,225,0.95)', alignItems: 'center', justifyContent: 'center', padding: 22, shadowColor: '#795033', shadowOpacity: 0.18, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  gachaIcon: { width: 102, height: 102 },
  machineTitle: { color: MobbyColors.ink, fontSize: 21, fontWeight: '900', marginTop: 9 },
  machineText: { color: MobbyColors.muted, fontSize: 12, fontWeight: '700', marginTop: 6, textAlign: 'center' },
  button: { marginTop: 21, paddingHorizontal: 38, paddingVertical: 13, borderRadius: 21, backgroundColor: MobbyColors.coral, borderWidth: 2, borderColor: MobbyColors.coralDark },
  buttonText: { color: '#FFF8E9', fontSize: 16, fontWeight: '900' },
  pressed: { opacity: 0.75, transform: [{ translateY: 1 }] },
});
