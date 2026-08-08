import { Tabs } from 'expo-router';
import { Image, type ImageSourcePropType } from 'react-native';

import { MobbyColors } from './mobby-ui';

const ICONS = {
  home: require('../../assets/home-ui/icons/house.png') as ImageSourcePropType,
  room: require('../../assets/home-ui/icons/room.png') as ImageSourcePropType,
  communication: require('../../assets/home-ui/icons/message.png') as ImageSourcePropType,
  gacha: require('../../assets/home-ui/icons/gacha.png') as ImageSourcePropType,
  mobby: require('../../assets/home-ui/icons/mobby.png') as ImageSourcePropType,
};

function TabIcon({ source, color }: { source: ImageSourcePropType; color: string }) {
  return <Image source={source} resizeMode="contain" style={{ width: 25, height: 25, tintColor: color }} />;
}

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: MobbyColors.coralDark,
        tabBarInactiveTintColor: MobbyColors.muted,
        tabBarLabelStyle: { fontWeight: '800', fontSize: 10 },
        tabBarStyle: { backgroundColor: MobbyColors.paper, borderTopColor: '#E2B67D', height: 74, paddingTop: 6 },
        tabBarIconStyle: { marginBottom: -2 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'ホーム', tabBarIcon: ({ color }) => <TabIcon source={ICONS.home} color={color} /> }} />
      <Tabs.Screen name="build" options={{ title: '部屋', tabBarIcon: ({ color }) => <TabIcon source={ICONS.room} color={color} /> }} />
      <Tabs.Screen name="communication" options={{ title: '通信', tabBarIcon: ({ color }) => <TabIcon source={ICONS.communication} color={color} /> }} />
      <Tabs.Screen name="gacha" options={{ title: 'ガチャ', tabBarIcon: ({ color }) => <TabIcon source={ICONS.gacha} color={color} /> }} />
      <Tabs.Screen name="explore" options={{ title: 'モビー', tabBarIcon: ({ color }) => <TabIcon source={ICONS.mobby} color={color} /> }} />
    </Tabs>
  );
}
