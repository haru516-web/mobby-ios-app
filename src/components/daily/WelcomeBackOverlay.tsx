import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { Text } from '@/ui/layout/visualPrimitives';

import { MobbyIdleMotion } from '@/components/mobby';
import { MobbyAssetButton, MobbyAssetSurface } from '@/components/mobby-ui';

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
      <MobbyAssetSurface variant="paperTall" style={styles.card} contentStyle={styles.cardContent} accessible accessibilityRole="summary">
        <MobbyIdleMotion style={styles.motion}>
          <Image source={image} contentFit="contain" style={styles.image} />
        </MobbyIdleMotion>
        <Text style={styles.title}>おかえり！</Text>
        <Text style={styles.name}>{mobbyName}より</Text>
        <Text style={styles.line}>{line}</Text>
        <MobbyAssetButton accessibilityLabel="おかえりメッセージを閉じる" onPress={close} style={styles.button}>
          <Text style={styles.buttonText}>ただいま</Text>
        </MobbyAssetButton>
      </MobbyAssetSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 120, alignItems: 'center', justifyContent: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(65,43,59,0.42)' },
  card: { width: 300, minHeight: 420 }, cardContent: { minHeight: 420, padding: 28, alignItems: 'center', justifyContent: 'center' },
  motion: { width: 150, height: 145, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  image: { width: 142, height: 142 },
  title: { color: '#5C405B', fontSize: 25, fontWeight: '900' },
  name: { color: '#9A7380', fontSize: 12, fontWeight: '900', marginTop: 2 },
  line: { color: '#6F5264', fontSize: 13, lineHeight: 20, fontWeight: '800', textAlign: 'center', marginTop: 12 },
  button: { width: 170, minHeight: 48, marginTop: 18 },
  buttonText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
});
