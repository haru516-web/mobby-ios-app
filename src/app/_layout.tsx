import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

import { DailyLoopProvider } from '@/game/DailyLoopContext';
import MobbyAppShell from '@/state/MobbyAppShell';

export default function RootLayout() {
  return (
    <DailyLoopProvider>
      <MobbyAppShell>
      <StatusBar style="dark" />
      <Stack initialRouteName="(tabs)" screenOptions={{ headerBackTitle: '戻る' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: '設定' }} />
        <Stack.Screen name="daily" options={{ title: 'きょうの記録', presentation: Platform.OS === 'web' ? 'modal' : 'formSheet' }} />
        <Stack.Screen name="mobby-picker" options={{ title: 'メインモビー', presentation: Platform.OS === 'web' ? 'modal' : 'formSheet' }} />
        <Stack.Screen name="notifications" options={{ title: 'お知らせ', presentation: Platform.OS === 'web' ? 'modal' : 'formSheet' }} />
        <Stack.Screen name="mobby-time/open" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="story/[episodeId]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>
      </MobbyAppShell>
    </DailyLoopProvider>
  );
}
