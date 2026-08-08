import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { MobbyColors } from './mobby-ui';

const ICONS: Record<string, ImageSourcePropType> = {
  home: require('../../assets/home-ui/icons/house.png'),
  room: require('../../assets/home-ui/icons/room.png'),
  communication: require('../../assets/home-ui/icons/message.png'),
  gacha: require('../../assets/home-ui/icons/gacha.png'),
  mobby: require('../../assets/home-ui/icons/mobby.png'),
};

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild><TabButton icon={ICONS.home}>ホーム</TabButton></TabTrigger>
          <TabTrigger name="room" href="/build" asChild><TabButton icon={ICONS.room}>部屋</TabButton></TabTrigger>
          <TabTrigger name="communication" href="/communication" asChild><TabButton icon={ICONS.communication}>通信</TabButton></TabTrigger>
          <TabTrigger name="gacha" href="/gacha" asChild><TabButton icon={ICONS.gacha}>ガチャ</TabButton></TabTrigger>
          <TabTrigger name="mobby" href="/explore" asChild><TabButton icon={ICONS.mobby}>モビー</TabButton></TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, icon, isFocused, ...props }: TabTriggerSlotProps & { icon?: ImageSourcePropType }) {
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <View style={[styles.tabButtonView, isFocused && styles.tabButtonFocused]}>
        {icon ? <Image source={icon} resizeMode="contain" style={[styles.tabIcon, isFocused && styles.tabIconFocused]} /> : null}
        <Text style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}>{children}</Text>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return <View {...props} style={styles.tabListContainer}><View style={styles.innerContainer}>{props.children}</View></View>;
}

const styles = StyleSheet.create({
  tabListContainer: { position: 'absolute', bottom: 12, width: '100%', paddingHorizontal: 9, justifyContent: 'center', alignItems: 'center', zIndex: 20 },
  innerContainer: { paddingVertical: 5, paddingHorizontal: 5, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, width: '100%', maxWidth: 430, backgroundColor: 'rgba(255,244,221,0.96)', borderWidth: 1.5, borderColor: '#E0B87D', shadowColor: '#7D4F32', shadowOpacity: 0.18, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  tabButton: { flex: 1, minWidth: 0 },
  tabButtonView: { minHeight: 53, paddingVertical: 4, paddingHorizontal: 2, borderRadius: 19, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  tabButtonFocused: { backgroundColor: '#FFDCCF' },
  tabIcon: { width: 25, height: 25, tintColor: MobbyColors.muted, marginBottom: 1 },
  tabIconFocused: { tintColor: MobbyColors.coralDark },
  tabLabel: { color: MobbyColors.muted, fontSize: 10, fontWeight: '900' },
  tabLabelFocused: { color: MobbyColors.coralDark },
  pressed: { opacity: 0.7 },
});
