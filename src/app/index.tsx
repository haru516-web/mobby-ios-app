import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MobbyCarousel, DISPLAY_NAMES } from '@/components/MobbyCarousel';
import { MobbyColors } from '@/components/mobby-ui';
import { ROOM_ASSETS } from '@/data/roomAssets';
import { useMobbyGame } from '@/game/MobbyGameContext';

const UI = {
  logo: require('../../assets/home-ui/logo/mobby-logo.png'),
  heart: require('../../assets/home-ui/icons/heart.png'),
  coin: require('../../assets/home-ui/icons/coin.png'),
  plus: require('../../assets/home-ui/icons/plus.png'),
  bell: require('../../assets/home-ui/icons/bell.png'),
  menu: require('../../assets/home-ui/icons/menu.png'),
  chevronUp: require('../../assets/home-ui/icons/chevron-up.png'),
  chevronDown: require('../../assets/home-ui/icons/chevron-down.png'),
  room: require('../../assets/home-ui/icons/room.png'),
  notice: require('../../assets/home-ui/icons/notice.png'),
  book: require('../../assets/home-ui/icons/book.png'),
  mission: require('../../assets/home-ui/icons/mission.png'),
  friend: require('../../assets/home-ui/icons/friend.png'),
  gift: require('../../assets/home-ui/icons/gift.png'),
  exchange: require('../../assets/home-ui/icons/exchange.png'),
  search: require('../../assets/home-ui/icons/search.png'),
  coralButton: require('../../assets/home-ui/buttons/coral-button.png'),
};

const QUICK_ACTIONS = [
  { label: 'お知らせ', icon: UI.notice },
  { label: 'メニュー', icon: UI.book },
  { label: 'ミッション', icon: UI.mission },
  { label: 'フレンド', icon: UI.friend },
  { label: 'プレゼント', icon: UI.gift },
  { label: '交換', icon: UI.exchange },
  { label: '診断', icon: UI.search },
] as const;

function Counter({ icon, value, tone }: { icon: number; value: string; tone: 'coral' | 'honey' }) {
  return (
    <View style={styles.counter}>
      <Image source={icon} resizeMode="contain" style={styles.counterIcon} />
      <Text style={styles.counterValue}>{value}</Text>
      <View style={[styles.counterPlus, tone === 'honey' && styles.counterPlusHoney]}>
        <Image source={UI.plus} resizeMode="contain" style={styles.counterPlusIcon} />
      </View>
    </View>
  );
}

function Header({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { selectedMobby } = useMobbyGame();
  return (
    <View style={styles.header}>
      <Image source={UI.logo} resizeMode="contain" style={styles.logo} />
      <View style={styles.avatarFrame}>
        <Image source={selectedMobby.image} resizeMode="contain" style={styles.avatar} />
      </View>
      <View style={styles.counters}>
        <Counter icon={UI.heart} value="25" tone="coral" />
        <Counter icon={UI.coin} value="12,340" tone="honey" />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="お知らせ" style={styles.headerIconButton}>
        <Image source={UI.bell} resizeMode="contain" style={styles.headerIcon} />
        <View style={styles.notificationDot}><Text style={styles.notificationText}>3</Text></View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={open ? 'メニューを閉じる' : 'メニューを開く'} onPress={onToggle} style={styles.headerIconButton}>
        <Image source={UI.menu} resizeMode="contain" style={styles.headerIcon} />
      </Pressable>
    </View>
  );
}

function QuickNav({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const height = useRef(new Animated.Value(open ? 112 : 0)).current;
  useEffect(() => {
    Animated.timing(height, { toValue: open ? 112 : 0, duration: 220, useNativeDriver: false }).start();
  }, [height, open]);

  return (
    <View style={styles.quickNavHolder}>
      <Animated.View style={[styles.quickNavAnimated, { height }]}>
        <ImageBackground source={require('../../assets/home-ui/panels/quick-nav.png')} resizeMode="stretch" style={styles.quickNavPanel}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable key={action.label} accessibilityRole="button" accessibilityLabel={action.label} onPress={() => undefined} style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}>
              <View style={styles.quickIconPlate}><Image source={action.icon} resizeMode="contain" style={styles.quickIcon} /></View>
              <Text style={styles.quickLabel} numberOfLines={1}>{action.label}</Text>
            </Pressable>
          ))}
        </ImageBackground>
      </Animated.View>
      <Pressable accessibilityRole="button" accessibilityLabel={open ? 'ナビを閉じる' : 'ナビを開く'} onPress={onToggle} style={styles.navToggle}>
        <Image source={open ? UI.chevronUp : UI.chevronDown} resizeMode="contain" style={styles.navToggleIcon} />
      </Pressable>
    </View>
  );
}

function CoralButton({ children, onPress }: { children: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.coralButton, pressed && styles.pressed]}>
      <ImageBackground source={UI.coralButton} resizeMode="stretch" style={styles.coralButtonImage}>
        <Text style={styles.coralButtonText}>{children}</Text>
      </ImageBackground>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { selectedMobby, selectedMobbyId, selectMobby, moment, memories, recordMoment } = useMobbyGame();
  const [quickOpen, setQuickOpen] = useState(true);
  const [recorded, setRecorded] = useState(false);
  const webTabInset = Platform.OS === 'web' ? 82 : 0;

  useEffect(() => {
    setRecorded(memories.some((memory) => memory.id === moment.id));
  }, [memories, moment.id]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ImageBackground source={ROOM_ASSETS.sunnyStitch} resizeMode="cover" style={[styles.background, { paddingBottom: Math.max(insets.bottom, 0) }]}> 
        <View pointerEvents="none" style={styles.backgroundWash} />
        <View style={[styles.screen, { paddingBottom: 4 + webTabInset }]}>
          <Header open={quickOpen} onToggle={() => setQuickOpen((current) => !current)} />
          <QuickNav open={quickOpen} onToggle={() => setQuickOpen((current) => !current)} />

          <View style={styles.carouselSection}>
            <MobbyCarousel selectedId={selectedMobbyId} onSelect={(mobby) => selectMobby(mobby.id)} />
          </View>

          <View style={styles.activityCard}>
            <View style={styles.activityThumb}>
              <Image source={selectedMobby.image} resizeMode="contain" style={styles.activityMobby} />
            </View>
            <View style={styles.activityCopy}>
              <Text style={styles.activityTitle}>今日は何してるかな？</Text>
              <Text style={styles.activityText} numberOfLines={2}>{moment.text || `${DISPLAY_NAMES[selectedMobby.id]}のお部屋でまったりしてるみたい。`}</Text>
            </View>
            <CoralButton onPress={() => router.push('/build')}>部屋をのぞく ›</CoralButton>
          </View>

          <View style={styles.memoryRow}>
            <Text style={styles.memoryHint}>思い出 {memories.length}  /  80</Text>
            <Pressable accessibilityRole="button" onPress={() => { if (!recorded) recordMoment(); }} style={styles.memoryButton}>
              <Text style={styles.memoryButtonText}>{recorded ? '記録済み' : 'この瞬間を記録'}</Text>
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EED6A8' },
  background: { flex: 1, width: '100%', alignSelf: 'center', position: 'relative', overflow: 'hidden' },
  backgroundWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,245,215,0.52)' },
  screen: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', paddingHorizontal: 10, paddingTop: 5, paddingBottom: 4 },
  header: { height: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, gap: 5, borderBottomWidth: 1.5, borderBottomColor: 'rgba(187,136,83,0.35)' },
  logo: { width: 110, height: 55, marginLeft: -4 },
  avatarFrame: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#D8AB70', backgroundColor: '#FFF2D8', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatar: { width: 43, height: 43 },
  counters: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 },
  counter: { height: 37, minWidth: 74, flex: 1, maxWidth: 112, borderRadius: 19, borderWidth: 1.5, borderColor: '#DBB57E', backgroundColor: 'rgba(255,248,228,0.95)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, gap: 2 },
  counterIcon: { width: 23, height: 23 },
  counterValue: { flex: 1, color: MobbyColors.ink, fontSize: 13, fontWeight: '900', textAlign: 'center' },
  counterPlus: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFD8D1', alignItems: 'center', justifyContent: 'center' },
  counterPlusHoney: { backgroundColor: '#FFF0C4' },
  counterPlusIcon: { width: 15, height: 15 },
  headerIconButton: { width: 39, height: 45, borderRadius: 14, borderWidth: 1.5, borderColor: '#D4B07A', backgroundColor: 'rgba(255,247,224,0.88)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  headerIcon: { width: 25, height: 25 },
  notificationDot: { position: 'absolute', right: -3, top: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#F16F62', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFF5E0' },
  notificationText: { color: '#FFFDF6', fontSize: 11, fontWeight: '900' },
  quickNavHolder: { height: 120, position: 'relative', marginTop: 3, zIndex: 5 },
  quickNavAnimated: { overflow: 'hidden' },
  quickNavPanel: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 6, paddingTop: 7, paddingBottom: 8, borderRadius: 19, overflow: 'hidden' },
  quickItem: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', marginHorizontal: 1 },
  quickIconPlate: { width: 41, height: 55, borderRadius: 15, borderWidth: 1.2, borderColor: '#E8BE83', backgroundColor: 'rgba(255,249,232,0.92)', alignItems: 'center', justifyContent: 'center' },
  quickIcon: { width: 34, height: 34 },
  quickLabel: { color: MobbyColors.ink, fontSize: 9, fontWeight: '900', marginTop: 4, textAlign: 'center' },
  navToggle: { position: 'absolute', top: -7, left: '50%', marginLeft: -23, width: 46, height: 27, borderRadius: 22, backgroundColor: '#E8E9D2', borderWidth: 1.5, borderColor: '#BBC391', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  navToggleIcon: { width: 18, height: 18, tintColor: '#71825B' },
  carouselSection: { flex: 1, minHeight: 364, marginTop: 1 },
  activityCard: { height: 88, borderRadius: 21, borderWidth: 1.7, borderColor: '#D8AF79', backgroundColor: 'rgba(255,247,225,0.96)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, shadowColor: '#8B5B36', shadowOpacity: 0.16, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  activityThumb: { width: 74, height: 70, borderRadius: 16, overflow: 'hidden', backgroundColor: '#F2D8AF', alignItems: 'center', justifyContent: 'flex-end' },
  activityMobby: { width: 68, height: 68 },
  activityCopy: { flex: 1, minWidth: 0, paddingHorizontal: 8 },
  activityTitle: { color: MobbyColors.ink, fontSize: 14, fontWeight: '900' },
  activityText: { color: '#92704F', fontSize: 10, lineHeight: 15, fontWeight: '700', marginTop: 3 },
  coralButton: { width: 115, height: 48, overflow: 'hidden' },
  coralButtonImage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, backgroundColor: MobbyColors.coral, borderRadius: 18, borderWidth: 1.5, borderColor: MobbyColors.coralDark },
  coralButtonText: { color: '#FFF9E9', fontSize: 11, fontWeight: '900', textAlign: 'center' },
  memoryRow: { height: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 },
  memoryHint: { color: '#96704D', fontSize: 10, fontWeight: '800' },
  memoryButton: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(255,226,211,0.84)' },
  memoryButtonText: { color: MobbyColors.coralDark, fontSize: 9, fontWeight: '900' },
  pressed: { opacity: 0.72, transform: [{ translateY: 1 }] },
});
