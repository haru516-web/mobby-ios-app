import { Tabs } from 'expo-router';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { PlatformPressable } from '@react-navigation/elements';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Text } from '@/ui/layout/visualPrimitives';

import { useMobbyAppShell } from '@/state/MobbyAppShell';
import { useGachaTheme } from '@/theme/GachaThemeContext';

const BOTTOM_STRIP = require('../../../assets/home-ui/panels/nav-backdrop-v4.png');
const HOME_ICON = require('../../../assets/home-ui/icons/nav-home-v1.png');
const COLLECTION_ICON = require('../../../assets/home-ui/icons/nav-collection-v1.png');
const MOBBY_TIME_ICON = require('../../../assets/home-ui/icons/nav-time-v1.png');
const GACHA_ICON = require('../../../assets/home-ui/icons/nav-gacha-v1.png');
const STORIES_ICON = require('../../../assets/home-ui/icons/nav-stories-v1.png');

const ACTIVE_TINT = '#705178';
const INACTIVE_TINT = '#A48189';

function TabIcon({ source, focused, compact = false, badge = false }: { source: number; focused: boolean; compact?: boolean; badge?: boolean }) {
  return <View style={styles.iconWrap}>
    {focused ? <View pointerEvents="none" style={styles.activeTabPanel} /> : null}
    <Image accessible={false} accessibilityElementsHidden accessibilityIgnoresInvertColors importantForAccessibility="no" source={source} contentFit="contain" style={[styles.icon, compact && styles.compactIcon, focused && styles.activeIcon]} />
    {badge ? <View pointerEvents="none" style={styles.badge}><Text style={styles.badgeText}>!</Text></View> : null}
  </View>;
}

function TabLabel({ children, color }: { children: string; color: string }) {
  return <Text style={[styles.tabBarLabel, { color }]}>{children}</Text>;
}

function ImageTabButton({ children, style, ...props }: BottomTabBarButtonProps) {
  return <PlatformPressable {...props} style={[styles.tabButton, style]}>
    <View pointerEvents="box-none" style={styles.tabButtonContent}>{children}</View>
  </PlatformPressable>;
}

export default function TabLayout() {
  const { opening, resetMobbyTimeHub } = useMobbyAppShell();
  const { activeTheme } = useGachaTheme();
  const activeTint = activeTheme?.character.accent ?? ACTIVE_TINT;
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: INACTIVE_TINT,
        tabBarShowLabel: true,
        tabBarStyle: opening ? styles.tabBarHidden : styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarIconStyle: styles.tabBarIcon,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarBackground: () => <Image accessible={false} accessibilityElementsHidden accessibilityIgnoresInvertColors importantForAccessibility="no-hide-descendants" source={BOTTOM_STRIP} contentFit="contain" contentPosition="center" style={styles.tabBarBackground} />,
        sceneStyle: { backgroundColor: 'transparent' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'ホーム', tabBarLabel: TabLabel, tabBarButton: (props) => <ImageTabButton {...props} />, tabBarIcon: ({ focused }) => <TabIcon source={HOME_ICON} focused={focused} /> }} />
      <Tabs.Screen name="collection" options={{ title: 'コレクション', tabBarLabel: TabLabel, tabBarButton: (props) => <ImageTabButton {...props} />, tabBarIcon: ({ focused }) => <TabIcon source={COLLECTION_ICON} focused={focused} /> }} />
      <Tabs.Screen
        name="mobby-time"
        listeners={{ tabPress: resetMobbyTimeHub }}
        options={{ title: 'MOBBY TIME', tabBarLabel: TabLabel, tabBarButton: (props) => <ImageTabButton {...props} />, tabBarIcon: ({ focused }) => <TabIcon source={MOBBY_TIME_ICON} focused={focused} /> }}
      />
      <Tabs.Screen name="gacha" options={{ title: 'ガチャ', tabBarLabel: TabLabel, tabBarButton: (props) => <ImageTabButton {...props} />, tabBarAccessibilityLabel: 'ガチャ', tabBarIcon: ({ focused }) => <TabIcon source={GACHA_ICON} focused={focused} compact /> }} />
      <Tabs.Screen name="stories" options={{ title: 'ストーリー', tabBarLabel: TabLabel, tabBarButton: (props) => <ImageTabButton {...props} />, tabBarAccessibilityLabel: 'ストーリー', tabBarIcon: ({ focused }) => <TabIcon source={STORIES_ICON} focused={focused} compact /> }} />
      <Tabs.Screen name="trade" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 78,
    paddingTop: 7,
    paddingBottom: 5,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    overflow: 'hidden',
  },
  tabBarHidden: { display: 'none', height: 0 },
  // Keep the complete stitched frame visible at every responsive width.
  // Small insets prevent the rounded edge and shadow from being clipped.
  tabBarBackground: { position: 'absolute', top: 3, right: 5, bottom: 3, left: 5, width: 'auto', height: 'auto' },
  tabBarItem: { minHeight: 64, paddingHorizontal: 1, paddingVertical: 1, backgroundColor: 'transparent' },
  tabBarIcon: { width: 44, height: 43, marginBottom: 0 },
  tabBarLabel: { fontSize: 10, lineHeight: 12, fontWeight: '900', marginTop: 0, marginBottom: 6, textAlign: 'center', textShadowColor: 'rgba(255,250,237,0.96)', textShadowRadius: 2 },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  activeTabPanel: { position: 'absolute', top: -3, width: 68, height: 58, borderRadius: 22, backgroundColor: 'rgba(162,124,181,0.28)' },
  tabButtonContent: { flex: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  iconWrap: { width: 48, height: 42, alignItems: 'center', justifyContent: 'flex-start' },
  icon: { width: 42, height: 42 },
  compactIcon: { width: 40, height: 40 },
  activeIcon: { transform: [{ scale: 1.5 }] },
  badge: { position: 'absolute', top: -3, right: -1, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C65F6D', borderWidth: 1.2, borderColor: '#FFF8EB' },
  badgeText: { color: '#FFF8EC', fontSize: 9, lineHeight: 11, fontWeight: '900' },
});
