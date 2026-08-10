import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from 'expo-asset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { MobbyPullMesh, type MobbyPullMeshHandle } from '@/components/MobbyPullMesh';
import { getMobby, type MobbyId } from '@/data/mobies';
import { PULL_ASSETS, type MobbyPullAsset, type PullFrame } from '@/data/mobbyPullAssets';
import { useMobbyAudio } from '@/hooks/useMobbyAudio';

type Screen = 'home' | 'collection' | 'time' | 'touch' | 'trade';
type ItemKind = 'ぬいキー' | 'ぬいぐるみ';
type MobbyTimeStage = 'arrived' | 'opening' | 'revealed' | 'placing' | 'placed';
type HomePlacementKind = 'wall' | 'shelf';

const DESIGN_WIDTH = 440;
const DESIGN_MIN_HEIGHT = 720;

type AppLayoutMetrics = {
  width: number;
  height: number;
  scale: number;
};

const AppLayoutContext = createContext<AppLayoutMetrics>({
  width: DESIGN_WIDTH,
  height: DESIGN_MIN_HEIGHT,
  scale: 1,
});

function useAppLayout() {
  return useContext(AppLayoutContext);
}

type Item = {
  id: string;
  name: string;
  kind: ItemKind;
  rarity: string;
  image: number;
  keyImage?: number;
  smallKeyImage?: number;
  accent: string;
};

const ROOM_BACKGROUND = require('../../assets/rooms/sunny-stitch-room.png');
const HOME_WALL_BACKGROUND = require('../../assets/backgrounds/home-room-rich-v2.png');
const HOME_GARLAND = require('../../assets/backgrounds/home-garland-trimmed-v1.png');
const COLLECTION_WALL_BACKGROUND = require('../../assets/backgrounds/home-wall.png');
const COLLECTION_DISPLAY_BOARD = require('../../assets/backgrounds/collection-display-board-v1.png');
const WOODEN_HOOK = require('../../assets/backgrounds/hook-transparent.png');
const PLUSH_SHELF_BASE = require('../../assets/backgrounds/plush-base-transparent.png');
const TRADE_EXCHANGE_BOARD = require('../../assets/backgrounds/trade-exchange-board.png');
const MOBBY_TIME_BOARD = require('../../assets/backgrounds/mobby-time-board.png');
const MOBBY_TIME_PACKAGE = require('../../assets/mobby-time-package.png');
const MOBBY_TIME_TIMER_PLAQUE = require('../../assets/mobby-time/timer-plaque.png');
const MOBBY_TIME_MESSAGE_PLAQUE = require('../../assets/mobby-time/message-plaque.png');
const MOBBY_TIME_REWARD_SEAL = require('../../assets/mobby-time/reward-seal.png');
const MOBBY_TIME_REVEAL_HALO = require('../../assets/mobby-time/reveal-halo.png');
const BELL = require('../../assets/home-ui/icons/bell.png');
const SPARKLES = require('../../assets/home-ui/icons/sparkles.png');
const HOUSE = require('../../assets/home-ui/icons/house.png');
const EXCHANGE = require('../../assets/home-ui/icons/exchange.png');
const MOBBY_ICON = require('../../assets/home-ui/icons/mobby.png');
const FRIEND = require('../../assets/home-ui/icons/friend.png');
const KEYCHAIN = {
  reomoby: require('../../assets/mobby-keychains/reomoby-key.png'),
  mobichi: require('../../assets/mobby-keychains/mobichi-key.png'),
  mobirin: require('../../assets/mobby-keychains/mobirin-key.png'),
  potemoby: require('../../assets/mobby-keychains/potemoby-key.png'),
  mobiyan: require('../../assets/mobby-keychains/mobiyan-key.png'),
  yami: require('../../assets/mobby-keychains/yami-key.png'),
  mobiyura: require('../../assets/mobby-keychains/mobiyura-key.png'),
  mobibou: require('../../assets/mobby-keychains/mobibou-key.png'),
  babumoby: require('../../assets/mobby-keychains/babumoby-key.png'),
} as const;

const KEYCHAIN_SMALL = {
  reomoby: require('../../assets/mobby-keychains/reomoby-key-s.png'),
  mobichi: require('../../assets/mobby-keychains/mobichi-key-s.png'),
  mobirin: require('../../assets/mobby-keychains/mobirin-key-s.png'),
  potemoby: require('../../assets/mobby-keychains/potemoby-key-s.png'),
  mobiyan: require('../../assets/mobby-keychains/mobiyan-key-s.png'),
  yami: require('../../assets/mobby-keychains/yami-key-s.png'),
  mobiyura: require('../../assets/mobby-keychains/mobiyura-key-s.png'),
  mobibou: require('../../assets/mobby-keychains/mobibou-key-s.png'),
  babumoby: require('../../assets/mobby-keychains/babumoby-key-s.png'),
} as const;

const PULL_REACTION_FRAMES: Partial<Record<MobbyId, readonly number[]>> = {
  mobibou: [
    require('../../assets/mobies/reactions/mobibou_pull_reaction_01_startled.webp'),
    require('../../assets/mobies/reactions/mobibou_pull_reaction_02_hold_cheek.webp'),
    require('../../assets/mobies/reactions/mobibou_pull_reaction_03_angry_protest.webp'),
    require('../../assets/mobies/reactions/mobibou_pull_reaction_04_sulking.webp'),
  ],
  mobiyura: [
    require('../../assets/mobies/reactions/mobiyura_pull_reaction_01_startled.webp'),
    require('../../assets/mobies/reactions/mobiyura_pull_reaction_02_hold_cheek.webp'),
    require('../../assets/mobies/reactions/mobiyura_pull_reaction_03_dramatic_protest.webp'),
    require('../../assets/mobies/reactions/mobiyura_pull_reaction_04_haughty_sulk.webp'),
  ],
  reomoby: [
    require('../../assets/mobies/reactions/reomoby_pull_reaction_01_startled.webp'),
    require('../../assets/mobies/reactions/reomoby_pull_reaction_02_hold_cheek.webp'),
    require('../../assets/mobies/reactions/reomoby_pull_reaction_03_aristocratic_protest.webp'),
    require('../../assets/mobies/reactions/reomoby_pull_reaction_04_haughty_sulk.webp'),
  ],
  mobirin: [
    require('../../assets/mobies/reactions/mobirin_mobirin_pull_reaction_01_startled.webp'),
    require('../../assets/mobies/reactions/mobirin_mobirin_pull_reaction_02_hold_cheek.webp'),
    require('../../assets/mobies/reactions/mobirin_mobirin_pull_reaction_03_indignant_protest.webp'),
    require('../../assets/mobies/reactions/mobirin_mobirin_pull_reaction_04_dignified_sulk.webp'),
  ],
  potemoby: [
    require('../../assets/mobies/reactions/potemoby_pote_pull_reaction_01_sleepy_startled.webp'),
    require('../../assets/mobies/reactions/potemoby_pote_pull_reaction_02_hold_cheek.webp'),
    require('../../assets/mobies/reactions/potemoby_pote_pull_reaction_03_lazy_protest.webp'),
    require('../../assets/mobies/reactions/potemoby_pote_pull_reaction_04_lazy_sulk.webp'),
  ],
  babumoby: [
    require('../../assets/mobies/reactions/babumoby_babu_pull_reaction_01_startled.webp'),
    require('../../assets/mobies/reactions/babumoby_babu_pull_reaction_02_hold_cheek.webp'),
    require('../../assets/mobies/reactions/babumoby_babu_pull_reaction_03_baby_protest.webp'),
    require('../../assets/mobies/reactions/babumoby_babu_pull_reaction_04_sulking.webp'),
  ],
  mobichi: [
    require('../../assets/mobies/reactions/mobichi_mobichi_pull_reaction_01_startled.webp'),
    require('../../assets/mobies/reactions/mobichi_mobichi_pull_reaction_02_hold_cheek.webp'),
    require('../../assets/mobies/reactions/mobichi_mobichi_pull_reaction_03_indignant_protest.webp'),
    require('../../assets/mobies/reactions/mobichi_mobichi_pull_reaction_04_dignified_sulk.webp'),
  ],
};
const DEFAULT_PULL_REACTION_PATTERN: 'single' | 'sequence' = 'single';

const ITEMS: Item[] = [
  { id: 'mobichi-key', name: 'もびち ぬいキー', kind: 'ぬいキー', rarity: 'R', image: require('../../assets/mobies/mobichi.webp'), keyImage: KEYCHAIN.mobichi, smallKeyImage: KEYCHAIN_SMALL.mobichi, accent: '#E79AA7' },
  { id: 'mobiyan-plush', name: 'もびやん ぬい', kind: 'ぬいぐるみ', rarity: 'SR', image: require('../../assets/mobies/mobiyan.webp'), keyImage: KEYCHAIN.mobiyan, smallKeyImage: KEYCHAIN_SMALL.mobiyan, accent: '#83B8C4' },
  { id: 'yami-key', name: '病みモビー ぬいキー', kind: 'ぬいキー', rarity: 'SSR', image: require('../../assets/mobies/yami-mobby.webp'), keyImage: KEYCHAIN.yami, smallKeyImage: KEYCHAIN_SMALL.yami, accent: '#A898C3' },
  { id: 'mobibou-plush', name: 'もびぼう ぬい', kind: 'ぬいぐるみ', rarity: 'R', image: require('../../assets/mobies/mobibou.webp'), keyImage: KEYCHAIN.mobibou, smallKeyImage: KEYCHAIN_SMALL.mobibou, accent: '#D99A62' },
  { id: 'mobirin-key', name: 'もびりん ぬいキー', kind: 'ぬいキー', rarity: 'N', image: require('../../assets/mobies/mobirin.webp'), keyImage: KEYCHAIN.mobirin, smallKeyImage: KEYCHAIN_SMALL.mobirin, accent: '#9EB8C5' },
  { id: 'mobiyura-plush', name: 'もびゆら ぬい', kind: 'ぬいぐるみ', rarity: 'SR', image: require('../../assets/mobies/mobiyura.webp'), keyImage: KEYCHAIN.mobiyura, smallKeyImage: KEYCHAIN_SMALL.mobiyura, accent: '#BCA6D4' },
  { id: 'reo-key', name: 'れおモビー ぬいキー', kind: 'ぬいキー', rarity: 'R', image: require('../../assets/mobies/reomoby.webp'), keyImage: KEYCHAIN.reomoby, smallKeyImage: KEYCHAIN_SMALL.reomoby, accent: '#D88E9F' },
  { id: 'pote-plush', name: 'ぽてもび ぬい', kind: 'ぬいぐるみ', rarity: 'N', image: require('../../assets/mobies/potemoby.webp'), keyImage: KEYCHAIN.potemoby, smallKeyImage: KEYCHAIN_SMALL.potemoby, accent: '#C49B72' },
  { id: 'babu-key', name: 'ばぶモビー ぬいキー', kind: 'ぬいキー', rarity: 'N', image: require('../../assets/mobies/babumoby.webp'), keyImage: KEYCHAIN.babumoby, smallKeyImage: KEYCHAIN_SMALL.babumoby, accent: '#E7AFC0' },
];

const ITEM_MOBBY_IDS: Record<string, MobbyId> = {
  'mobichi-key': 'mobichi',
  'mobiyan-plush': 'mobiyan',
  'yami-key': 'yami',
  'mobibou-plush': 'mobibou',
  'mobirin-key': 'mobirin',
  'mobiyura-plush': 'mobiyura',
  'reo-key': 'reomoby',
  'pote-plush': 'potemoby',
  'babu-key': 'babumoby',
};

// The source illustrations have slightly different transparent padding below
// their feet. Normalize that padding so every plush touches the same shelf
// edge instead of making some characters appear to float.
const PLUSH_VISIBLE_BOTTOM_RATIO: Record<string, number> = {
  'mobiyan-plush': 0.952,
  'mobibou-plush': 0.918,
  'mobiyura-plush': 0.909,
  'pote-plush': 0.888,
};
const PLUSH_CONTACT_REFERENCE = PLUSH_VISIBLE_BOTTOM_RATIO['mobiyan-plush'];

// Foreground anchors align with the three-by-three pegs and shelves on the
// collection display board. Keeping them in design-space coordinates makes
// every item stay attached while the responsive app canvas is scaled.
const COLLECTION_BOARD_TOP = 78;
const COLLECTION_COLUMN_X = [128, 220, 312] as const;
const COLLECTION_KEY_ROW_RATIOS = [0.149, 0.396, 0.665] as const;
const COLLECTION_PLUSH_SHELF_RATIOS = [0.324, 0.6, 0.871] as const;

const OPENING_KEY_DECORATIONS = [
  { itemIndex: 1, left: 18, top: 94, size: 78, fromY: 8, toY: -8, fromRotate: '-8deg', toRotate: '5deg', layer: 2 },
  { itemIndex: 6, left: 344, top: 88, size: 78, fromY: -7, toY: 8, fromRotate: '7deg', toRotate: '-5deg', layer: 2 },
  { itemIndex: 2, left: 58, top: 7, size: 64, fromY: 5, toY: -9, fromRotate: '-5deg', toRotate: '7deg', layer: 2 },
  { itemIndex: 7, left: 318, top: 12, size: 64, fromY: -8, toY: 5, fromRotate: '6deg', toRotate: '-6deg', layer: 2 },
  { itemIndex: 3, left: -4, top: 219, size: 72, fromY: 7, toY: -6, fromRotate: '-10deg', toRotate: '4deg', layer: 5 },
  { itemIndex: 8, left: 372, top: 222, size: 72, fromY: -6, toY: 8, fromRotate: '8deg', toRotate: '-4deg', layer: 5 },
  { itemIndex: 4, left: 60, top: 302, size: 66, fromY: 9, toY: -5, fromRotate: '-6deg', toRotate: '8deg', layer: 5 },
  { itemIndex: 5, left: 314, top: 296, size: 66, fromY: -7, toY: 7, fromRotate: '7deg', toRotate: '-7deg', layer: 5 },
] as const;

const INITIAL_OWNED: Record<string, number> = {
  'mobichi-key': 1,
  'mobiyan-plush': 1,
  'yami-key': 1,
  'mobibou-plush': 1,
  'mobirin-key': 1,
  'mobiyura-plush': 1,
  'reo-key': 1,
  'pote-plush': 1,
  'babu-key': 1,
};

const QR_PATTERN = [
  '1111111001011111111',
  '1000001011011000001',
  '1011101000011011101',
  '1011101011111011101',
  '1011101001011011101',
  '1000001010111000001',
  '1111111010101111111',
  '0000000011010000000',
  '1100111110111011001',
  '0011010011000101110',
  '1110101110111100101',
  '0100110001011011110',
  '1111111011101010011',
  '1000001010011110100',
  '1011101011110011111',
  '1011101001001010100',
  '1011101011011110101',
  '1000001000110011001',
  '1111111011011110111',
];

function Header({ onBell, soundEnabled, onToggleSound }: { onBell: () => void; soundEnabled: boolean; onToggleSound: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.brandWrap}><Text style={styles.brand}>MOBBY</Text><Text style={styles.brandSub}>collection</Text></View>
      <View style={styles.headerSpacer} />
      <View style={styles.headerActions}>
        <Pressable accessibilityRole="button" accessibilityLabel={soundEnabled ? 'サウンドをオフ' : 'サウンドをオン'} onPress={onToggleSound} style={[styles.soundButton, !soundEnabled && styles.soundButtonMuted]}>
          <Text style={[styles.soundButtonText, !soundEnabled && styles.soundButtonTextMuted]}>{soundEnabled ? '♫' : '×'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="お知らせ" onPress={onBell} style={styles.bellButton}>
          <Image source={BELL} resizeMode="contain" style={styles.bellIcon} />
          <View style={styles.bellBadge}><Text style={styles.bellBadgeText}>3</Text></View>
        </Pressable>
      </View>
    </View>
  );
}

function NotificationPopup({
  onClose,
  onOpenMobbyTime,
  onOpenCollection,
  onOpenTrade,
}: {
  onClose: () => void;
  onOpenMobbyTime: () => void;
  onOpenCollection: () => void;
  onOpenTrade: () => void;
}) {
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      speed: 18,
      bounciness: 7,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  return (
    <View style={styles.notificationOverlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="お知らせを閉じる" onPress={onClose} style={styles.notificationBackdrop} />
      <Animated.View
        accessibilityRole="alert"
        style={[
          styles.notificationPopup,
          {
            opacity: entrance,
            transform: [
              { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) },
              { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
            ],
          },
        ]}
      >
        <View style={styles.notificationPointer} />
        <View style={styles.notificationHeader}>
          <View>
            <Text style={styles.notificationTitle}>お知らせ</Text>
            <Text style={styles.notificationSubtitle}>モビーの部屋から3件届いています</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="閉じる" onPress={onClose} style={styles.notificationCloseButton}>
            <Text style={styles.notificationCloseText}>×</Text>
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="MOBBY TIMEのお知らせを開く" onPress={onOpenMobbyTime} style={({ pressed }) => [styles.notificationItem, styles.notificationItemFeatured, pressed && styles.notificationItemPressed]}>
          <View style={[styles.notificationIcon, styles.notificationIconTime]}><Text style={styles.notificationIconText}>✦</Text></View>
          <View style={styles.notificationCopy}>
            <View style={styles.notificationItemHeading}><Text style={styles.notificationKicker}>MOBBY TIME</Text><View style={styles.notificationLiveBadge}><Text style={styles.notificationLiveText}>いま</Text></View></View>
            <Text style={styles.notificationItemTitle}>モビーが届いてる…！</Text>
            <Text style={styles.notificationItemBody}>30分以内に箱を開けてね</Text>
          </View>
          <Text style={styles.notificationChevron}>›</Text>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="コレクションのお知らせを開く" onPress={onOpenCollection} style={({ pressed }) => [styles.notificationItem, pressed && styles.notificationItemPressed]}>
          <View style={[styles.notificationIcon, styles.notificationIconCollection]}><Text style={styles.notificationIconText}>♡</Text></View>
          <View style={styles.notificationCopy}>
            <Text style={styles.notificationKicker}>COLLECTION</Text>
            <Text style={styles.notificationItemTitle}>新しい飾り方ができるよ</Text>
            <Text style={styles.notificationItemBody}>壁と棚の配置を見てみよう</Text>
          </View>
          <Text style={styles.notificationChevron}>›</Text>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="トレードのお知らせを開く" onPress={onOpenTrade} style={({ pressed }) => [styles.notificationItem, pressed && styles.notificationItemPressed]}>
          <View style={[styles.notificationIcon, styles.notificationIconTrade]}><Text style={styles.notificationIconText}>♧</Text></View>
          <View style={styles.notificationCopy}>
            <Text style={styles.notificationKicker}>TRADE</Text>
            <Text style={styles.notificationItemTitle}>フレンドと交換しよう</Text>
            <Text style={styles.notificationItemBody}>MOBBY TIME中は交換チャンス！</Text>
          </View>
          <Text style={styles.notificationChevron}>›</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function OpeningScreen({ onBegin, onStart }: { onBegin: () => void; onStart: () => void }) {
  const intro = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const haloTurn = useRef(new Animated.Value(0)).current;
  const startPulse = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const [leaving, setLeaving] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const itemAssets = ITEMS.flatMap((item) => [item.image, item.keyImage, item.smallKeyImage].filter((asset): asset is number => typeof asset === 'number'));
    Asset.loadAsync([HOME_WALL_BACKGROUND, HOME_GARLAND, PLUSH_SHELF_BASE, WOODEN_HOOK, ...itemAssets])
      .catch(() => undefined)
      .finally(() => { if (mounted) setAssetsReady(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const introAnimation = Animated.timing(intro, { toValue: 1, duration: 780, easing: Easing.out(Easing.back(1.25)), useNativeDriver: true });
    const bobLoop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 1150, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 1150, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const floatLoop = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 1650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 1650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const haloLoop = Animated.loop(Animated.timing(haloTurn, { toValue: 1, duration: 18000, easing: Easing.linear, useNativeDriver: true }));
    const pulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(startPulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(startPulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    introAnimation.start();
    bobLoop.start();
    floatLoop.start();
    haloLoop.start();
    pulseLoop.start();
    return () => {
      introAnimation.stop();
      bobLoop.stop();
      floatLoop.stop();
      haloLoop.stop();
      pulseLoop.stop();
    };
  }, [bob, float, haloTurn, intro, startPulse]);

  const startGame = useCallback(() => {
    if (leaving) return;
    onBegin();
    setLeaving(true);
    Animated.timing(exit, { toValue: 1, duration: 430, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
      if (finished) onStart();
    });
  }, [exit, leaving, onBegin, onStart]);

  const mobbyTranslateY = Animated.add(
    intro.interpolate({ inputRange: [0, 1], outputRange: [58, 0] }),
    bob.interpolate({ inputRange: [0, 1], outputRange: [4, -7] }),
  );
  return (
    <Animated.View style={[styles.openingScreen, { opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.055] }) }] }]}>
      <Image source={ROOM_BACKGROUND} resizeMode="cover" style={styles.openingBackdrop} />
      <Animated.View style={[styles.openingTitleWrap, { opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }] }]}>
        <ImageBackground source={MOBBY_TIME_TIMER_PLAQUE} resizeMode="contain" style={styles.openingTitlePlaque}>
          <Text style={styles.openingTitle}>MOBBY</Text>
          <Text style={styles.openingTitleSub}>C O L L E C T I O N</Text>
        </ImageBackground>
        <Text style={styles.openingTagline}>モビーたちと、毎日を飾ろう。</Text>
      </Animated.View>
      <View style={styles.openingScene}>
        <Animated.Image source={MOBBY_TIME_REVEAL_HALO} resizeMode="contain" style={[styles.openingHalo, { opacity: intro, transform: [{ rotate: haloTurn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }, { scale: bob.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.03] }) }] }]} />
        {OPENING_KEY_DECORATIONS.map((decoration, index) => {
          const motion = index % 2 === 0 ? float : bob;
          const item = ITEMS[decoration.itemIndex];
          return (
            <Animated.Image
              key={`opening-key-${item.id}`}
              source={item.keyImage ?? item.image}
              resizeMode="contain"
              style={[
                styles.openingKeyDecoration,
                {
                  left: decoration.left,
                  top: decoration.top,
                  width: decoration.size,
                  height: decoration.size * 1.18,
                  zIndex: decoration.layer,
                  opacity: intro,
                  transform: [
                    { translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [decoration.fromY, decoration.toY] }) },
                    { rotate: motion.interpolate({ inputRange: [0, 1], outputRange: [decoration.fromRotate, decoration.toRotate] }) },
                    { scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.58, 1] }) },
                  ],
                },
              ]}
            />
          );
        })}
        <Animated.Image source={ITEMS[0].image} resizeMode="contain" style={[styles.openingMobby, { opacity: intro, transform: [{ translateY: mobbyTranslateY }, { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-1.5deg', '1.5deg'] }) }, { scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }] }]} />
        <Animated.Image source={MOBBY_TIME_PACKAGE} resizeMode="contain" style={[styles.openingPackage, { opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }, { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-1.6deg', '1.6deg'] }) }] }]} />
        <Animated.Text style={[styles.openingSparkle, styles.openingSparkleOne, { opacity: float }]}>✦</Animated.Text>
        <Animated.Text style={[styles.openingSparkle, styles.openingSparkleTwo, { opacity: bob }]}>✧</Animated.Text>
        <Animated.Text style={[styles.openingSparkle, styles.openingSparkleThree, { opacity: float.interpolate({ inputRange: [0, 1], outputRange: [0.28, 1] }) }]}>✦</Animated.Text>
      </View>
      <Animated.View style={[styles.openingStartWrap, { opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [25, 0] }) }, { scale: startPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) }] }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={assetsReady ? 'タップしてスタート' : '読み込み中'} disabled={leaving || !assetsReady} onPress={startGame} style={({ pressed }) => [styles.openingStartButton, !assetsReady && styles.openingStartLoading, pressed && styles.openingStartPressed]}>
          <ImageBackground source={MOBBY_TIME_MESSAGE_PLAQUE} resizeMode="contain" style={styles.openingStartPlaque}>
            <Text style={styles.openingStartTitle}>{assetsReady ? 'TAP TO START' : 'LOADING…'}</Text>
            <Text style={styles.openingStartSub}>{assetsReady ? 'モビーの部屋へ' : 'モビーたちを呼んでいます'}</Text>
          </ImageBackground>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function HomeScreen({
  selected,
  onSelect,
  hiddenWallItemId,
  wallItemIds,
  plushItemIds,
  onSwapWallItems,
  onSwapPlushItems,
  onUiTap,
  onInteract,
  reaction,
}: {
  selected: Item;
  onSelect: (id: string) => void;
  hiddenWallItemId?: string;
  wallItemIds: string[];
  plushItemIds: string[];
  onSwapWallItems: (fromIndex: number, toIndex: number) => void;
  onSwapPlushItems: (fromIndex: number, toIndex: number) => void;
  onUiTap: () => void;
  onInteract: (kind: string) => void;
  reaction: string;
}) {
  const { height: appHeight } = useAppLayout();
  const compactViewport = appHeight < 780;
  const [roomSize, setRoomSize] = useState({ width: 0, height: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editSelection, setEditSelection] = useState<{ kind: HomePlacementKind; index: number; itemId: string } | null>(null);
  const [editFeedback, setEditFeedback] = useState('');
  const handleRoomLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setRoomSize((previous) => {
      if (Math.abs(previous.width - width) < 0.5 && Math.abs(previous.height - height) < 0.5) return previous;
      return { width, height };
    });
  }, []);
  const plushImageSize = useMemo(() => {
    // Keep the plush proportionate to both the room width and the shelf
    // height. This makes the feet stay inside the base on narrow phones and
    // wider desktop previews alike.
    const roomWidth = roomSize.width || 440;
    const roomHeight = roomSize.height || 646;
    const itemWidth = roomWidth * 0.84 * 0.22;
    const shelfHeight = roomHeight * 0.18;
    // Use most of each four-column slot so the plush read larger while
    // retaining a small, even gap between neighboring characters.
    const width = Math.min(itemWidth * 1.04, shelfHeight * 0.92);
    return { width, height: width * 1.14 };
  }, [roomSize.height, roomSize.width]);
  const shelfSurfaceY = useMemo(() => {
    const roomWidth = roomSize.width || 440;
    const roomHeight = roomSize.height || 646;
    const renderedBaseHeight = Math.min(roomHeight, roomWidth * 1.5);
    return roomHeight * 0.35 + renderedBaseHeight * (1112 / 1536 - 0.5);
  }, [roomSize.height, roomSize.width]);
  const wallItems = wallItemIds.map((id) => ITEMS.find((item) => item.id === id)).filter((item): item is Item => Boolean(item));
  const plushItems = plushItemIds.map((id) => ITEMS.find((item) => item.id === id)).filter((item): item is Item => Boolean(item));
  const selectedIndex = Math.max(0, ITEMS.findIndex((item) => item.id === selected.id));
  const selectRelative = (offset: number) => {
    const nextIndex = (selectedIndex + offset + ITEMS.length) % ITEMS.length;
    onSelect(ITEMS[nextIndex].id);
  };
  const toggleEditing = () => {
    onUiTap();
    setIsEditing((current) => !current);
    setEditSelection(null);
    setEditFeedback('');
  };
  const handleDecorationPress = (kind: HomePlacementKind, index: number, item: Item) => {
    onUiTap();
    if (!isEditing) {
      onSelect(item.id);
      return;
    }
    if (!editSelection || editSelection.kind !== kind) {
      setEditSelection({ kind, index, itemId: item.id });
      setEditFeedback('');
      return;
    }
    if (editSelection.index === index) {
      setEditSelection(null);
      return;
    }
    if (kind === 'wall') onSwapWallItems(editSelection.index, index);
    else onSwapPlushItems(editSelection.index, index);
    setEditSelection(null);
    setEditFeedback(kind === 'wall' ? 'ぬいキーの掛け場所を変更しました' : 'ぬいぐるみの置き場所を変更しました');
  };
  const editInstruction = editSelection
    ? `${ITEMS.find((item) => item.id === editSelection.itemId)?.name ?? 'アイテム'}の${editSelection.kind === 'wall' ? '掛け先' : '置き先'}を選んでください`
    : editFeedback || '動かしたいぬいキー・ぬいぐるみを選んでください';
  return (
    <View style={styles.homeScreenBackground}>
      <View style={styles.homeRoom} onLayout={handleRoomLayout}>
        <Image source={PLUSH_SHELF_BASE} resizeMode="contain" style={styles.homeShelfBase} />
        <Image source={HOME_GARLAND} resizeMode="contain" style={styles.homeGarland} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isEditing ? 'ホーム編集を完了' : 'ホームを編集'}
          onPress={toggleEditing}
          style={({ pressed }) => [styles.homeEditButton, isEditing && styles.homeEditButtonActive, pressed && styles.homeSelectablePressed]}
        >
          <Text style={[styles.homeEditButtonText, isEditing && styles.homeEditButtonTextActive]}>{isEditing ? '✓ 完了' : '✎ 編集'}</Text>
        </Pressable>
        <View style={styles.homeWallKeys}>
          {wallItems.map((item, index) => {
            const name = item.name.replace(' ぬいキー', '').replace(' ぬい', '');
            const isEditSelected = editSelection?.kind === 'wall' && editSelection.index === index;
            const isEditTarget = editSelection?.kind === 'wall' && editSelection.index !== index;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={isEditing ? `${name}、壁フック${index + 1}` : `${name}をメインモビーにする`}
                onPress={() => handleDecorationPress('wall', index, item)}
                style={({ pressed }) => [
                  styles.homeWallKey,
                  !isEditing && item.id === selected.id && styles.homeWallKeySelected,
                  isEditing && styles.homeDecorationEditable,
                  isEditTarget && styles.homeDecorationTarget,
                  isEditSelected && styles.homeDecorationEditSelected,
                  item.id === hiddenWallItemId && styles.homeWallKeyHidden,
                  pressed && styles.homeSelectablePressed,
                ]}
              >
                <Image source={WOODEN_HOOK} resizeMode="contain" style={styles.homeWallHook} />
                <Image source={item.keyImage ?? item.image} resizeMode="contain" style={styles.homeWallKeyImage} />
                {isEditing ? <View style={styles.homeSlotBadge}><Text style={styles.homeSlotBadgeText}>{index + 1}</Text></View> : null}
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.homePlushShelf, { top: shelfSurfaceY - (roomSize.height || 646) * 0.18 }]}>
          {plushItems.map((item, index) => {
            // All four plush source files are square. With resizeMode="contain"
            // the actual bitmap is therefore the shorter side of this canvas.
            const renderedImageHeight = Math.min(plushImageSize.width, plushImageSize.height);
            const containTopInset = (plushImageSize.height - renderedImageHeight) / 2;
            const visibleBottomRatio = PLUSH_VISIBLE_BOTTOM_RATIO[item.id] ?? PLUSH_CONTACT_REFERENCE;
            const visibleFootBottom = containTopInset + renderedImageHeight * visibleBottomRatio;
            const canvasPixelsBelowFeet = plushImageSize.height - visibleFootBottom;
            const isEditSelected = editSelection?.kind === 'shelf' && editSelection.index === index;
            const isEditTarget = editSelection?.kind === 'shelf' && editSelection.index !== index;

            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={isEditing ? `${item.name.replace(' ぬい', '')}、土台${index + 1}` : `${item.name.replace(' ぬい', '')}をメインモビーにする`}
                onPress={() => handleDecorationPress('shelf', index, item)}
                style={({ pressed }) => [
                  styles.homePlushItem,
                  !isEditing && item.id === selected.id && styles.homePlushItemSelected,
                  isEditing && styles.homeDecorationEditable,
                  isEditTarget && styles.homeDecorationTarget,
                  isEditSelected && styles.homeDecorationEditSelected,
                  pressed && styles.homeSelectablePressed,
                ]}
              >
                <Image
                  source={item.image}
                  resizeMode="contain"
                  style={[
                    styles.homePlushImage,
                    plushImageSize,
                    {
                      // Move the image canvas down by exactly the rendered
                      // pixels below the feet. The visible foot bottom then
                      // lands on the shelf artwork's top edge.
                      bottom: -canvasPixelsBelowFeet,
                    },
                  ]}
                />
                {isEditing ? <View style={[styles.homeSlotBadge, styles.homePlushSlotBadge]}><Text style={styles.homeSlotBadgeText}>{index + 1}</Text></View> : null}
              </Pressable>
            );
          })}
        </View>
        {!isEditing ? <View style={[styles.homeCharacterPicker, compactViewport && styles.homeCharacterPickerCompact]}>
          <Pressable accessibilityRole="button" accessibilityLabel="前のモビー" onPress={() => selectRelative(-1)} style={styles.homeCharacterArrow}><Text style={styles.homeCharacterArrowText}>‹</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="次のモビー" onPress={() => selectRelative(1)} style={styles.homeCharacterArrow}><Text style={styles.homeCharacterArrowText}>›</Text></Pressable>
        </View> : null}
        {isEditing ? (
          <Image source={selected.image} resizeMode="contain" style={[styles.homeMainCharacter, compactViewport && styles.homeMainCharacterCompact, styles.homeMainCharacterEditing]} />
        ) : (
          <View style={[styles.homeMainCharacter, styles.homeMainCharacterPullable, compactViewport && styles.homeMainCharacterCompact]}>
            <PullableMobby selected={selected} size={compactViewport ? 178 : 220} onPull={() => onInteract('ほっぺ')} />
          </View>
        )}
        {!isEditing && reaction ? <View pointerEvents="none" style={[styles.homeReactionBubble, { top: shelfSurfaceY + 4 }]}><View style={styles.homeReactionTailBorder} /><View style={styles.homeReactionTail} /><Text style={styles.homeReactionBubbleText}>{reaction}</Text></View> : null}
        {isEditing ? <View style={styles.homeEditGuide}><Text style={styles.homeEditGuideTitle}>お部屋を編集</Text><Text style={styles.homeEditGuideText}>{editInstruction}</Text></View> : null}
      </View>
    </View>
  );
}

function WallPlacementFlight({ item, onComplete }: { item: Item; onComplete: () => void }) {
  const { width, height } = useAppLayout();
  const progress = useRef(new Animated.Value(0)).current;
  const appWidth = width;
  const roomHeight = Math.max(520, height - 74);
  const itemIndex = Math.max(0, ITEMS.findIndex((candidate) => candidate.id === item.id));
  const row = Math.floor(itemIndex / 5);
  const column = itemIndex % 5;
  const targetCenterX = appWidth * (0.1431 + column * 0.17845);
  const targetCenterY = 74 + roomHeight * 0.07 + row * roomHeight * 0.1849 + 53;
  const startCenterX = appWidth / 2;
  const startCenterY = height * 0.55;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.timing(progress, { toValue: 0.18, duration: 360, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: 1550, useNativeDriver: true }),
      Animated.delay(650),
    ]);
    animation.start(({ finished }) => { if (finished) onComplete(); });
    return () => animation.stop();
  }, [onComplete, progress]);

  const flightX = progress.interpolate({ inputRange: [0, 0.18, 1], outputRange: [startCenterX - 42, startCenterX - 42, targetCenterX - 42] });
  const flightY = progress.interpolate({ inputRange: [0, 0.18, 0.68, 1], outputRange: [startCenterY - 46, startCenterY - 92, targetCenterY - 92, targetCenterY - 46] });

  return (
    <View pointerEvents="none" style={styles.wallFlightOverlay}>
      <View style={styles.wallFlightStatus}><Text style={styles.wallFlightStatusText}>ぬいキーが壁へ移動中…</Text></View>
      <Animated.View style={[styles.wallFlightTrail, { opacity: progress.interpolate({ inputRange: [0, 0.18, 0.82, 1], outputRange: [0, 0.92, 0.72, 0] }), transform: [{ translateX: flightX }, { translateY: flightY }, { scale: progress.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0.6, 1.25, 0.85] }) }] }]} />
      <Animated.View style={[styles.wallFlightItem, { transform: [
        { translateX: flightX },
        { translateY: flightY },
        { scale: progress.interpolate({ inputRange: [0, 0.18, 0.82, 1], outputRange: [1.35, 1.55, 1.08, 1] }) },
        { rotate: progress.interpolate({ inputRange: [0, 0.45, 0.75, 1], outputRange: ['-7deg', '8deg', '-4deg', '0deg'] }) },
      ] }]}>
        <Image source={item.keyImage ?? item.image} resizeMode="contain" style={styles.wallFlightImage} />
      </Animated.View>
      <Animated.View style={[styles.wallLandingBurst, { left: targetCenterX - 38, top: targetCenterY - 38, opacity: progress.interpolate({ inputRange: [0, 0.82, 1], outputRange: [0, 0, 1] }), transform: [{ scale: progress.interpolate({ inputRange: [0, 0.82, 1], outputRange: [0.3, 0.3, 1.35] }) }] }]}><Text style={styles.wallLandingBurstText}>✦</Text></Animated.View>
    </View>
  );
}

type KeychainSwing = (direction: number) => void;
type KeychainPanEvent = { nativeEvent?: { pageX?: number; pageY?: number; locationX?: number; locationY?: number }; pageX?: number; pageY?: number; clientX?: number; clientY?: number };
type KeychainGesture = { dx: number; dy: number };
type KeychainImageSize = 'normal' | 'small';

type KeychainTileProps = {
  item: Item | null;
  owned: Record<string, number>;
  selectedId: string;
  onSelect: (id: string) => void;
  imageSize?: KeychainImageSize;
  placement?: { left: number; top: number };
  gestureManaged?: boolean;
  onSwingReady?: (id: string, swing: KeychainSwing | null) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  onGestureStart?: (event: KeychainPanEvent) => void;
  onGestureMove?: (event: KeychainPanEvent, gesture: KeychainGesture) => void;
  onGestureEnd?: () => void;
};

function KeychainTile({ item, owned, selectedId, onSelect, imageSize = 'normal', placement, gestureManaged = false, onSwingReady, onLayout, onGestureStart, onGestureMove, onGestureEnd }: KeychainTileProps) {
  const ownedCount = item ? (owned[item.id] ?? 0) : 0;
  const rotation = useRef(new Animated.Value(0)).current;
  const swing = useCallback((direction: number) => {
    Animated.sequence([
      Animated.timing(rotation, { toValue: direction, duration: 70, useNativeDriver: true }),
      Animated.timing(rotation, { toValue: -direction * 0.82, duration: 130, useNativeDriver: true }),
      Animated.timing(rotation, { toValue: direction * 0.58, duration: 110, useNativeDriver: true }),
      Animated.spring(rotation, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 8 }),
    ]).start();
  }, [rotation]);
  useEffect(() => {
    if (!item || !onSwingReady) return undefined;
    onSwingReady(item.id, swing);
    return () => onSwingReady(item.id, null);
  }, [item, onSwingReady, swing]);
  const panResponder = useMemo(() => {
    const shouldSwipe = (gesture: { dx: number; dy: number }) => ownedCount > 0 && (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5);
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_event, gesture) => shouldSwipe(gesture),
      onMoveShouldSetPanResponderCapture: (_event, gesture) => shouldSwipe(gesture),
      onPanResponderGrant: (event) => {
        rotation.stopAnimation();
        onGestureStart?.(event);
      },
      onPanResponderMove: (event, gesture) => {
        const dx = Math.max(-48, Math.min(48, gesture.dx));
        rotation.setValue(dx / 48);
        onGestureMove?.(event, gesture);
      },
      onPanResponderRelease: (_event, gesture) => {
        if (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5) swing(gesture.dx < 0 ? -1 : 1);
        else rotation.setValue(0);
        onGestureEnd?.();
      },
      onPanResponderTerminate: (_event, gesture) => {
        if (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5) swing(gesture.dx < 0 ? -1 : 1);
        else rotation.setValue(0);
        onGestureEnd?.();
      },
    });
  }, [onGestureEnd, onGestureMove, onGestureStart, ownedCount, rotation, swing]);
  const sway = rotation.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-18deg', '0deg', '18deg'] });
  const name = item ? item.name.replace(' ぬいキー', '').replace(' ぬい', '') : '未発見';
  const keyImage = imageSize === 'small' ? item?.smallKeyImage ?? item?.keyImage ?? item?.image : item?.keyImage ?? item?.smallKeyImage ?? item?.image;
  const localPanHandlers = !gestureManaged && item && ownedCount > 0 ? panResponder.panHandlers : {};
  return (
    <Animated.View {...localPanHandlers} onLayout={onLayout} style={[styles.collectionKeyItem, placement && styles.collectionKeyItemAnchored, placement]}>
      <Pressable focusable={false} onPress={() => { if (item && ownedCount > 0) { onSelect(item.id); swing(1); } }} style={styles.collectionKeyPressable} accessibilityRole="button" accessibilityLabel={`${name}${imageSize === 'small' ? ' Sサイズ' : ' 通常サイズ'}を揺らす`}>
        <Animated.View style={[styles.collectionKeySwing, { transform: [{ rotate: sway }] }]}>
          <View style={[styles.collectionKeyHook, item && ownedCount > 0 && styles.collectionKeyHookOwned]}>{item && ownedCount <= 0 ? <><View style={styles.collectionKeyRing} /><View style={styles.collectionKeyStem} /></> : null}</View>
          <View style={[styles.collectionKeyBody, item && ownedCount > 0 && styles.collectionKeyBodyOwned, item && selectedId === item.id && styles.collectionKeySelected]}>{item && ownedCount > 0 ? <Image source={keyImage} resizeMode="contain" style={styles.collectionKeyImage} /> : <View style={styles.collectionLocked}><Text style={styles.collectionLockedText}>?</Text></View>}</View>
        </Animated.View>
        <Text style={styles.collectionKeyName} numberOfLines={1}>{name}</Text>
      </Pressable>
    </Animated.View>
  );
}

type KeychainGridProps = {
  items: (Item | null)[];
  owned: Record<string, number>;
  selectedId: string;
  onSelect: (id: string) => void;
  imageSize: KeychainImageSize;
  boardHeight: number;
};

type TileFrame = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

function KeychainGrid({ items, owned, selectedId, onSelect, imageSize, boardHeight }: KeychainGridProps) {
  const { scale: appScale } = useAppLayout();
  const tileFrames = useRef<Record<string, TileFrame>>({});
  const tileSwings = useRef<Record<string, KeychainSwing>>({});
  const touchedTiles = useRef(new Set<string>());
  const previousPoint = useRef<Point | null>(null);
  const pointerActive = useRef(false);
  const gridOrigin = useRef<Point>({ x: 0, y: 0 });
  const gridRef = useRef<View>(null);

  const registerSwing = useCallback((id: string, swing: KeychainSwing | null) => {
    if (swing) tileSwings.current[id] = swing;
    else delete tileSwings.current[id];
  }, []);

  const registerFrame = useCallback((id: string, event: LayoutChangeEvent) => {
    tileFrames.current[id] = event.nativeEvent.layout;
  }, []);

  const updateGridOrigin = useCallback(() => {
    gridRef.current?.measureInWindow((x, y) => {
      gridOrigin.current = { x, y };
    });
  }, []);

  useEffect(() => {
    updateGridOrigin();
  }, [updateGridOrigin]);

  const pointFromEvent = useCallback((event: KeychainPanEvent): Point => {
    const nativeEvent = event.nativeEvent ?? event;
    const pageX = nativeEvent.pageX ?? event.pageX ?? event.clientX;
    const pageY = nativeEvent.pageY ?? event.pageY ?? event.clientY;
    const locationX = event.nativeEvent?.locationX;
    const locationY = event.nativeEvent?.locationY;
    if (typeof pageX === 'number' && Number.isFinite(pageX) && typeof pageY === 'number' && Number.isFinite(pageY)) {
      return { x: (pageX - gridOrigin.current.x) / appScale, y: (pageY - gridOrigin.current.y) / appScale };
    }
    return { x: (locationX ?? 0) / appScale, y: (locationY ?? 0) / appScale };
  }, [appScale]);

  const frameContains = useCallback((point: Point, frame: TileFrame) => {
    const padding = 18;
    return point.x >= frame.x - padding && point.x <= frame.x + frame.width + padding && point.y >= frame.y - padding && point.y <= frame.y + frame.height + padding;
  }, []);

  const segmentTouchesFrame = useCallback((from: Point, to: Point, frame: TileFrame) => {
    const padding = 18;
    const left = frame.x - padding;
    const right = frame.x + frame.width + padding;
    const top = frame.y - padding;
    const bottom = frame.y + frame.height + padding;
    return Math.max(from.x, to.x) >= left && Math.min(from.x, to.x) <= right && Math.max(from.y, to.y) >= top && Math.min(from.y, to.y) <= bottom;
  }, []);

  const animateTouched = useCallback((from: Point | null, to: Point, direction: number) => {
    Object.entries(tileFrames.current).forEach(([id, frame]) => {
      if (touchedTiles.current.has(id)) return;
      const touched = frameContains(to, frame) || (from ? segmentTouchesFrame(from, to, frame) : false);
      if (!touched) return;
      touchedTiles.current.add(id);
      tileSwings.current[id]?.(direction);
    });
  }, [frameContains, segmentTouchesFrame]);

  const resetGesture = useCallback(() => {
    touchedTiles.current.clear();
    previousPoint.current = null;
  }, []);

  const beginGesture = useCallback((event: KeychainPanEvent) => {
    touchedTiles.current.clear();
    updateGridOrigin();
    const point = pointFromEvent(event);
    const originTile = Object.entries(tileFrames.current).find(([, frame]) => frameContains(point, frame));
    if (originTile) touchedTiles.current.add(originTile[0]);
    previousPoint.current = point;
  }, [frameContains, pointFromEvent, updateGridOrigin]);

  const moveGesture = useCallback((event: KeychainPanEvent, gesture: KeychainGesture) => {
    const point = pointFromEvent(event);
    animateTouched(previousPoint.current, point, gesture.dx < 0 ? -1 : 1);
    previousPoint.current = point;
  }, [animateTouched, pointFromEvent]);

  const handlePointerDown = useCallback((event: KeychainPanEvent) => {
    pointerActive.current = true;
    beginGesture(event);
  }, [beginGesture]);

  const handlePointerMove = useCallback((event: KeychainPanEvent) => {
    if (!pointerActive.current) return;
    const point = pointFromEvent(event);
    const previous = previousPoint.current;
    if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) > 2) {
      animateTouched(previous, point, point.x < previous.x ? -1 : 1);
    }
    previousPoint.current = point;
  }, [animateTouched, pointFromEvent]);

  const handlePointerEnd = useCallback(() => {
    pointerActive.current = false;
    resetGesture();
  }, [resetGesture]);

  const mouseActive = useRef(false);
  const handleMouseDown = useCallback((event: KeychainPanEvent) => {
    mouseActive.current = true;
    beginGesture(event);
  }, [beginGesture]);

  const handleMouseMove = useCallback((event: KeychainPanEvent) => {
    if (!mouseActive.current) return;
    const point = pointFromEvent(event);
    const previous = previousPoint.current;
    if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) > 2) {
      animateTouched(previous, point, point.x < previous.x ? -1 : 1);
    }
    previousPoint.current = point;
  }, [animateTouched, pointFromEvent]);

  const handleMouseEnd = useCallback(() => {
    mouseActive.current = false;
    resetGesture();
  }, [resetGesture]);

  return (
    <View ref={gridRef} onLayout={updateGridOrigin} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd} onPointerCancel={handlePointerEnd} {...(Platform.OS === 'web' ? { onMouseDown: handleMouseDown, onMouseMove: handleMouseMove, onMouseUp: handleMouseEnd } as any : {})} style={styles.keyCollectionGrid}>
      {items.map((item, index) => (
        <KeychainTile
          key={`key-${item?.id ?? 'locked'}-${index}`}
          item={item}
          owned={owned}
          selectedId={selectedId}
          onSelect={onSelect}
          imageSize={imageSize}
          placement={{
            left: COLLECTION_COLUMN_X[index % 3] - 41,
            top: COLLECTION_BOARD_TOP + COLLECTION_KEY_ROW_RATIOS[Math.floor(index / 3)] * boardHeight,
          }}
          onSwingReady={registerSwing}
          onLayout={item ? (event) => registerFrame(item.id, event) : undefined}
          onGestureStart={beginGesture}
          onGestureMove={moveGesture}
          onGestureEnd={resetGesture}
        />
      ))}
    </View>
  );
}

function getPlushCollectionPlacement(index: number, boardHeight: number) {
  const columnX = COLLECTION_COLUMN_X[index % 3];
  const shelfRatio = COLLECTION_PLUSH_SHELF_RATIOS[Math.floor(index / 3)] ?? COLLECTION_PLUSH_SHELF_RATIOS[2];
  const shelfY = COLLECTION_BOARD_TOP + shelfRatio * boardHeight;
  return { left: columnX - 44, top: shelfY - 96 };
}

function getPlushCollectionImageBottom(item: Item) {
  const imageWidth = 88;
  const imageHeight = 96;
  const renderedImageHeight = Math.min(imageWidth, imageHeight);
  const containTopInset = (imageHeight - renderedImageHeight) / 2;
  const visibleBottomRatio = PLUSH_VISIBLE_BOTTOM_RATIO[item.id] ?? PLUSH_CONTACT_REFERENCE;
  const visibleFootBottom = containTopInset + renderedImageHeight * visibleBottomRatio;
  return -(imageHeight - visibleFootBottom);
}

function CollectionScreen({ items, owned, selectedId, onSelect }: { items: Item[]; owned: Record<string, number>; selectedId: string; onSelect: (id: string) => void }) {
  const { height: appHeight } = useAppLayout();
  const [mode, setMode] = useState<ItemKind>('ぬいキー');
  const [keyImageSize, setKeyImageSize] = useState<KeychainImageSize>('normal');
  const visibleItems = items;
  const slotCount = 9;
  const displayItems: (Item | null)[] = [...visibleItems, ...Array.from({ length: Math.max(0, slotCount - visibleItems.length) }, () => null)];
  const ownedCount = visibleItems.filter((item) => (owned[item.id] ?? 0) > 0).length;
  const completionPercent = Math.round((ownedCount / (mode === 'ぬいキー' ? 40 : 30)) * 100);
  const title = mode === 'ぬいキー' ? `ぬいキー（${keyImageSize === 'small' ? 'Sサイズ' : '通常サイズ'}）` : 'ぬいぐるみ';
  const boardHeight = Math.min(640, Math.max(420, appHeight - 302));
  return (
    <View style={styles.collectionScreenBackground}>
      <View style={styles.collectionScrollContent}>
      <View pointerEvents="none" style={[styles.collectionBoardShadow, { height: boardHeight - 10 }]} />
      <Image source={COLLECTION_DISPLAY_BOARD} resizeMode="stretch" style={[styles.collectionDisplayBoard, { height: boardHeight }]} />
      <View style={styles.collectionHeaderBar}><Pressable onPress={() => setMode(mode === 'ぬいキー' ? 'ぬいぐるみ' : 'ぬいキー')} style={styles.backButton}><Text style={styles.backButtonText}>‹</Text></Pressable><Text style={styles.collectionHeaderTitle}>{title}</Text><View style={styles.collectionHeaderHeart}><Text>♡</Text></View></View>
      <View style={styles.collectionModeTabs}><Pressable onPress={() => setMode('ぬいキー')} style={[styles.collectionModeTab, mode === 'ぬいキー' && styles.collectionModeTabActive]}><Text style={[styles.collectionModeText, mode === 'ぬいキー' && styles.collectionModeTextActive]}>ぬいキー</Text></Pressable><Pressable onPress={() => setMode('ぬいぐるみ')} style={[styles.collectionModeTab, mode === 'ぬいぐるみ' && styles.collectionModeTabActive]}><Text style={[styles.collectionModeText, mode === 'ぬいぐるみ' && styles.collectionModeTextActive]}>ぬいぐるみ</Text></Pressable></View>
      {mode === 'ぬいキー' ? <View style={styles.collectionKeySizeTabs}><Pressable onPress={() => setKeyImageSize('normal')} style={[styles.collectionKeySizeTab, keyImageSize === 'normal' && styles.collectionKeySizeTabActive]} accessibilityRole="tab" accessibilityState={{ selected: keyImageSize === 'normal' }}><Text style={[styles.collectionKeySizeText, keyImageSize === 'normal' && styles.collectionKeySizeTextActive]}>通常サイズ</Text></Pressable><Pressable onPress={() => setKeyImageSize('small')} style={[styles.collectionKeySizeTab, keyImageSize === 'small' && styles.collectionKeySizeTabActive]} accessibilityRole="tab" accessibilityState={{ selected: keyImageSize === 'small' }}><Text style={[styles.collectionKeySizeText, keyImageSize === 'small' && styles.collectionKeySizeTextActive]}>Sサイズ</Text></Pressable></View> : null}
      <View style={[styles.collectionDisplay, { height: COLLECTION_BOARD_TOP + boardHeight }, mode === 'ぬいぐるみ' && styles.collectionDisplayPlush]}>
        {mode === 'ぬいキー' ? (
          <KeychainGrid items={displayItems} owned={owned} selectedId={selectedId} onSelect={onSelect} imageSize={keyImageSize} boardHeight={boardHeight} />
        ) : (
          <View style={styles.plushCollectionShelf}>
            {displayItems.map((item, index) => (
              <Pressable
                key={`${mode}-${item?.id ?? 'locked'}-${index}`}
                onPress={() => item && owned[item.id] ? onSelect(item.id) : undefined}
                style={[styles.plushCollectionItem, getPlushCollectionPlacement(index, boardHeight)]}
              >
                <View style={[styles.plushCollectionBody, item && (owned[item.id] ?? 0) > 0 && styles.plushCollectionBodyOwned, item && selectedId === item.id && styles.plushCollectionSelected]}>
                  {item && (owned[item.id] ?? 0) > 0 ? (
                    <Image source={item.image} resizeMode="contain" style={[styles.plushCollectionImage, { bottom: getPlushCollectionImageBottom(item) }]} />
                  ) : (
                    <View style={styles.collectionLocked}><Text style={styles.collectionLockedText}>?</Text></View>
                  )}
                </View>
                <Text style={styles.collectionPlushName} numberOfLines={1}>{item ? item.name.replace(' ぬいキー', '').replace(' ぬい', '') : '未発見'}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      <View style={styles.collectionCountRow}><Text style={styles.collectionCount}>{ownedCount} / {mode === 'ぬいキー' ? '40' : '30'}</Text><View style={styles.collectionProgress}><Text style={styles.collectionCountHint}>★ コンプリート率 {completionPercent}%</Text><View style={styles.collectionProgressTrack}><View style={[styles.collectionProgressFill, { width: `${Math.min(100, completionPercent)}%` }]} /></View></View><View style={styles.collectionFilter}><Text style={styles.collectionFilterText}>▽ 絞り込み</Text></View></View>
      </View>
    </View>
  );
}

function MobbyTimeScreen({ today, stage, onOpen, onReveal, onPlace, onPlaced, onTrade, secondsLeft }: { today: Item; stage: MobbyTimeStage; onOpen: () => void; onReveal: () => void; onPlace: () => void; onPlaced: () => void; onTrade: () => void; secondsLeft: number }) {
  const { width: appWidth, height: appHeight } = useAppLayout();
  const [headerHeight, setHeaderHeight] = useState(132);
  const active = secondsLeft > 0;
  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');
  const opening = stage === 'opening';
  const placing = stage === 'placing';
  const revealed = stage === 'revealed' || placing || stage === 'placed';
  const placed = stage === 'placed';
  const step = stage === 'arrived' || stage === 'opening' ? 1 : stage === 'revealed' ? 2 : 3;
  const packageMotion = useRef(new Animated.Value(0)).current;
  const magicGlow = useRef(new Animated.Value(0)).current;
  const revealFlash = useRef(new Animated.Value(0)).current;
  const placementMotion = useRef(new Animated.Value(0)).current;
  const placementBurst = useRef(new Animated.Value(0)).current;
  const onRevealRef = useRef(onReveal);
  const onPlacedRef = useRef(onPlaced);
  const openingRunRef = useRef(0);
  const placementRunRef = useRef(0);

  useEffect(() => {
    onRevealRef.current = onReveal;
  }, [onReveal]);

  useEffect(() => {
    onPlacedRef.current = onPlaced;
  }, [onPlaced]);

  useEffect(() => {
    if (!opening) {
      openingRunRef.current += 1;
      packageMotion.setValue(0);
      magicGlow.setValue(0);
      revealFlash.setValue(0);
      return;
    }
    const runId = ++openingRunRef.current;
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.sequence([
          Animated.timing(packageMotion, { toValue: 1, duration: 90, useNativeDriver: true }),
          Animated.timing(packageMotion, { toValue: -1, duration: 90, useNativeDriver: true }),
          Animated.timing(packageMotion, { toValue: 1, duration: 80, useNativeDriver: true }),
          Animated.timing(packageMotion, { toValue: -1, duration: 80, useNativeDriver: true }),
          Animated.timing(packageMotion, { toValue: 0, duration: 70, useNativeDriver: true }),
        ]),
        Animated.timing(magicGlow, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.delay(230),
      Animated.timing(revealFlash, { toValue: 1, duration: 170, useNativeDriver: true }),
      Animated.delay(110),
    ]);
    animation.start(({ finished }) => {
      if (finished && openingRunRef.current === runId) onRevealRef.current();
    });
    return () => {
      if (openingRunRef.current === runId) openingRunRef.current += 1;
      animation.stop();
    };
  }, [magicGlow, opening, packageMotion, revealFlash]);

  useEffect(() => {
    if (!placing) {
      placementRunRef.current += 1;
      placementMotion.setValue(0);
      placementBurst.setValue(0);
      return;
    }
    const runId = ++placementRunRef.current;
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.spring(placementMotion, { toValue: 1, speed: 8, bounciness: 12, useNativeDriver: true }),
        Animated.timing(placementBurst, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
      Animated.delay(380),
    ]);
    animation.start(({ finished }) => {
      if (finished && placementRunRef.current === runId) onPlacedRef.current();
    });
    return () => {
      if (placementRunRef.current === runId) placementRunRef.current += 1;
      animation.stop();
    };
  }, [placementBurst, placementMotion, placing]);

  const startOpening = () => {
    if (!active || opening) return;
    onOpen();
  };
  const placement = today.kind === 'ぬいキー' ? '壁' : '棚';
  const placementDistance = today.kind === 'ぬいキー' ? -68 : 34;
  const encounterBoardBaseWidth = 370;
  const encounterBoardBaseHeight = 555;
  const encounterBoardScale = Math.min(
    1,
    (appWidth - 28) / encounterBoardBaseWidth,
    Math.max(320, appHeight - 74 - headerHeight - 90) / encounterBoardBaseHeight,
  );
  const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);
    setHeaderHeight((current) => current === nextHeight ? current : nextHeight);
  }, []);
  const packageTransform = {
    transform: [
      { translateX: packageMotion.interpolate({ inputRange: [-1, 0, 1], outputRange: [-10, 0, 10] }) },
      { rotate: packageMotion.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-5deg', '-2deg', '4deg'] }) },
      { scale: magicGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
    ],
  };
  return (
    <View style={styles.timeScrollContent}>
      <View onLayout={handleHeaderLayout} style={styles.timeHeader}><Text style={styles.eyebrow}>EVERYONE, SAME TIME</Text><Text style={styles.bigTitle}>{active ? 'MOBBY TIME' : 'MOBBY TIME FINISH'}</Text><Text style={styles.timeHeaderSub}>1日1回、みんな同時にモビーがやってくる。</Text><ImageBackground source={MOBBY_TIME_TIMER_PLAQUE} resizeMode="contain" style={styles.bigTimer}><Text style={styles.bigTimerLabel}>{active ? '残り' : '次回まで'}</Text><Text style={styles.bigTimerValue}>{active ? `${minutes}:${seconds}` : '明日'}</Text><Text style={styles.bigTimerUnit}>TODAY 19:30 — 20:00</Text></ImageBackground></View>
      <View style={{ width: encounterBoardBaseWidth * encounterBoardScale, height: encounterBoardBaseHeight * encounterBoardScale }}>
      <ImageBackground source={MOBBY_TIME_BOARD} resizeMode="stretch" style={[styles.encounterCard, { width: encounterBoardBaseWidth, height: encounterBoardBaseHeight, transform: [{ scale: encounterBoardScale }], transformOrigin: 'top left' }]} imageStyle={styles.encounterCardImage}>
        <View style={styles.arrivalNotice}><View style={styles.liveDotCircle} /><Text style={styles.arrivalNoticeText}>{active ? 'モビーが届いてる…！' : '今日のMOBBY TIMEは終了しました'}</Text></View>
        <View style={styles.encounterStepRow}>
          {['ひらく', 'NEW!', 'かざる'].map((label, index) => <View key={label} style={styles.timeStepWrap}><View style={index + 1 <= step ? styles.encounterStepActive : styles.encounterStep}><Text style={styles.stepNo}>0{index + 1}</Text><Text style={styles.stepText}>{label}</Text></View>{index < 2 ? <View style={[styles.stepLine, index + 1 < step && styles.stepLineDone]} /> : null}</View>)}
        </View>
        <View style={styles.encounterScene}>
          {revealed && !placing ? <Image source={MOBBY_TIME_REVEAL_HALO} resizeMode="contain" style={styles.encounterHaloAsset} /> : null}
          {!revealed ? (
            <Animated.View style={[styles.packageAnimationWrap, packageTransform]}>
            <Pressable accessibilityRole="button" accessibilityLabel="届いた箱を開ける" onPress={startOpening} disabled={!active || opening} style={({ pressed }) => [styles.mobbyPackage, pressed && styles.packagePressed]}>
              <Image source={MOBBY_TIME_PACKAGE} resizeMode="contain" style={styles.packageAsset} />
              <View pointerEvents="none" style={styles.packageBrandOverlay}><Text style={styles.packageLogo}>MOBBY</Text><Text style={styles.packageHint}>TAP TO OPEN</Text></View>
            </Pressable>
            </Animated.View>
          ) : <Animated.View style={[styles.encounterRewardWrap, placing && { transform: [{ translateY: placementMotion.interpolate({ inputRange: [0, 1], outputRange: [0, placementDistance] }) }, { scale: placementMotion.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 1.16, 0.86] }) }, { rotate: placementMotion.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '-5deg', '0deg'] }) }] }]}><Image source={today.keyImage ?? today.image} resizeMode="contain" style={styles.encounterKeyImage} /></Animated.View>}
          {opening ? <><Animated.Image source={MOBBY_TIME_REVEAL_HALO} resizeMode="contain" style={[styles.magicRing, { opacity: magicGlow, transform: [{ scale: magicGlow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.35] }) }] }]} /><View pointerEvents="none" style={styles.magicParticles}><Text style={styles.magicParticle}>✦</Text><Text style={styles.magicParticle}>✧</Text><Text style={styles.magicParticle}>✦</Text><Text style={styles.magicParticle}>✧</Text></View><Animated.View pointerEvents="none" style={[styles.revealFlash, { opacity: revealFlash }]} /></> : null}
          {placing ? <><Animated.Image source={MOBBY_TIME_REVEAL_HALO} resizeMode="contain" style={[styles.placementHalo, { opacity: placementBurst, transform: [{ scale: placementBurst.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.45] }) }] }]} /><Animated.View pointerEvents="none" style={[styles.placementSparkles, { opacity: placementBurst }]}><Text style={styles.placementSparkle}>✦</Text><Text style={styles.placementSparkle}>✧</Text><Text style={styles.placementSparkle}>★</Text><Text style={styles.placementSparkle}>✦</Text><Text style={styles.placementSparkle}>✧</Text></Animated.View></> : null}
          <ImageBackground source={MOBBY_TIME_MESSAGE_PLAQUE} resizeMode="contain" style={styles.encounterBubble}><Text style={styles.encounterBubbleTitle}>{!active ? 'また明日' : placed ? '飾ったよ！' : placing ? `${placement}へ…！` : revealed ? 'NEW!' : opening ? 'OPENING…' : '届いてる…！'}</Text><Text style={styles.encounterBubbleText}>{!active ? '次回のMOBBY TIMEを待ってね' : placed ? `${today.name}を${placement}に追加` : placing ? '特別な場所に飾っています' : revealed ? today.name : opening ? 'なにが出るかな…' : '箱をタップして開けよう'}</Text></ImageBackground>
          {revealed && !placed && !placing ? <ImageBackground source={MOBBY_TIME_REWARD_SEAL} resizeMode="contain" style={styles.newBadge}><Text style={styles.newBadgeText}>NEW!</Text></ImageBackground> : null}
        </View>
        <Text style={styles.encounterCaption}>{!active ? 'GETと交換は次のMOBBY TIMEまでお休みです。' : placed ? '追加完了。残り時間は友達との交換を楽しめます。' : placing ? `${today.name}を${placement}へ飾っています…` : revealed ? `新しい${today.kind}を${placement}に追加しよう。` : opening ? '箱の中から光があふれている…！' : '30分以内に箱を開けると、今日のモビーに会えます。'}</Text>
        {revealed ? <Pressable accessibilityRole="button" onPress={placed ? onTrade : onPlace} disabled={!active || placing} style={({ pressed }) => [styles.primaryButton, styles.timePrimaryButton, (!active || placing) && styles.timePrimaryButtonInactive, pressed && styles.pressed]}><Image source={placed ? EXCHANGE : MOBBY_ICON} resizeMode="contain" style={styles.primaryButtonIcon} /><Text style={[styles.primaryButtonText, styles.timePrimaryButtonText]}>{placed ? '残り時間で友達と交換' : placing ? `${placement}へ飾り付け中…` : `${placement}に追加する`}</Text></Pressable> : <Text style={styles.packageTapCaption}>{opening ? '開封中…' : '箱をタップ'}</Text>}
      </ImageBackground>
      </View>
    </View>
  );
}

function PullableMobby({ selected, onPull, size = 320 }: { selected: Item; onPull: () => void; size?: number }) {
  const { scale: appScale } = useAppLayout();
  const mobbyId = itemMobbyId(selected.id);
  const pullAsset = PULL_ASSETS[mobbyId];
  const reactionFrames = PULL_REACTION_FRAMES[mobbyId];
  const [status, setStatus] = useState<'idle' | 'pulling' | 'released' | 'reacting'>('idle');
  const [reactionFrame, setReactionFrame] = useState<number | null>(null);
  const [reactionPattern, setReactionPattern] = useState<'single' | 'sequence'>(DEFAULT_PULL_REACTION_PATTERN);
  const [eyeIndex, setEyeIndex] = useState(-1);
  const [mouthIndex, setMouthIndex] = useState(-1);
  const scaleX = useRef(new Animated.Value(1)).current;
  const scaleY = useRef(new Animated.Value(1)).current;
  const reactionMotion = useRef(new Animated.Value(0)).current;
  const reactionAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const lastSingleReactionRef = useRef(-1);
  const meshRef = useRef<MobbyPullMeshHandle>(null);
  const sectorRef = useRef(0);
  const strongRef = useRef(false);
  const reactionTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearReactionTimers = useCallback(() => {
    reactionTimersRef.current.forEach(clearTimeout);
    reactionTimersRef.current = [];
    reactionAnimationRef.current?.stop();
    reactionAnimationRef.current = null;
  }, []);

  const resetExpression = useCallback(() => {
    setEyeIndex(-1);
    setMouthIndex(-1);
    sectorRef.current = 0;
    strongRef.current = false;
  }, []);

  useEffect(() => () => clearReactionTimers(), [clearReactionTimers]);
  useEffect(() => {
    if (reactionFrames) void Asset.loadAsync([...reactionFrames]);
  }, [reactionFrames]);
  useEffect(() => {
    clearReactionTimers();
    setReactionFrame(null);
    setStatus('idle');
    resetExpression();
  }, [clearReactionTimers, mobbyId, resetExpression]);

  const toggleReactionPattern = useCallback(() => {
    clearReactionTimers();
    setReactionFrame(null);
    setStatus('idle');
    reactionMotion.setValue(0);
    resetExpression();
    setReactionPattern((current) => current === 'single' ? 'sequence' : 'single');
  }, [clearReactionTimers, reactionMotion, resetExpression]);

  const release = useCallback((dx: number, dy: number) => {
    if (Math.hypot(dx, dy) < 4) {
      setStatus('idle');
      return;
    }
    meshRef.current?.release();
    onPull();
    Animated.parallel([
      Animated.spring(scaleX, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 13 }),
      Animated.spring(scaleY, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 13 }),
    ]).start();

    if (reactionFrames) {
      clearReactionTimers();
      resetExpression();
      setStatus('reacting');
      reactionMotion.setValue(0);

      if (reactionPattern === 'single') {
        const previous = lastSingleReactionRef.current;
        const nextFrame = previous < 0
          ? Math.floor(Math.random() * reactionFrames.length)
          : (previous + 1 + Math.floor(Math.random() * (reactionFrames.length - 1))) % reactionFrames.length;
        lastSingleReactionRef.current = nextFrame;
        setReactionFrame(nextFrame);
        reactionAnimationRef.current = Animated.timing(reactionMotion, {
          toValue: 1,
          duration: [760, 900, 920, 1500][nextFrame],
          easing: Easing.linear,
          useNativeDriver: true,
        });
      } else {
        setReactionFrame(0);
        [220, 620, 1120].forEach((at, index) => {
          reactionTimersRef.current.push(setTimeout(() => setReactionFrame(index + 1), at));
        });
        reactionAnimationRef.current = Animated.sequence([
          Animated.timing(reactionMotion, {
            toValue: 1,
            duration: 2100,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.delay(600),
        ]);
      }
      reactionAnimationRef.current.start(({ finished }) => {
        if (!finished) return;
        setReactionFrame(null);
        setStatus('idle');
        reactionMotion.setValue(0);
        reactionTimersRef.current = [];
        reactionAnimationRef.current = null;
      });
      return;
    }

    setStatus('released');
    reactionTimersRef.current.push(setTimeout(() => {
      setStatus('idle');
      resetExpression();
      reactionTimersRef.current = [];
    }, 550));
  }, [clearReactionTimers, onPull, reactionFrames, reactionMotion, reactionPattern, resetExpression, scaleX, scaleY]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      clearReactionTimers();
      setReactionFrame(null);
      scaleX.stopAnimation();
      scaleY.stopAnimation();
      setStatus('pulling');
      meshRef.current?.begin(event.nativeEvent.locationX / appScale, event.nativeEvent.locationY / appScale);
    },
    onPanResponderMove: (_event, gesture) => {
      const dx = Math.max(-64, Math.min(64, gesture.dx / appScale));
      const dy = Math.max(-50, Math.min(50, gesture.dy / appScale));
      scaleX.setValue(1 + Math.min(0.16, Math.abs(dx) / 430));
      scaleY.setValue(1 - Math.min(0.06, Math.abs(dx) / 1100));
      meshRef.current?.update(dx, dy);
      if (Math.hypot(dx, dy) >= 4) {
        const expression = selectPullExpression(pullAsset, dx, dy, size, sectorRef, strongRef);
        setEyeIndex(expression.eyeIndex);
        setMouthIndex(expression.mouthIndex);
      }
    },
    onPanResponderRelease: (_event, gesture) => release(gesture.dx / appScale, gesture.dy / appScale),
    onPanResponderTerminate: (_event, gesture) => release(gesture.dx / appScale, gesture.dy / appScale),
  }), [appScale, clearReactionTimers, pullAsset, release, scaleX, scaleY, size]);

  const meshVisible = Platform.OS === 'web' && (status === 'pulling' || status === 'released');
  const isPullReaction = Boolean(reactionFrames && reactionFrame !== null);
  const defaultEye = pullAsset.defaultEye ?? pullAsset.eyes[0];
  const activeEye = eyeIndex >= 0 ? pullAsset.eyes[eyeIndex] ?? defaultEye : defaultEye;
  const activeMouth = mouthIndex >= 0 ? pullAsset.mouths[mouthIndex] : null;
  const eyeFrame = eyeIndex >= 0 ? pullAsset.eyeFrame : pullAsset.defaultEyeFrame ?? pullAsset.eyeFrame;
  const reactionTranslateX = reactionMotion.interpolate({
    inputRange: [0, 0.1, 0.24, 0.42, 0.48, 0.54, 0.6, 0.68, 0.82, 1],
    outputRange: [0, 0, -4, 0, -7, 7, -6, 4, 0, 0],
  });
  const reactionTranslateY = reactionMotion.interpolate({
    inputRange: [0, 0.08, 0.18, 0.42, 0.68, 0.84, 1],
    outputRange: [5, -5, 0, 0, 2, 4, 0],
  });
  const reactionScaleX = reactionMotion.interpolate({
    inputRange: [0, 0.08, 0.18, 1],
    outputRange: [0.94, 1.04, 1, 1],
  });
  const reactionScaleY = reactionMotion.interpolate({
    inputRange: [0, 0.08, 0.18, 1],
    outputRange: [0.9, 1.05, 1, 1],
  });
  const reactionRotate = reactionMotion.interpolate({
    inputRange: [0, 0.1, 0.24, 0.42, 0.48, 0.54, 0.6, 0.68, 0.82, 1],
    outputRange: ['0deg', '-1deg', '1.5deg', '0deg', '-2.5deg', '2.5deg', '-2deg', '1.5deg', '0deg', '0deg'],
  });
  const burstOpacity = reactionMotion.interpolate({ inputRange: [0, 0.03, 0.2, 0.21], outputRange: [0, 0.9, 0, 0] });
  const burstScale = reactionMotion.interpolate({ inputRange: [0, 0.2], outputRange: [0.45, 1.45], extrapolate: 'clamp' });
  const cheekEffectOpacity = reactionMotion.interpolate({ inputRange: [0.09, 0.13, 0.25, 0.3], outputRange: [0, 0.78, 0.62, 0], extrapolate: 'clamp' });
  const cheekEffectShift = reactionMotion.interpolate({ inputRange: [0.1, 0.17, 0.24, 0.3], outputRange: [0, -4, 3, 0], extrapolate: 'clamp' });
  const protestEffectOpacity = reactionMotion.interpolate({ inputRange: [0.28, 0.32, 0.48, 0.54], outputRange: [0, 0.82, 0.72, 0], extrapolate: 'clamp' });
  const protestEffectShift = reactionMotion.interpolate({ inputRange: [0.29, 0.37, 0.45, 0.53], outputRange: [0, 8, -6, 0], extrapolate: 'clamp' });
  const sulkEffectOpacity = reactionMotion.interpolate({ inputRange: [0.51, 0.57, 0.82, 1], outputRange: [0, 0.68, 0.5, 0.38], extrapolate: 'clamp' });
  const sulkEffectDrop = reactionMotion.interpolate({ inputRange: [0.52, 0.68, 1], outputRange: [-5, 2, 5], extrapolate: 'clamp' });
  const singleEffectOpacity = reactionMotion.interpolate({ inputRange: [0, 0.08, 0.72, 1], outputRange: [0, 0.78, 0.62, 0], extrapolate: 'clamp' });
  const singleTranslateX = reactionMotion.interpolate({ inputRange: [0, 0.16, 0.32, 0.48, 0.68, 1], outputRange: [0, -4, 4, -3, 1, 0] });
  const singleTranslateY = reactionMotion.interpolate({ inputRange: [0, 0.14, 0.32, 0.72, 1], outputRange: [4, -4, 0, 2, 0] });
  const singleScaleX = reactionMotion.interpolate({ inputRange: [0, 0.12, 0.28, 1], outputRange: [0.95, 1.035, 1, 1] });
  const singleScaleY = reactionMotion.interpolate({ inputRange: [0, 0.12, 0.28, 1], outputRange: [0.91, 1.045, 1, 1] });
  const singleRotate = reactionMotion.interpolate({ inputRange: [0, 0.18, 0.36, 0.58, 1], outputRange: ['0deg', '-1.5deg', '1.5deg', '-0.7deg', '0deg'] });
  const activeReactionTranslateX = reactionPattern === 'single' ? singleTranslateX : reactionTranslateX;
  const activeReactionTranslateY = reactionPattern === 'single' ? singleTranslateY : reactionTranslateY;
  const activeReactionScaleX = reactionPattern === 'single' ? singleScaleX : reactionScaleX;
  const activeReactionScaleY = reactionPattern === 'single' ? singleScaleY : reactionScaleY;
  const activeReactionRotate = reactionPattern === 'single' ? singleRotate : reactionRotate;
  return (
    <View style={[styles.pullableWrap, { width: size, height: size + (size >= 300 ? 45 : 12) }]}>
      <View style={[styles.pullableStage, { width: size, height: size }]}>
        {reactionFrames ? <Pressable accessibilityRole="button" accessibilityLabel={`リアクションを${reactionPattern === 'single' ? '4種連続' : '単発'}に切り替える`} onPress={toggleReactionPattern} style={({ pressed }) => [styles.reactionPatternButton, size >= 300 ? styles.reactionPatternButtonLarge : styles.reactionPatternButtonCompact, pressed && styles.reactionPatternButtonPressed]}><Text style={styles.reactionPatternCaption}>反応</Text><Text style={styles.reactionPatternValue}>{reactionPattern === 'single' ? '単発' : '4連続'}</Text></Pressable> : null}
        <Animated.View {...panResponder.panHandlers} accessibilityRole="button" accessibilityLabel="モビーのほっぺを引っ張る" style={[styles.pullableSlot, { width: size, height: size, opacity: meshVisible || isPullReaction ? 0 : 1, transform: [{ scaleX }, { scaleY }] }]}>
          <Image source={pullAsset.body} resizeMode="contain" style={[styles.pullableBody, { width: size, height: size }]} />
        </Animated.View>
        <MobbyPullMesh ref={meshRef} source={pullAsset.body} size={size} visible={meshVisible} />
        {!isPullReaction ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.pullableFaceLayer]}>
          <Image source={activeEye} resizeMode="contain" style={pullFaceFrameStyle(eyeFrame, pullAsset, size)} />
          {activeMouth ? <Image source={activeMouth} resizeMode="contain" style={pullFaceFrameStyle(pullAsset.mouthFrame, pullAsset, size)} /> : null}
        </View> : null}
        {reactionFrames ? <Animated.View pointerEvents="none" style={[styles.pullableReactionLayer, {
          opacity: isPullReaction ? 1 : 0,
          transform: [{ translateX: activeReactionTranslateX }, { translateY: activeReactionTranslateY }, { rotate: activeReactionRotate }, { scaleX: activeReactionScaleX }, { scaleY: activeReactionScaleY }],
        }]}>{reactionFrames.map((frame, index) => <Image key={index} source={frame} resizeMode="contain" fadeDuration={0} style={[styles.pullableReactionFrame, { width: size, height: size, opacity: reactionFrame === index ? 1 : 0 }]} />)}</Animated.View> : null}
        {isPullReaction ? <Animated.View pointerEvents="none" style={[styles.pullableReactionBurst, { opacity: burstOpacity, transform: [{ scale: burstScale }] }]} /> : null}
        {reactionFrame === 0 ? <View pointerEvents="none" style={styles.animeEffectLayer}>{Array.from({ length: 8 }, (_, index) => <Animated.View key={index} style={[styles.animeBurstRayWrap, { opacity: burstOpacity, transform: [{ rotate: `${index * 45}deg` }, { scale: burstScale }] }]}><View style={[styles.animeBurstRay, { height: size * 0.11, left: size / 2 - 1.5, top: size * 0.025 }]} /></Animated.View>)}</View> : null}
        {reactionFrame === 1 ? <Animated.View pointerEvents="none" style={[styles.animeEffectLayer, { opacity: reactionPattern === 'single' ? singleEffectOpacity : cheekEffectOpacity, transform: [{ translateX: cheekEffectShift }] }]}><Text style={[styles.animeCheekLine, styles.animeCheekLineLeft]}>)))</Text><Text style={[styles.animeCheekLine, styles.animeCheekLineRight]}>(((</Text></Animated.View> : null}
        {reactionFrame === 2 ? <Animated.View pointerEvents="none" style={[styles.animeEffectLayer, { opacity: reactionPattern === 'single' ? singleEffectOpacity : protestEffectOpacity, transform: [{ translateX: protestEffectShift }] }]}><View style={[styles.animeSpeedGroup, styles.animeSpeedGroupLeft]}><View style={[styles.animeSpeedLine, { width: size * 0.16 }]} /><View style={[styles.animeSpeedLine, { width: size * 0.11 }]} /><View style={[styles.animeSpeedLine, { width: size * 0.07 }]} /></View><View style={[styles.animeSpeedGroup, styles.animeSpeedGroupRight]}><View style={[styles.animeSpeedLine, { width: size * 0.16 }]} /><View style={[styles.animeSpeedLine, { width: size * 0.11 }]} /><View style={[styles.animeSpeedLine, { width: size * 0.07 }]} /></View><Text style={styles.animeAngerMark}>〽</Text></Animated.View> : null}
        {reactionFrame === 3 ? <Animated.View pointerEvents="none" style={[styles.animeEffectLayer, { opacity: reactionPattern === 'single' ? singleEffectOpacity : sulkEffectOpacity, transform: [{ translateY: sulkEffectDrop }] }]}><View style={styles.animeGloomLines}><View style={styles.animeGloomLine} /><View style={[styles.animeGloomLine, styles.animeGloomLineShort]} /><View style={styles.animeGloomLine} /></View><Text style={styles.animeSigh}>≈</Text></Animated.View> : null}
      </View>
      {status !== 'idle' ? <View pointerEvents="none" style={styles.pullStatus}><Text style={styles.pullStatusText}>{status === 'pulling' ? 'のびてる……' : 'びよーん！'}</Text></View> : null}
    </View>
  );
}

function itemMobbyId(itemId: string): MobbyId {
  if (itemId.startsWith('reo-')) return 'reomoby';
  if (itemId.startsWith('pote-')) return 'potemoby';
  if (itemId.startsWith('babu-')) return 'babumoby';
  return itemId.split('-')[0] as MobbyId;
}

function pullFaceFrameStyle(frame: PullFrame, asset: MobbyPullAsset, size: number) {
  const scale = size / asset.sourceSize;
  return {
    position: 'absolute' as const,
    left: frame.x * scale,
    top: frame.y * scale,
    width: frame.width * scale,
    height: frame.height * scale,
  };
}

function selectPullExpression(
  asset: MobbyPullAsset,
  dx: number,
  dy: number,
  width: number,
  sectorRef: { current: number },
  strongRef: { current: boolean },
) {
  const magnitude = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const fullTurn = Math.PI * 2;
  const sectorSize = fullTurn / asset.eyePairs.length;
  const normalized = (angle + fullTurn + sectorSize / 2) % fullTurn;
  const candidateSector = Math.floor(normalized / sectorSize) % asset.eyePairs.length;
  const currentCenter = sectorRef.current * sectorSize;
  const distanceFromCurrent = Math.abs(Math.atan2(Math.sin(angle - currentCenter), Math.cos(angle - currentCenter)));
  if (magnitude >= 12 && distanceFromCurrent > sectorSize / 2 + Math.PI / 18) sectorRef.current = candidateSector;

  const strongOn = Math.max(70, width * 0.16);
  const strongOff = Math.max(52, width * 0.12);
  if (!strongRef.current && magnitude >= strongOn) strongRef.current = true;
  if (strongRef.current && magnitude <= strongOff) strongRef.current = false;

  const eyePair = asset.eyePairs[sectorRef.current] ?? asset.eyePairs[0];
  const mouthPair = asset.mouthPairs[sectorRef.current] ?? asset.mouthPairs[0];
  return {
    eyeIndex: eyePair[strongRef.current ? 1 : 0],
    mouthIndex: mouthPair[strongRef.current ? 1 : 0],
  };
}

function TouchScreen({ selected, onInteract, reaction }: { selected: Item; onInteract: (kind: string) => void; reaction: string }) {
  return (
    <View style={styles.touchScreenBackground}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.touchScrollContent}>
      <View style={styles.touchTop}><Text style={styles.eyebrow}>DIGITAL PLUSH</Text><View style={styles.touchTitleRow}><Text style={styles.bigTitle}>{selected.name}</Text><View style={[styles.rarityBadge, { backgroundColor: selected.accent }]}><Text style={styles.rarityBadgeText}>{selected.rarity}</Text></View></View></View>
      <View style={styles.touchStage}><PullableMobby selected={selected} onPull={() => onInteract('ほっぺ')} />{reaction ? <View style={styles.touchBubble}><Text style={styles.touchBubbleText}>{reaction}</Text></View> : null}<Text style={styles.touchHand}>☝</Text><View style={styles.touchHearts}><Text style={styles.touchHeart}>♥</Text><Text style={styles.touchHeart}>♥</Text><Text style={styles.touchHeart}>♥</Text></View></View>
      </ScrollView>
    </View>
  );
}

function QrCode() {
  return <View style={styles.qrCode}>{QR_PATTERN.map((row, rowIndex) => <View key={`qr-${rowIndex}`} style={styles.qrRow}>{row.split('').map((cell, columnIndex) => <View key={`qr-${rowIndex}-${columnIndex}`} style={[styles.qrCell, cell === '1' && styles.qrCellOn]} />)}</View>)}</View>;
}

function TradeScreen({ items, owned, selectedId, onSelect }: { items: Item[]; owned: Record<string, number>; selectedId: string; onSelect: (id: string) => void }) {
  const [qrVisible, setQrVisible] = useState(false);
  const [tradeState, setTradeState] = useState<'idle' | 'ready' | 'done'>('idle');
  const { width: appWidth } = useAppLayout();
  const tradeBoardWidth = Math.min(appWidth - 56, 370);
  const tradeBoardHeight = tradeBoardWidth * 1.5;
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  return (
    <View style={styles.tradeScrollContent}>
      <View style={styles.tradeHeader}><Text style={styles.eyebrow}>TRADE DURING MOBBY TIME</Text><Text style={styles.bigTitle}>友達と交換</Text><Text style={styles.tradeSub}>フレンド機能なし。QRを見せるだけ。</Text></View>
      <ImageBackground source={TRADE_EXCHANGE_BOARD} resizeMode="stretch" style={[styles.tradeBoardAsset, { width: tradeBoardWidth, height: tradeBoardHeight }]} imageStyle={styles.tradeBoardAssetImage}>
        <View style={[styles.tradeCard, styles.tradeCardFirst]}>
          <View style={styles.tradeCardTop}>
            <View><Text style={styles.tradeCardKicker}>STEP 01</Text><Text style={styles.tradeCardTitle}>交換用QRをつなぐ</Text></View>
            <View style={styles.liveDot}><View style={styles.liveDotCircle} /><Text style={styles.liveDotText}>LIVE</Text></View>
          </View>
          <View style={styles.qrStage}>{qrVisible ? <QrCode /> : <View style={styles.qrPlaceholder}><Image source={EXCHANGE} resizeMode="contain" style={styles.qrPlaceholderIcon} /><Text style={styles.qrPlaceholderText}>QRを表示して友達に見せよう</Text></View>}</View>
          <Pressable onPress={() => setQrVisible((value) => !value)} style={({ pressed }) => [styles.primaryButton, styles.tradePrimaryButton, pressed && styles.pressed]}><Text style={[styles.primaryButtonText, styles.tradePrimaryButtonText]}>{qrVisible ? 'QRを隠す' : 'QRを表示する'}</Text></Pressable>
          <Text style={styles.qrExpiry}>交換成立・キャンセル・5分経過で無効になります</Text>
        </View>
        <View style={[styles.tradeCard, styles.tradeCardSecond]}>
          <Text style={styles.tradeCardKicker}>STEP 02</Text><Text style={styles.tradeCardTitle}>交換するグッズを選ぶ</Text>
          <View style={styles.tradeItemRow}>
            <Pressable onPress={() => onSelect(selected.id)} style={styles.tradeItem}><View style={[styles.tradeItemImage, { backgroundColor: selected.accent }]}><Image source={selected.kind === 'ぬいキー' ? selected.keyImage ?? selected.image : selected.image} resizeMode="contain" style={styles.tradeImage} /></View><Text style={styles.tradeItemName}>{selected.name}</Text><Text style={styles.tradeItemOwner}>あなた　×{owned[selected.id] ?? 0}</Text></Pressable>
            <View style={styles.exchangeArrow}><Text>↔</Text></View>
            <View style={styles.partnerItem}><View style={styles.partnerImage}><Text style={styles.partnerQuestion}>?</Text></View><Text style={styles.partnerName}>相手のグッズ</Text><Text style={styles.tradeItemOwner}>QR接続待ち</Text></View>
          </View>
          <View style={styles.tradePicker}>{items.filter((item) => (owned[item.id] ?? 0) > 0).map((item) => <Pressable key={item.id} onPress={() => onSelect(item.id)} style={[styles.tradePickerDot, item.id === selected.id && styles.tradePickerDotSelected]}><Image source={item.kind === 'ぬいキー' ? item.keyImage ?? item.image : item.image} resizeMode="contain" style={styles.tradePickerImage} /></Pressable>)}</View>
          <Pressable onPress={() => setTradeState(tradeState === 'ready' ? 'done' : 'ready')} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><Text style={styles.secondaryButtonText}>{tradeState === 'idle' ? '交換内容を確認' : tradeState === 'ready' ? 'この内容で交換する' : '交換成立！'}</Text></Pressable>
        </View>
      </ImageBackground>
    </View>
  );
}

function BottomNav({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) {
  const tabs: { id: Screen; label: string; icon: number }[] = [
    { id: 'home', label: 'ホーム', icon: HOUSE },
    { id: 'collection', label: 'コレクション', icon: MOBBY_ICON },
    { id: 'time', label: 'MOBBY TIME', icon: SPARKLES },
    { id: 'touch', label: 'TOUCH', icon: MOBBY_ICON },
    { id: 'trade', label: 'TRADE', icon: FRIEND },
  ];
  return <View style={styles.bottomNav}>{tabs.map((tab) => <Pressable key={tab.id} onPress={() => setScreen(tab.id)} style={({ pressed }) => [styles.navTab, screen === tab.id && styles.navTabActive, pressed && styles.pressed]}><Image source={tab.icon} resizeMode="contain" style={[styles.navIcon, screen === tab.id && styles.navIconActive]} /><Text style={[styles.navLabel, screen === tab.id && styles.navLabelActive]}>{tab.label}</Text>{screen === tab.id ? <View style={styles.navDot} /> : null}</Pressable>)}</View>;
}

export default function IndexScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const [viewportSize, setViewportSize] = useState({ width: DESIGN_WIDTH, height: DESIGN_MIN_HEIGHT });
  const [appStarted, setAppStarted] = useState(false);
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedId, setSelectedId] = useState('yami-key');
  const [owned, setOwned] = useState(INITIAL_OWNED);
  const [mobbyTimeStage, setMobbyTimeStage] = useState<MobbyTimeStage>('arrived');
  const [todayId, setTodayId] = useState(ITEMS[0].id);
  const [secondsLeft, setSecondsLeft] = useState(1421);
  const [reaction, setReaction] = useState('');
  const [notice, setNotice] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [wallPlacement, setWallPlacement] = useState<Item | null>(null);
  const [homeWallItemIds, setHomeWallItemIds] = useState(() => ITEMS.map((item) => item.id));
  const [homePlushItemIds, setHomePlushItemIds] = useState(() => ITEMS.filter((item) => item.kind === 'ぬいぐるみ').map((item) => item.id));
  const pullReactionIndexRef = useRef<Record<string, number>>({});
  const { engageBgm, playSfx } = useMobbyAudio({ bgmEnabled: appStarted && soundEnabled, sfxEnabled: soundEnabled });
  const selected = useMemo(() => ITEMS.find((item) => item.id === selectedId) ?? ITEMS[0], [selectedId]);
  const today = ITEMS.find((item) => item.id === todayId) ?? ITEMS[0];
  const viewportWidth = Math.max(1, viewportSize.width - safeAreaInsets.left - safeAreaInsets.right);
  const viewportHeight = Math.max(1, viewportSize.height - safeAreaInsets.top - safeAreaInsets.bottom);
  const appScale = Math.max(0.01, Math.min(1, viewportWidth / DESIGN_WIDTH, viewportHeight / DESIGN_MIN_HEIGHT));
  const appHeight = Math.max(DESIGN_MIN_HEIGHT, viewportHeight / appScale);
  const appViewportWidth = DESIGN_WIDTH * appScale;
  const layoutMetrics = useMemo(() => ({ width: DESIGN_WIDTH, height: appHeight, scale: appScale }), [appHeight, appScale]);

  useEffect(() => {
    const updateViewport = ({ width, height }: { width: number; height: number }) => {
      if (width <= 1 || height <= 1) return;
      setViewportSize({ width, height });
    };
    updateViewport(Dimensions.get('window'));
    const subscription = Dimensions.addEventListener('change', ({ window }) => updateViewport(window));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setTodayId(ITEMS[Math.floor(Math.random() * ITEMS.length)].id);
    const timer = setInterval(() => setSecondsLeft((value) => value > 0 ? value - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, []);

  const selectItem = useCallback((id: string) => {
    playSfx('tap');
    setReaction('');
    setSelectedId(id);
    setScreen('touch');
  }, [playSfx]);
  const revealToday = useCallback(() => {
    playSfx('reward');
    setMobbyTimeStage('revealed');
  }, [playSfx]);
  const finalizePlacement = useCallback((item: Item) => {
    setMobbyTimeStage('placed');
    setOwned((current) => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 }));
    setSelectedId(item.id);
    const placement = item.kind === 'ぬいキー' ? '壁' : '棚';
    setNotice(`NEW! ${item.name}を${placement}に追加しました`);
  }, []);
  const placeToday = useCallback(() => {
    setSelectedId(today.id);
    if (today.kind === 'ぬいキー') {
      setNotice('');
      setWallPlacement(today);
      setScreen('home');
      return;
    }
    playSfx('place');
    finalizePlacement(today);
  }, [finalizePlacement, playSfx, today]);
  const completeWallPlacement = useCallback(() => {
    if (!wallPlacement) return;
    playSfx('place');
    finalizePlacement(wallPlacement);
    setWallPlacement(null);
  }, [finalizePlacement, playSfx, wallPlacement]);
  const swapHomeWallItems = useCallback((fromIndex: number, toIndex: number) => {
    setHomeWallItemIds((current) => {
      const next = [...current];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return next;
    });
  }, []);
  const swapHomePlushItems = useCallback((fromIndex: number, toIndex: number) => {
    setHomePlushItemIds((current) => {
      const next = [...current];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return next;
    });
  }, []);

  const openMobbyTimeNotification = useCallback(() => {
    playSfx('tap');
    const next = ITEMS[Math.floor(Math.random() * ITEMS.length)];
    setTodayId(next.id);
    setSecondsLeft(1800);
    setMobbyTimeStage('arrived');
    setScreen('time');
    setNotice('MOBBY TIME！中身は開けるまでのお楽しみ');
    setNotificationOpen(false);
  }, [playSfx]);

  const openNotificationScreen = useCallback((nextScreen: Screen) => {
    playSfx('tap');
    setScreen(nextScreen);
    setNotificationOpen(false);
  }, [playSfx]);

  const interact = useCallback((kind: string) => {
    playSfx('tap');
    if (kind !== 'ほっぺ') {
      setReaction('？');
      return;
    }
    const mobby = getMobby(ITEM_MOBBY_IDS[selected.id] ?? 'mobichi');
    const lines = mobby.lines.tease;
    const currentIndex = pullReactionIndexRef.current[selected.id] ?? 0;
    setReaction(lines[currentIndex % lines.length]);
    pullReactionIndexRef.current[selected.id] = currentIndex + 1;
  }, [playSfx, selected.id]);

  const navigateTo = useCallback((nextScreen: Screen) => {
    playSfx('tap');
    setScreen(nextScreen);
  }, [playSfx]);

  const selectHomeMobby = useCallback((id: string) => {
    playSfx('tap');
    setReaction('');
    setSelectedId(id);
  }, [playSfx]);

  const toggleSound = useCallback(() => {
    if (soundEnabled) {
      setSoundEnabled(false);
      return;
    }
    engageBgm();
    setSoundEnabled(true);
  }, [engageBgm, soundEnabled]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outer}>
        <View style={[styles.appViewport, { width: appViewportWidth, height: viewportHeight }]}>
          <AppLayoutContext.Provider value={layoutMetrics}>
            <View style={[styles.appShell, { height: appHeight, transform: [{ scale: appScale }] }]}>
              {screen === 'collection' ? <>
                <Image source={ROOM_BACKGROUND} resizeMode="cover" style={styles.appShellBackground} />
                <Image source={COLLECTION_WALL_BACKGROUND} resizeMode="cover" style={styles.collectionReferenceBackground} />
              </> : <Image source={screen === 'home' ? HOME_WALL_BACKGROUND : ROOM_BACKGROUND} resizeMode="cover" style={styles.appShellBackground} />}
              <Header
                soundEnabled={soundEnabled}
                onToggleSound={toggleSound}
                onBell={() => {
                  playSfx('notification');
                  setNotificationOpen(true);
                }}
              />
              {notice ? <Pressable onPress={() => { playSfx('tap'); setNotice(''); }} style={styles.noticeToast}><Text style={styles.noticeToastText}>{notice}</Text><Text style={styles.noticeToastClose}>×</Text></Pressable> : null}
              {notificationOpen ? (
                <NotificationPopup
                  onClose={() => { playSfx('tap'); setNotificationOpen(false); }}
                  onOpenMobbyTime={openMobbyTimeNotification}
                  onOpenCollection={() => openNotificationScreen('collection')}
                  onOpenTrade={() => openNotificationScreen('trade')}
                />
              ) : null}
              <View style={styles.screenBody}>
                {screen === 'home' ? <HomeScreen selected={selected} onSelect={selectHomeMobby} hiddenWallItemId={wallPlacement?.id} wallItemIds={homeWallItemIds} plushItemIds={homePlushItemIds} onSwapWallItems={swapHomeWallItems} onSwapPlushItems={swapHomePlushItems} onUiTap={() => playSfx('tap')} onInteract={interact} reaction={reaction} /> : null}
                {screen === 'collection' ? <CollectionScreen items={ITEMS} owned={owned} selectedId={selectedId} onSelect={selectItem} /> : null}
                {screen === 'time' ? <MobbyTimeScreen today={today} stage={mobbyTimeStage} onOpen={() => { playSfx('boxOpen'); setMobbyTimeStage('opening'); }} onReveal={revealToday} onPlace={() => { playSfx('tap'); setMobbyTimeStage('placing'); }} onPlaced={placeToday} onTrade={() => navigateTo('trade')} secondsLeft={secondsLeft} /> : null}
                {screen === 'touch' ? <TouchScreen selected={selected} onInteract={interact} reaction={reaction} /> : null}
                {screen === 'trade' ? <TradeScreen items={ITEMS} owned={owned} selectedId={selectedId} onSelect={selectHomeMobby} /> : null}
              </View>
              <BottomNav screen={screen} setScreen={navigateTo} />
              {wallPlacement ? <WallPlacementFlight item={wallPlacement} onComplete={completeWallPlacement} /> : null}
              {!appStarted ? <OpeningScreen onBegin={() => { engageBgm(); playSfx('reward'); }} onStart={() => setAppStarted(true)} /> : null}
            </View>
          </AppLayoutContext.Provider>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#E7D3BC' },
  outer: { flex: 1, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'flex-start', backgroundColor: Platform.OS === 'web' ? '#E7D3BC' : '#FFF7EA' },
  appViewport: { position: 'relative', overflow: 'hidden', backgroundColor: '#E7D3BC', ...(Platform.OS === 'web' ? { boxShadow: '0 16px 48px rgba(81, 48, 54, 0.18)' } : {}) },
  appShell: { position: 'absolute', top: 0, left: 0, width: DESIGN_WIDTH, backgroundColor: '#D8A46F', overflow: Platform.OS === 'web' ? ('clip' as any) : 'hidden', transformOrigin: 'top left' },
  appShellBackground: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', objectFit: 'cover' },
  collectionReferenceBackground: { ...StyleSheet.absoluteFillObject, width: DESIGN_WIDTH, height: '100%' },
  openingScreen: { ...StyleSheet.absoluteFillObject, zIndex: 100, overflow: 'hidden' },
  openingBackdrop: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', objectFit: 'cover' },
  openingTitleWrap: { position: 'absolute', top: 34, left: 24, right: 24, alignItems: 'center', zIndex: 8 },
  openingTitlePlaque: { width: 310, height: 129, alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  openingTitle: { color: '#5A3A69', fontSize: 43, lineHeight: 45, fontWeight: '900', letterSpacing: 2.2, textShadowColor: 'rgba(255,249,231,0.72)', textShadowRadius: 3 },
  openingTitleSub: { color: '#8B647E', fontSize: 9, fontWeight: '900', letterSpacing: 2.6, marginTop: 1 },
  openingTagline: { color: '#694C5E', fontSize: 12, fontWeight: '900', marginTop: -7, textShadowColor: 'rgba(255,250,233,0.9)', textShadowRadius: 4 },
  openingScene: { position: 'absolute', top: 176, left: 0, right: 0, height: 432 },
  openingHalo: { position: 'absolute', top: 38, left: '50%', width: 300, height: 300, marginLeft: -150, zIndex: 1 },
  openingMobby: { position: 'absolute', top: 69, left: '50%', width: 222, height: 252, marginLeft: -111, zIndex: 3 },
  openingPackage: { position: 'absolute', top: 258, left: '50%', width: 180, height: 180, marginLeft: -90, zIndex: 4 },
  openingKeyDecoration: { position: 'absolute' },
  openingSparkle: { position: 'absolute', color: '#FFF0A5', fontSize: 27, fontWeight: '900', zIndex: 5, textShadowColor: '#D77E97', textShadowRadius: 6 },
  openingSparkleOne: { top: 61, left: 54 },
  openingSparkleTwo: { top: 76, right: 58, fontSize: 22 },
  openingSparkleThree: { top: 248, right: 39, fontSize: 18 },
  openingStartWrap: { position: 'absolute', left: 0, right: 0, bottom: 26, alignItems: 'center', zIndex: 9 },
  openingStartButton: { width: 292, height: 126, alignItems: 'center', justifyContent: 'center', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  openingStartLoading: { opacity: 0.78 },
  openingStartPressed: { transform: [{ scale: 0.96 }] },
  openingStartPlaque: { width: 292, height: 126, alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  openingStartTitle: { color: '#64425D', fontSize: 16, fontWeight: '900', letterSpacing: 1.7 },
  openingStartSub: { color: '#9A707C', fontSize: 10, fontWeight: '900', marginTop: 3 },
  header: { minHeight: 74, paddingHorizontal: 13, paddingTop: 7, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent', borderBottomWidth: 0 },
  logo: { width: 103, height: 50, marginLeft: -5 },
  headerCopy: { flex: 1, marginLeft: 2 },
  headerKicker: { color: '#806174', fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  headerDay: { color: '#49334E', fontSize: 12, fontWeight: '900', marginTop: 3 },
  headerDot: { color: '#D18A9C' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  soundButton: { width: 35, height: 35, borderRadius: 13, borderWidth: 1.2, borderColor: '#D5B48F', backgroundColor: '#FFF6DF', alignItems: 'center', justifyContent: 'center', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  soundButtonMuted: { backgroundColor: '#EEE4DF', borderColor: '#CCB9B6' },
  soundButtonText: { color: '#76536F', fontSize: 19, lineHeight: 21, fontWeight: '900' },
  soundButtonTextMuted: { color: '#9B8687', fontSize: 18 },
  bellButton: { width: 35, height: 35, borderRadius: 13, borderWidth: 1.2, borderColor: '#E1BF9D', backgroundColor: '#FFFDF6', alignItems: 'center', justifyContent: 'center' },
  bellIcon: { width: 21, height: 21 },
  bellBadge: { position: 'absolute', right: -4, top: -6, width: 17, height: 17, borderRadius: 9, backgroundColor: '#E47884', borderWidth: 1.5, borderColor: '#FFF8EC', alignItems: 'center', justifyContent: 'center' },
  bellBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  notificationOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 80 },
  notificationBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(63,42,56,0.2)' },
  notificationPopup: { position: 'absolute', top: 61, left: 12, right: 12, padding: 10, borderRadius: 23, backgroundColor: '#FFF9EC', borderWidth: 1.4, borderColor: '#DCB991', shadowColor: '#4E354A', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 14 },
  notificationPointer: { position: 'absolute', top: -7, right: 20, width: 16, height: 16, backgroundColor: '#FFF9EC', borderLeftWidth: 1.2, borderTopWidth: 1.2, borderColor: '#DCB991', transform: [{ rotate: '45deg' }] },
  notificationHeader: { minHeight: 49, paddingLeft: 6, paddingRight: 2, paddingBottom: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notificationTitle: { color: '#5B3E59', fontSize: 17, lineHeight: 21, fontWeight: '900', letterSpacing: 0.5 },
  notificationSubtitle: { color: '#9A7479', fontSize: 9, fontWeight: '800', marginTop: 2 },
  notificationCloseButton: { width: 31, height: 31, borderRadius: 12, backgroundColor: '#F3E3D5', alignItems: 'center', justifyContent: 'center', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  notificationCloseText: { color: '#775568', fontSize: 23, lineHeight: 25, marginTop: -2 },
  notificationItem: { minHeight: 72, marginTop: 7, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 17, backgroundColor: '#FFFDF6', borderWidth: 1, borderColor: '#EAD9C4', flexDirection: 'row', alignItems: 'center', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  notificationItemFeatured: { backgroundColor: '#FFF3DD', borderColor: '#E3B985' },
  notificationItemPressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  notificationIcon: { width: 42, height: 42, marginRight: 9, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1.2 },
  notificationIconTime: { backgroundColor: '#F1D4A6', borderColor: '#D3A56C' },
  notificationIconCollection: { backgroundColor: '#EAD9E6', borderColor: '#C9A8C0' },
  notificationIconTrade: { backgroundColor: '#DDE6D5', borderColor: '#B0C29F' },
  notificationIconText: { color: '#6A4C68', fontSize: 20, fontWeight: '900' },
  notificationCopy: { flex: 1, minWidth: 0 },
  notificationItemHeading: { flexDirection: 'row', alignItems: 'center' },
  notificationKicker: { color: '#A17972', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  notificationLiveBadge: { marginLeft: 7, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: '#E47780' },
  notificationLiveText: { color: '#FFF9ED', fontSize: 7, fontWeight: '900' },
  notificationItemTitle: { color: '#5B4057', fontSize: 12, lineHeight: 16, fontWeight: '900', marginTop: 2 },
  notificationItemBody: { color: '#917276', fontSize: 9, lineHeight: 13, fontWeight: '700', marginTop: 1 },
  notificationChevron: { color: '#A98787', fontSize: 25, lineHeight: 27, marginLeft: 5 },
  noticeToast: { position: 'absolute', zIndex: 30, top: 78, left: 15, right: 15, minHeight: 44, paddingHorizontal: 13, borderRadius: 15, backgroundColor: '#503B65', flexDirection: 'row', alignItems: 'center', shadowColor: '#3E294D', shadowOpacity: 0.23, shadowRadius: 9, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  noticeToastText: { flex: 1, color: '#FFF8ED', fontSize: 11, fontWeight: '800' },
  noticeToastClose: { color: '#F5CED2', fontSize: 21, marginLeft: 8 },
  screenBody: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingTop: 13, paddingBottom: 105 },
  timeScrollContent: { paddingHorizontal: 14, paddingTop: 0, alignItems: 'center' },
  homeScreenBackground: { flex: 1 },
  brandWrap: { width: 104, alignItems: 'center', justifyContent: 'center', marginLeft: -5 },
  headerSpacer: { flex: 1 },
  brand: { color: '#5A3A6A', fontSize: 25, lineHeight: 28, fontWeight: '900', letterSpacing: 1.3 },
  brandSub: { color: '#806189', fontSize: 10, fontWeight: '900', letterSpacing: 2.2, marginTop: -2 },
  homeRoom: { flex: 1, position: 'relative', overflow: 'hidden' },
  homeShelfBase: { position: 'absolute', top: '-15%', left: 0, right: 0, width: '100%', height: '100%', zIndex: 0 },
  homeGarland: { position: 'absolute', top: -27, left: 5, width: 430, height: 138, zIndex: 1, opacity: 0.86 },
  homeEditButton: { position: 'absolute', top: 2, right: 12, zIndex: 24, minWidth: 70, height: 34, paddingHorizontal: 12, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,239,0.94)', borderWidth: 1.2, borderColor: '#D7B18D', shadowColor: '#624651', shadowOpacity: 0.16, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  homeEditButtonActive: { backgroundColor: '#6B547D', borderColor: '#EEDAE4' },
  homeEditButtonText: { color: '#6B4A62', fontSize: 11, fontWeight: '900' },
  homeEditButtonTextActive: { color: '#FFF9EC' },
  homeEditGuide: { position: 'absolute', left: 16, right: 16, bottom: 82, zIndex: 24, minHeight: 54, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(83,58,101,0.95)', borderWidth: 1.2, borderColor: '#E8C9D8', shadowColor: '#3E294D', shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  homeEditGuideTitle: { color: '#F7D7E3', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  homeEditGuideText: { color: '#FFF9EB', fontSize: 11, fontWeight: '900', textAlign: 'center', marginTop: 2 },
  // Nine keychains are distributed over two broad rows so the center stage
  // remains clear for the selected Mobby and the shelf below.
  homeWallKeys: { position: 'absolute', top: '7%', left: '7%', right: '7%', height: '43%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'flex-start', zIndex: 2 },
  homeWallKey: { width: '17%', height: '43%', alignItems: 'center', justifyContent: 'flex-start', borderRadius: 12, position: 'relative', overflow: 'visible', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  homeWallKeySelected: { backgroundColor: 'rgba(255,244,196,0.34)', shadowColor: '#FFF0A8', shadowOpacity: 0.8, shadowRadius: 9, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  homeWallKeyHidden: { opacity: 0 },
  homeDecorationEditable: { borderWidth: 1.2, borderColor: 'rgba(107,84,125,0.48)', borderStyle: 'dashed', backgroundColor: 'rgba(255,250,232,0.18)' },
  homeDecorationTarget: { borderColor: '#D5748B', backgroundColor: 'rgba(255,225,232,0.34)' },
  homeDecorationEditSelected: { borderWidth: 2.5, borderStyle: 'solid', borderColor: '#6B547D', backgroundColor: 'rgba(255,244,196,0.56)', shadowColor: '#FFF0A8', shadowOpacity: 0.88, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 7 },
  homeSlotBadge: { position: 'absolute', top: -8, right: -5, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6B547D', borderWidth: 1.5, borderColor: '#FFF9EA', zIndex: 8 },
  homeSlotBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  homeWallHook: { position: 'absolute', top: -25, left: '50%', width: 54, height: 81, marginLeft: -27, zIndex: 0 },
  // The hook plate's round center is the hanging point. Start each keychain
  // there so the chain visibly comes out of the center of the wood hook.
  homeWallKeyImage: { width: 76, height: 84, marginTop: 11 },
  // The wall image has its first wooden shelf directly below the key pegs.
  // Keep the plush feet on that shelf board instead of letting them fall onto
  // the rug at the bottom of the room.
  // The base image's visible top surface sits just below its alpha edge;
  // this fractional offset puts the visible foot soles on that surface.
  // The transparent base's top surface sits just below the artwork's visual
  // center.  Keep the plush row a little lower so each visible foot meets the
  // wood instead of floating above it (the source images contain transparent
  // padding below the feet).
  homePlushShelf: { position: 'absolute', left: '8%', right: '8%', height: '18%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 3 },
  homePlushItem: { width: '22%', height: '100%', alignItems: 'center', justifyContent: 'flex-end', borderRadius: 13, position: 'relative', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  homePlushItemSelected: { backgroundColor: 'rgba(255,244,196,0.32)', shadowColor: '#FFF0A8', shadowOpacity: 0.8, shadowRadius: 9, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  homePlushImage: { width: 70, height: 80 },
  homePlushSlotBadge: { top: -5, right: -4 },
  homeSelectablePressed: { opacity: 0.74, transform: [{ scale: 0.96 }] },
  homeCharacterPicker: { position: 'absolute', left: 14, right: 14, bottom: 82, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  homeCharacterPickerCompact: { bottom: 52 },
  homeCharacterArrow: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,249,237,0.92)', borderWidth: 1.2, borderColor: '#E2BF9B', shadowColor: '#684B4B', shadowOpacity: 0.18, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3, outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  homeCharacterArrowText: { color: '#76516C', fontSize: 30, lineHeight: 32, marginTop: -2 },
  homeMainCharacter: { position: 'absolute', left: '50%', bottom: 90, width: 220, height: 250, marginLeft: -110, zIndex: 8 },
  homeMainCharacterCompact: { bottom: 60, width: 178, height: 198, marginLeft: -89 },
  homeMainCharacterPullable: { alignItems: 'center', justifyContent: 'flex-end', overflow: 'visible' },
  homeMainCharacterEditing: { opacity: 0.13 },
  homeReactionBubble: { position: 'absolute', right: 10, width: 120, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 15, backgroundColor: '#FFFDF5', borderWidth: 1, borderColor: '#E8CDB4', transform: [{ rotate: '-2deg' }], zIndex: 12 },
  homeReactionTailBorder: { position: 'absolute', left: 14, bottom: -22, width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 24, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#E8CDB4', transform: [{ rotate: '30deg' }] },
  homeReactionTail: { position: 'absolute', left: 15, bottom: -18, width: 0, height: 0, borderLeftWidth: 9, borderRightWidth: 9, borderTopWidth: 21, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#FFFDF5', transform: [{ rotate: '30deg' }], zIndex: 1 },
  homeReactionBubbleText: { color: '#5E4057', fontSize: 10, lineHeight: 14, fontWeight: '900', textAlign: 'center' },
  wallFlightOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 60, overflow: 'hidden' },
  wallFlightStatus: { position: 'absolute', top: 84, left: 72, right: 72, minHeight: 38, borderRadius: 18, backgroundColor: 'rgba(83,58,101,0.94)', alignItems: 'center', justifyContent: 'center', zIndex: 6, borderWidth: 1, borderColor: '#E9C7DA' },
  wallFlightStatusText: { color: '#FFF8E9', fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },
  wallFlightItem: { position: 'absolute', left: 0, top: 0, width: 84, height: 92, alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  wallFlightImage: { width: 84, height: 92 },
  wallFlightTrail: { position: 'absolute', left: 0, top: 0, width: 84, height: 92, borderRadius: 46, backgroundColor: 'rgba(255,242,166,0.5)', borderWidth: 4, borderColor: '#FFF1A8' },
  wallLandingBurst: { position: 'absolute', width: 76, height: 76, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,244,176,0.44)', borderWidth: 3, borderColor: '#FFF4B6', zIndex: 2 },
  wallLandingBurstText: { color: '#FFF8CA', fontSize: 42, fontWeight: '900', textShadowColor: '#C7748D', textShadowRadius: 8 },
  collectionHeaderBar: { position: 'absolute', top: 7, left: 10, right: 10, height: 36, borderRadius: 14, backgroundColor: 'rgba(255,253,245,0.94)', borderWidth: 1.1, borderColor: '#E8D0B3', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, zIndex: 10 },
  collectionScreenBackground: { flex: 1, backgroundColor: 'transparent' },
  collectionScrollContent: { flex: 1, position: 'relative' },
  collectionBoardShadow: { position: 'absolute', top: 84, left: 30, width: 380, borderRadius: 36, backgroundColor: 'rgba(72,44,31,0.24)', shadowColor: '#3D281F', shadowOpacity: 0.42, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 11, zIndex: 1 },
  collectionDisplayBoard: { position: 'absolute', top: COLLECTION_BOARD_TOP, left: 25, width: 390, borderRadius: 36, overflow: 'hidden', zIndex: 2 },
  backButton: { width: 27, height: 27, borderRadius: 10, backgroundColor: '#F9EEDC', alignItems: 'center', justifyContent: 'center' },
  backButtonText: { color: '#604664', fontSize: 25, lineHeight: 26, marginTop: -3 },
  collectionHeaderTitle: { flex: 1, color: '#5B3F57', fontSize: 14, fontWeight: '900', textAlign: 'center' },
  collectionHeaderHeart: { width: 27, height: 27, borderRadius: 10, backgroundColor: '#F8E1E2', alignItems: 'center', justifyContent: 'center' },
  collectionHeaderHeartText: { color: '#9D6377', fontSize: 20 },
  collectionModeTabs: { position: 'absolute', top: 47, left: 10, width: 204, height: 28, flexDirection: 'row', padding: 2, borderRadius: 13, backgroundColor: 'rgba(231,217,227,0.94)', zIndex: 10 },
  collectionModeTab: { flex: 1, minWidth: 0, paddingHorizontal: 5, paddingVertical: 5, borderRadius: 11, alignItems: 'center' },
  collectionModeTabActive: { backgroundColor: '#6B547D' },
  collectionModeText: { color: '#755B73', fontSize: 10, fontWeight: '900' },
  collectionModeTextActive: { color: '#FFF8EA' },
  collectionKeySizeTabs: { position: 'absolute', top: 47, right: 10, width: 204, height: 28, flexDirection: 'row', padding: 2, borderRadius: 12, backgroundColor: 'rgba(241,231,226,0.94)', borderWidth: 1, borderColor: '#E6D3CC', zIndex: 10 },
  collectionKeySizeTab: { flex: 1, minWidth: 0, paddingHorizontal: 4, paddingVertical: 4, borderRadius: 9, alignItems: 'center' },
  collectionKeySizeTabActive: { backgroundColor: '#E8C3B2' },
  collectionKeySizeText: { color: '#8C6A73', fontSize: 9, fontWeight: '900' },
  collectionKeySizeTextActive: { color: '#5E4059' },
  collectionDisplay: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'transparent', overflow: 'visible', zIndex: 3 },
  collectionDisplayPlush: { backgroundColor: 'transparent' },
  keyCollectionGrid: { ...StyleSheet.absoluteFillObject },
  collectionKeyItem: { width: 82, alignItems: 'center' },
  collectionKeyItemAnchored: { position: 'absolute' },
  collectionKeyPressable: { alignItems: 'center', outlineColor: 'transparent', outlineWidth: 0 },
  collectionKeySwing: { alignItems: 'center', transformOrigin: '50% 0%' },
  collectionKeyHook: { height: 29, alignItems: 'center' },
  collectionKeyHookOwned: { height: 0 },
  collectionKeyRing: { width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: '#77685D', backgroundColor: '#EFE1CC' },
  collectionKeyStem: { width: 3, height: 17, backgroundColor: '#77685D', borderRadius: 2, marginTop: -1 },
  collectionKeyBody: { width: 55, height: 70, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(91,64,75,0.28)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  collectionKeyBodyOwned: { width: 86, height: 101, borderRadius: 0, borderWidth: 0, borderColor: 'transparent', backgroundColor: 'transparent', overflow: 'visible' },
  collectionKeySelected: { transform: [{ scale: 1.06 }] },
  collectionKeyImage: { width: 86, height: 101 },
  collectionKeyName: { width: 82, color: '#604757', fontSize: 8, fontWeight: '900', textAlign: 'center', marginTop: 1, textShadowColor: 'rgba(255,248,230,0.9)', textShadowRadius: 2 },
  collectionLocked: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(96,80,94,0.52)', alignItems: 'center', justifyContent: 'center' },
  collectionLockedText: { color: '#FFF7E6', fontSize: 27, fontWeight: '900' },
  plushCollectionShelf: { ...StyleSheet.absoluteFillObject },
  plushCollectionItem: { position: 'absolute', width: 88, height: 108, alignItems: 'center' },
  plushCollectionBody: { width: 88, height: 96, borderRadius: 24, borderWidth: 1.4, borderColor: 'rgba(86,58,58,0.27)', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  plushCollectionBodyOwned: { width: 88, height: 96, borderRadius: 0, borderWidth: 0, borderColor: 'transparent', backgroundColor: 'transparent', overflow: 'visible' },
  plushCollectionSelected: { transform: [{ scale: 1.05 }] },
  plushCollectionImage: { position: 'absolute', width: 88, height: 96 },
  collectionPlushName: { width: 88, color: '#5E4055', fontSize: 8, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(255,248,230,0.94)', textShadowRadius: 2, marginTop: 1 },
  collectionCountRow: { position: 'absolute', left: 10, right: 10, bottom: 82, minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: 'rgba(255,244,217,0.92)', borderWidth: 1, borderColor: '#E4C7A4', zIndex: 10 },
  collectionCount: { color: '#5D4257', fontSize: 21, fontWeight: '900', marginRight: 7 },
  collectionProgress: { flex: 1, marginRight: 8 },
  collectionCountHint: { color: '#9A777A', fontSize: 9, fontWeight: '900' },
  collectionProgressTrack: { height: 7, marginTop: 5, borderRadius: 4, backgroundColor: '#F1E6D7', overflow: 'hidden' },
  collectionProgressFill: { height: '100%', borderRadius: 4, backgroundColor: '#74546F' },
  collectionFilter: { minWidth: 72, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 16, backgroundColor: '#FFF9EC', alignItems: 'center', justifyContent: 'center' },
  collectionFilterText: { color: '#81616C', fontSize: 9, fontWeight: '900' },
  timeBanner: { minHeight: 72, borderRadius: 21, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: '#5B4672', flexDirection: 'row', alignItems: 'center', shadowColor: '#3B294D', shadowOpacity: 0.16, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  timeBannerClosed: { backgroundColor: '#8D7789' },
  timeBadge: { width: 47, height: 47, borderRadius: 18, backgroundColor: '#F3D6AF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  sparkleIcon: { width: 32, height: 32 },
  timeCopy: { flex: 1 },
  timeLabel: { color: '#FFF8EC', fontSize: 16, fontWeight: '900', letterSpacing: 1.2 },
  timeSub: { color: '#EEDBE2', fontSize: 10, fontWeight: '700', marginTop: 3 },
  timeCount: { alignItems: 'flex-end', paddingLeft: 7 },
  timeCountCaption: { color: '#EFDCE3', fontSize: 10, fontWeight: '800' },
  timeCountValue: { color: '#FFF8EC', fontSize: 21, fontWeight: '900', letterSpacing: 1 },
  heroNote: { marginTop: 13, paddingVertical: 11, paddingHorizontal: 17, borderRadius: 18, backgroundColor: '#FFFDF5', borderWidth: 1.2, borderColor: '#E7CFB2', transform: [{ rotate: '-0.5deg' }] },
  notePin: { position: 'absolute', top: -5, left: '50%', width: 12, height: 12, borderRadius: 6, backgroundColor: '#DB9C88', borderWidth: 2, borderColor: '#FFF2DD' },
  heroNoteText: { color: '#5C3B54', fontSize: 15, fontWeight: '900', textAlign: 'center' },
  heroNoteSub: { color: '#A77E7C', fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 3 },
  eyebrow: { color: '#9A7485', fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  sectionTitleRow: { marginTop: 19, marginBottom: 9, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionTitle: { color: '#4C3451', fontSize: 19, fontWeight: '900', marginTop: 2 },
  sectionAction: { color: '#A47483', fontSize: 10, fontWeight: '900', paddingBottom: 2 },
  roomCard: { height: 365, borderRadius: 24, overflow: 'hidden', borderWidth: 1.5, borderColor: '#D4AE86', backgroundColor: '#ECD5B6' },
  roomCardImage: { opacity: 0.92 },
  roomShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 244, 219, 0.34)' },
  roomTopline: { paddingHorizontal: 12, paddingTop: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: '#FFF9E9', borderWidth: 1, borderColor: '#E6C6A0' },
  pillPurple: { backgroundColor: '#6A557E', borderColor: '#5B466E' },
  pillPink: { backgroundColor: '#F5D1D3', borderColor: '#E7AEB6' },
  pillText: { color: '#5A3E55', fontSize: 10, fontWeight: '900' },
  roomCount: { color: '#745467', fontSize: 11, fontWeight: '900', backgroundColor: 'rgba(255,249,232,0.84)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  keyWall: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', paddingHorizontal: 14, paddingTop: 8 },
  hangingKey: { width: '19%', alignItems: 'center', marginBottom: 5 },
  hook: { width: 19, height: 25, alignItems: 'center' },
  hookTop: { width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: '#7F6B5F', backgroundColor: '#E9D5B8' },
  hookStem: { width: 3, height: 17, backgroundColor: '#7F6B5F', marginTop: -2, borderRadius: 3 },
  hangingBody: { width: 48, height: 63, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(93,65,77,0.32)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#654A49', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
  hangingBodySelected: { borderColor: '#FFF9DF', borderWidth: 3, transform: [{ scale: 1.05 }] },
  hangingImage: { width: 49, height: 62 },
  hangingUnknown: { color: '#766A6A', fontSize: 26, fontWeight: '900' },
  shelf: { position: 'absolute', left: 12, right: 12, bottom: 43, height: 122, borderRadius: 14, backgroundColor: 'rgba(102,68,55,0.22)', paddingTop: 10 },
  shelfBoard: { position: 'absolute', left: -2, right: -2, bottom: -2, height: 14, borderRadius: 7, backgroundColor: '#8C5E48', borderWidth: 1, borderColor: '#694536' },
  shelfItems: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingHorizontal: 8, paddingBottom: 9 },
  shelfItem: { width: '30%', alignItems: 'center' },
  plushBack: { width: 73, height: 87, borderRadius: 26, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(83,55,52,0.28)' },
  shelfImage: { width: 75, height: 85 },
  shelfUnknown: { color: '#6E5C5F', fontSize: 28, fontWeight: '900', marginBottom: 20 },
  shelfLabel: { color: '#FFF8EA', fontSize: 9, fontWeight: '900', textShadowColor: '#5A3A35', textShadowRadius: 3, marginTop: 2 },
  roomFooter: { position: 'absolute', left: 12, right: 12, bottom: 10, flexDirection: 'row', justifyContent: 'space-between' },
  roomFooterText: { color: '#6F4D4D', fontSize: 9, fontWeight: '900', backgroundColor: 'rgba(255,248,229,0.76)', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '31.5%', marginBottom: 11, padding: 5, borderRadius: 17, backgroundColor: '#FFFDF6', borderWidth: 1, borderColor: '#E8D3B7' },
  tileSelected: { borderColor: '#96709A', backgroundColor: '#F8EDF0', shadowColor: '#76506D', shadowOpacity: 0.16, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tileImageWrap: { height: 83, borderRadius: 13, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  tileImage: { width: 77, height: 80 },
  keyLoop: { position: 'absolute', top: 4, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(87,61,62,0.58)' },
  lockVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(78,63,74,0.54)', alignItems: 'center', justifyContent: 'center' },
  lockText: { color: '#FFF5E8', fontSize: 27, fontWeight: '900' },
  tileName: { color: '#5C3E54', fontSize: 10, fontWeight: '900', marginTop: 5 },
  tileMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  tileRarity: { color: '#B07C8B', fontSize: 9, fontWeight: '900' },
  tileCount: { color: '#8D6A6D', fontSize: 9, fontWeight: '900' },
  timeHeader: { alignSelf: 'stretch', alignItems: 'center', paddingTop: 0, paddingBottom: 5 },
  bigTitle: { color: '#4D3455', fontSize: 29, fontWeight: '900', letterSpacing: 1.2, marginTop: 3 },
  timeHeaderSub: { color: '#946F7D', fontSize: 11, fontWeight: '800', marginTop: 2, textAlign: 'center' },
  bigTimer: { marginTop: 3, width: 178, height: 62, alignItems: 'center', justifyContent: 'center', paddingTop: 2 },
  bigTimerLabel: { color: '#806073', fontSize: 8, lineHeight: 9, fontWeight: '900' },
  bigTimerValue: { color: '#5A3C55', fontSize: 23, lineHeight: 25, fontWeight: '900', letterSpacing: 2 },
  bigTimerUnit: { color: '#96727E', fontSize: 6, lineHeight: 7, fontWeight: '900', letterSpacing: 0.8 },
  encounterCard: { alignSelf: 'center', paddingTop: 56, paddingHorizontal: 43, paddingBottom: 22 },
  encounterCardImage: { borderRadius: 24 },
  arrivalNotice: { minHeight: 36, marginBottom: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  arrivalNoticeText: { color: '#68465F', fontSize: 13, fontWeight: '900' },
  encounterStepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  timeStepWrap: { flexDirection: 'row', alignItems: 'flex-start' },
  encounterStep: { alignItems: 'center', opacity: 0.48 },
  encounterStepActive: { alignItems: 'center' },
  stepNo: { color: '#8E687D', fontSize: 9, fontWeight: '900' },
  stepText: { color: '#5C3E54', fontSize: 10, fontWeight: '900', marginTop: 2 },
  stepLine: { width: 36, height: 1.5, backgroundColor: '#DFC7B0', marginHorizontal: 8, marginTop: 9 },
  stepLineDone: { backgroundColor: '#8E687D' },
  encounterScene: { height: 300, borderRadius: 26, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  encounterHaloAsset: { position: 'absolute', width: 252, height: 252, zIndex: 2 },
  packageAnimationWrap: { zIndex: 3, alignItems: 'center', justifyContent: 'center' },
  mobbyPackage: { width: 210, height: 210, alignItems: 'center', justifyContent: 'center', position: 'relative', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  packagePressed: { transform: [{ rotate: '1deg' }, { scale: 0.96 }] },
  packageAsset: { position: 'absolute', width: 210, height: 210 },
  packageBrandOverlay: { position: 'absolute', top: 125, left: 46, right: 46, height: 40, alignItems: 'center', justifyContent: 'center' },
  packageLogo: { color: '#68465F', fontSize: 15, lineHeight: 17, fontWeight: '900', letterSpacing: 1.6 },
  packageHint: { color: '#8B6774', fontSize: 6, fontWeight: '900', letterSpacing: 1.1, marginTop: 2 },
  packageTapCaption: { color: '#7B5A6B', fontSize: 11, fontWeight: '900', textAlign: 'center', marginTop: 6 },
  magicRing: { position: 'absolute', width: 238, height: 238, zIndex: 2 },
  magicParticles: { ...StyleSheet.absoluteFillObject, zIndex: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 28 },
  magicParticle: { color: '#FFF7B8', fontSize: 32, fontWeight: '900', textShadowColor: '#D98FA0', textShadowRadius: 8 },
  revealFlash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFFBE8', zIndex: 7 },
  encounterRewardWrap: { width: 218, height: 238, alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  encounterKeyImage: { width: 218, height: 238 },
  placementHalo: { position: 'absolute', width: 226, height: 226, zIndex: 2 },
  placementSparkles: { ...StyleSheet.absoluteFillObject, zIndex: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 18 },
  placementSparkle: { color: '#FFF4A8', fontSize: 27, fontWeight: '900', textShadowColor: '#C96F8B', textShadowRadius: 7 },
  newBadge: { position: 'absolute', left: 7, bottom: 4, width: 72, height: 72, alignItems: 'center', justifyContent: 'center', paddingBottom: 12, transform: [{ rotate: '-7deg' }], zIndex: 5 },
  newBadgeText: { color: '#FFF8ED', fontSize: 11, fontWeight: '900', letterSpacing: 0.6, textShadowColor: 'rgba(91,58,76,0.34)', textShadowRadius: 2 },
  encounterSilhouette: { width: 154, height: 194, borderRadius: 75, alignItems: 'center', justifyContent: 'center', opacity: 0.64, borderWidth: 4, borderColor: 'rgba(67,55,69,0.26)' },
  silhouetteEyes: { color: '#5D5367', fontSize: 30, letterSpacing: 20, marginLeft: 17 },
  silhouetteQuestion: { color: '#5D5367', fontSize: 54, fontWeight: '900', marginTop: 13 },
  encounterImage: { width: 208, height: 246 },
  encounterBubble: { position: 'absolute', top: 4, right: 2, width: 138, height: 66, paddingHorizontal: 23, paddingTop: 15, alignItems: 'center', transform: [{ rotate: '2deg' }], zIndex: 6 },
  encounterBubbleTitle: { color: '#76506E', fontSize: 12, lineHeight: 14, fontWeight: '900' },
  encounterBubbleText: { color: '#6D5662', fontSize: 7, lineHeight: 9, fontWeight: '800', marginTop: 1, textAlign: 'center' },
  encounterCaption: { color: '#99777E', fontSize: 10, fontWeight: '700', textAlign: 'center', marginVertical: 6 },
  primaryButton: { minHeight: 49, borderRadius: 17, backgroundColor: '#6B547D', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 17 },
  primaryButtonDone: { backgroundColor: '#9A8491' },
  primaryButtonIcon: { width: 22, height: 22, marginRight: 5 },
  primaryButtonText: { color: '#FFF9EC', fontSize: 13, fontWeight: '900' },
  timePrimaryButton: { backgroundColor: 'transparent', borderRadius: 0, minHeight: 48 },
  timePrimaryButtonInactive: { opacity: 0.58 },
  timePrimaryButtonText: { color: '#5B3D54', textShadowColor: 'rgba(255,251,232,0.62)', textShadowRadius: 2 },
  touchTop: { paddingTop: 7, paddingBottom: 12 },
  touchTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  touchSub: { color: '#987480', fontSize: 11, fontWeight: '700', marginTop: 3 },
  rarityBadge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, marginLeft: 6 },
  rarityBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  touchScreenBackground: { flex: 1, backgroundColor: 'transparent' },
  touchScrollContent: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 105 },
  touchStage: { height: 500, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  pullableWrap: { width: 332, height: 365, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  pullableStage: { width: 320, height: 320, position: 'relative' },
  // PanResponder turns this view into an accessible button on web. Suppress
  // the browser's default focus ring so a completed pull does not leave a
  // harsh black rectangle over the parchment stage.
  pullableSlot: { ...StyleSheet.absoluteFillObject, width: 320, height: 320, alignItems: 'center', justifyContent: 'center', zIndex: 2, outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  pullableBody: { width: 320, height: 320 },
  pullableFaceLayer: { zIndex: 4 },
  pullableReactionLayer: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  pullableReactionFrame: { ...StyleSheet.absoluteFillObject },
  pullableReactionBurst: { position: 'absolute', zIndex: 4, left: '18%', top: '18%', width: '64%', height: '64%', borderRadius: 999, borderWidth: 4, borderColor: 'rgba(255, 225, 151, 0.8)' },
  reactionPatternButton: { position: 'absolute', zIndex: 20, width: 54, minHeight: 48, paddingHorizontal: 5, paddingVertical: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: 'rgba(255, 249, 235, 0.94)', borderWidth: 1.5, borderColor: '#D7AF84', shadowColor: '#6F4738', shadowOpacity: 0.16, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  reactionPatternButtonLarge: { left: -50, top: '43%' },
  reactionPatternButtonCompact: { left: -60, top: '41%' },
  reactionPatternButtonPressed: { transform: [{ scale: 0.94 }], opacity: 0.88 },
  reactionPatternCaption: { color: '#9A786D', fontSize: 8, fontWeight: '800', lineHeight: 11 },
  reactionPatternValue: { color: '#68465F', fontSize: 11, fontWeight: '900', lineHeight: 15 },
  animeEffectLayer: { ...StyleSheet.absoluteFillObject, zIndex: 6 },
  animeBurstRayWrap: { ...StyleSheet.absoluteFillObject },
  animeBurstRay: { position: 'absolute', width: 3, borderRadius: 3, backgroundColor: 'rgba(255, 225, 151, 0.88)' },
  animeCheekLine: { position: 'absolute', top: '38%', color: 'rgba(255, 220, 146, 0.9)', fontSize: 18, fontWeight: '900', letterSpacing: -4 },
  animeCheekLineLeft: { left: '3%', transform: [{ rotate: '-10deg' }] },
  animeCheekLineRight: { right: '3%', transform: [{ rotate: '10deg' }] },
  animeSpeedGroup: { position: 'absolute', top: '31%', gap: 7 },
  animeSpeedGroupLeft: { left: '1%', alignItems: 'flex-start' },
  animeSpeedGroupRight: { right: '1%', alignItems: 'flex-end' },
  animeSpeedLine: { height: 3, borderRadius: 3, backgroundColor: 'rgba(211, 111, 82, 0.8)' },
  animeAngerMark: { position: 'absolute', right: '12%', top: '15%', color: 'rgba(205, 78, 62, 0.82)', fontSize: 23, fontWeight: '900', transform: [{ rotate: '-18deg' }] },
  animeGloomLines: { position: 'absolute', left: '17%', top: '9%', flexDirection: 'row', gap: 7, alignItems: 'flex-start' },
  animeGloomLine: { width: 3, height: 27, borderRadius: 3, backgroundColor: 'rgba(103, 82, 120, 0.56)' },
  animeGloomLineShort: { height: 18 },
  animeSigh: { position: 'absolute', right: '10%', top: '37%', color: 'rgba(255, 238, 198, 0.72)', fontSize: 25, fontWeight: '900', transform: [{ rotate: '-12deg' }] },
  pullStatus: { position: 'absolute', bottom: -2, left: 0, right: 0, alignItems: 'center', zIndex: 4 },
  pullStatusText: { color: '#8A6672', fontSize: 9, fontWeight: '900', backgroundColor: 'rgba(255,248,232,0.78)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  stageLight: { position: 'absolute', width: 300, height: 300, borderRadius: 160, backgroundColor: 'rgba(255,248,229,0.55)' },
  touchImage: { width: 285, height: 335 },
  touchBubble: { position: 'absolute', top: 15, left: 14, maxWidth: 180, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 16, backgroundColor: '#FFFDF5', borderWidth: 1, borderColor: '#E8CDB4', transform: [{ rotate: '-3deg' }] },
  touchBubbleText: { color: '#5E4057', fontSize: 12, fontWeight: '900' },
  touchHand: { position: 'absolute', right: 19, bottom: 21, color: '#F0B99E', fontSize: 54, fontWeight: '900', transform: [{ rotate: '-18deg' }], textShadowColor: 'rgba(89,55,63,0.22)', textShadowRadius: 3 },
  touchHearts: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row' },
  touchHeart: { color: '#D57889', fontSize: 21, marginLeft: 5 },
  touchTip: { marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: '#F2E4E2', flexDirection: 'row', alignItems: 'center' },
  tipMobbyIcon: { width: 35, height: 35, marginRight: 7 },
  touchTipText: { flex: 1, color: '#906D77', fontSize: 10, fontWeight: '800', lineHeight: 14 },
  touchFooter: { color: '#AC8284', fontSize: 10, fontWeight: '800', textAlign: 'center', marginTop: 13 },
  tradeScrollContent: { paddingHorizontal: 14, paddingTop: 0, alignItems: 'center' },
  tradeHeader: { alignSelf: 'stretch', paddingTop: 0, paddingBottom: 5 },
  tradeSub: { color: '#987480', fontSize: 10, fontWeight: '700', marginTop: 1 },
  tradeBoardAsset: { alignSelf: 'center', paddingTop: 72, paddingHorizontal: 36 },
  tradeBoardAssetImage: { borderRadius: 28 },
  tradeCard: { backgroundColor: 'transparent' },
  tradeCardFirst: { minHeight: 0, paddingHorizontal: 20 },
  tradeCardSecond: { marginTop: 24, paddingHorizontal: 20 },
  tradeCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tradeCardKicker: { color: '#A47887', fontSize: 7, fontWeight: '900', letterSpacing: 1.1 },
  tradeCardTitle: { color: '#5B3D54', fontSize: 13, fontWeight: '900', marginTop: 1 },
  liveDot: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, paddingVertical: 3, borderRadius: 8, backgroundColor: '#F6DFDE' },
  liveDotCircle: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#E37A84', marginRight: 3 },
  liveDotText: { color: '#A66070', fontSize: 7, fontWeight: '900' },
  qrStage: { height: 92, borderRadius: 12, marginTop: 5, backgroundColor: 'rgba(255,250,239,0.48)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(177,128,106,0.32)' },
  qrPlaceholder: { alignItems: 'center' },
  qrPlaceholderIcon: { width: 30, height: 30, opacity: 0.72 },
  qrPlaceholderText: { color: '#967783', fontSize: 9, fontWeight: '800', marginTop: 3 },
  qrCode: { padding: 5, backgroundColor: '#FFF', borderRadius: 5, borderWidth: 1, borderColor: '#E2D8D1' },
  qrRow: { height: 4, flexDirection: 'row' },
  qrCell: { width: 4, height: 4, backgroundColor: '#FFF' },
  qrCellOn: { backgroundColor: '#3C3142' },
  tradePrimaryButton: { minHeight: 34, borderRadius: 12 },
  tradePrimaryButtonText: { fontSize: 11 },
  qrExpiry: { color: '#AE8A8A', fontSize: 7, fontWeight: '700', textAlign: 'center', marginTop: 3 },
  tradeItemRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  tradeItem: { flex: 1, alignItems: 'center' },
  tradeItemImage: { width: 60, height: 64, borderRadius: 15, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tradeImage: { width: 57, height: 61 },
  tradeItemName: { color: '#5D3F56', fontSize: 8, fontWeight: '900', marginTop: 2, textAlign: 'center' },
  tradeItemOwner: { color: '#A57E83', fontSize: 7, fontWeight: '800', marginTop: 1 },
  exchangeArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F2DFE3', alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
  exchangeArrowText: { color: '#86617A', fontSize: 22 },
  partnerItem: { flex: 1, alignItems: 'center' },
  partnerImage: { width: 60, height: 64, borderRadius: 15, backgroundColor: '#EFE5DC', borderWidth: 1.5, borderColor: '#D8C3B5', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  partnerQuestion: { color: '#B59E9D', fontSize: 24, fontWeight: '900' },
  partnerName: { color: '#7B5D69', fontSize: 8, fontWeight: '900', marginTop: 2 },
  tradePicker: { flexDirection: 'row', justifyContent: 'center', marginTop: 5 },
  tradePickerDot: { width: 27, height: 27, borderRadius: 9, marginHorizontal: 1, backgroundColor: '#F0DED7', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8C7B7' },
  tradePickerDotSelected: { borderColor: '#76547D', borderWidth: 2.5, backgroundColor: '#F4E6EC' },
  tradePickerImage: { width: 24, height: 24 },
  secondaryButton: { minHeight: 34, borderRadius: 12, backgroundColor: '#F0D8D7', alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  secondaryButtonText: { color: '#724E66', fontSize: 10, fontWeight: '900' },
  bottomNav: { position: 'absolute', left: 10, right: 10, bottom: Platform.OS === 'web' ? 12 : 5, height: 70, paddingHorizontal: 4, paddingVertical: 5, borderRadius: 25, backgroundColor: 'rgba(255,248,236,0.97)', borderWidth: 1.4, borderColor: '#E1BD9D', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#624651', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  navTab: { flex: 1, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  navTabActive: { backgroundColor: '#F3DDE0' },
  navIcon: { width: 24, height: 24, tintColor: '#A48189', marginBottom: 2 },
  navIconActive: { tintColor: '#705178' },
  navLabel: { color: '#9D7D84', fontSize: 9, fontWeight: '900' },
  navLabelActive: { color: '#694B70' },
  navDot: { position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: '#D17B8C' },
  pressed: { opacity: 0.74, transform: [{ translateY: 1 }] },
});
