import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

import { DailyLoopProvider } from '@/game/DailyLoopContext';
import MobbyAppShell from '@/state/MobbyAppShell';
import { useGachaTheme } from '@/theme/GachaThemeContext';

function ThemedStack() {
  const { activeTheme } = useGachaTheme();
  const headerBackground = activeTheme
    ? () => <Image accessible={false} source={activeTheme.assets.navigation} contentFit="cover" style={styles.headerBackground} />
    : undefined;
  return <>
    <StatusBar style="dark" />
    <Stack initialRouteName="(tabs)" screenOptions={{ headerBackTitle: '戻る', headerBackground }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: '設定' }} />
      <Stack.Screen name="daily" options={{ title: 'きょうの記録', presentation: Platform.OS === 'web' ? 'modal' : 'formSheet' }} />
      <Stack.Screen name="mobby-picker" options={{ title: 'メインモビー', presentation: Platform.OS === 'web' ? 'modal' : 'formSheet' }} />
      <Stack.Screen name="notifications" options={{ title: 'お知らせ', presentation: Platform.OS === 'web' ? 'modal' : 'formSheet' }} />
      <Stack.Screen name="mobby-time/open" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="story/[episodeId]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
    </Stack>
  </>;
}

export default function RootLayout() {
  return (
    <DailyLoopProvider>
      <MobbyAppShell>
        <ThemedStack />
      </MobbyAppShell>
    </DailyLoopProvider>
  );
}

const styles = StyleSheet.create({
  headerBackground: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
});
