import { ThemeProvider } from '@react-navigation/core';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { MobbyGameProvider } from '@/game/MobbyGameContext';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <MobbyGameProvider>
        <AnimatedSplashOverlay />
        <AppTabs />
      </MobbyGameProvider>
    </ThemeProvider>
  );
}
