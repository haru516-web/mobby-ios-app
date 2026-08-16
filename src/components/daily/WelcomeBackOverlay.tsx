import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { MobbyIdleMotion } from '@/components/mobby';

const STORAGE_KEY = '@mobby/welcome-back-v1';
const LINES = [
  'きょうも、いいこと見つけよう。',
  '会えてうれしい。ゆっくりしていってね。',
  'お部屋で待ってたよ。',
  '今日のちょっかい、楽しみにしてた！',
  'ひと息ついたら、一緒に遊ぼう。',
  '今日もモビー日和だね。',
  '帰ってきてくれて、ありがとう。',
] as const;

type Props = { logicalDate: string; mobbyName: string; image: ImageSourcePropType; enabled: boolean };

export function WelcomeBackOverlay({ logicalDate, mobbyName, image, enabled }: Props) {
  const [visible, setVisible] = useState(false);
  const line = useMemo(() => {
    const seed = [...logicalDate].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    return LINES[seed % LINES.length];
  }, [logicalDate]);

  useEffect(() => {
    let mounted = true;
    setVisible(false);
    if (!enabled) return () => { mounted = false; };
    void AsyncStorage.getItem(STORAGE_KEY).then((shownDate) => {
      if (mounted && shownDate !== logicalDate) setVisible(true);
    }).catch(() => { if (mounted) setVisible(true); });
    return () => { mounted = false; };
  }, [enabled, logicalDate]);

  const close = () => {
    setVisible(false);
    void AsyncStorage.setItem(STORAGE_KEY, logicalDate).catch(() => undefined);
  };

  if (!visible) return null;
  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <Pressable accessibilityRole="button" accessibilityLabel="おかえりメッセージを閉じる" onPress={close} style={styles.backdrop} />
      <View style={styles.card} accessible accessibilityRole="summary">
        <Text style={styles.kicker}>WELCOME BACK</Text>
        <MobbyIdleMotion style={styles.motion}>
          <Image source={image} resizeMode="contain" style={styles.image} />
        </MobbyIdleMotion>
        <Text style={styles.title}>おかえり！</Text>
        <Text style={styles.name}>{mobbyName}より</Text>
        <Text style={styles.line}>{line}</Text>
        <Pressable accessibilityRole="button" onPress={close} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>ただいま</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 120, alignItems: 'center', justifyContent: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(65,43,59,0.42)' },
  card: { width: 300, padding: 22, borderRadius: 30, alignItems: 'center', backgroundColor: '#FFF9EC', borderWidth: 1.5, borderColor: '#DFC19F' },
  kicker: { color: '#A57682', fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  motion: { width: 150, height: 145, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  image: { width: 142, height: 142 },
  title: { color: '#5C405B', fontSize: 25, fontWeight: '900' },
  name: { color: '#9A7380', fontSize: 10, fontWeight: '900', marginTop: 2 },
  line: { color: '#6F5264', fontSize: 13, lineHeight: 20, fontWeight: '800', textAlign: 'center', marginTop: 12 },
  button: { width: 170, minHeight: 46, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#76546F', marginTop: 18 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  buttonText: { color: '#FFF9EC', fontSize: 13, fontWeight: '900' },
});
