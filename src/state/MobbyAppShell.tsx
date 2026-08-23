import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { router, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ZenMaruGothic_400Regular, ZenMaruGothic_500Medium, ZenMaruGothic_700Bold, ZenMaruGothic_900Black } from '@expo-google-fonts/zen-maru-gothic';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  Image,
  ImageBackground,
  Pressable,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text as NativeText,
  View,
  type TextProps,
} from 'react-native';

import { MobbyCarousel } from '@/components/MobbyCarousel';
import { getMobby } from '@/data/mobies';
import { getEnemy } from '@/data/enemies';
import { useMobbyAudio } from '@/hooks/useMobbyAudio';
import { IncidentCutIn } from '@/components/IncidentCutIn';
import { IncidentResolutionOverlay } from '@/components/IncidentResolutionOverlay';
import {
  IncidentCasebookScreen,
  type IncidentCasebookActiveEpisode,
  type IncidentCasebookEpisodeEntry,
  type IncidentCasebookRelationshipEntry,
  type IncidentCasebookTab,
} from '@/components/IncidentCasebookScreen';
import {
  acknowledgeEpisode,
  advanceEpisodeResolution,
  completeEpisode,
  decodeEpisodeStorage,
  dismissEpisodeResolution,
  freshEpisodeStorage,
  saveEpisodePlayback,
  startEpisode,
  type IncidentStorageV5,
  type ActiveEpisode,
} from '@/domain/incidents/episodeArchive';
import { createInitialPlaybackState } from '@/data/episodes/playback';
import { EPISODES, getEpisode, resolveEpisodeAsset } from '@/data/episodes/registry';
import type { Cue, EpisodeData, EpisodeId, PlaybackState } from '@/data/episodes/types';
import { useMobbyHaptics } from '@/hooks/useMobbyHaptics';
import { HomeScreen } from '@/screens/HomeScreen';
import { CollectionScreen } from '@/screens/CollectionScreen';
import { MobbyTimeScreen } from '@/screens/MobbyTimeScreen';
import { TouchScreen } from '@/screens/TouchScreen';
import { styles } from '@/ui/layout/appStyles';
import { ScreenTransition } from '@/components/ScreenTransition';
import { WallPlacementFlight } from '@/components/mobby-time/WallPlacementFlight';
import { DailyRecordPopover } from '@/components/shell/DailyRecordPopover';
import { MobbyTimePopover } from '@/components/shell/MobbyTimePopover';
import { NotificationsPopover } from '@/components/shell/NotificationsPopover';
import { SettingsPopover } from '@/components/shell/SettingsPopover';
import { ShellDetailPopover } from '@/components/shell/ShellDetailPopover';
import { selectTabScene } from '@/state/selectTabScene';
import { MISSION_BONUS, STAMP_REWARDS, reactionMilestoneReward } from '@/data/dailyRewards';
import { useDailyLoop } from '@/game/DailyLoopContext';
import { receiptBackedInventoryGrant, shouldGrantMobbyTimeReceipt, type PendingReward } from '@/game/dailyLoopStorage';
import { useResponsiveLayout } from '@/ui/layout/responsive';
import { zenMaruFamily } from '@/ui/text/fontFamily';
import { MobbyAssetButton, MobbyAssetIconButton } from '@/components/mobby-ui';
import {
  COLLECTIBLE_VARIANTS, EMPTY_OWNED, ITEMS, ITEM_MOBBY_IDS, collectibleInventoryKey,
  collectibleName, isCollectibleVariant, isItemId, itemCharacterName, legacyVariantForItem,
  normalizeCollectibleInventory, ownedCollectibleCount,
  type CollectibleVariant, type Item,
} from '@/data/collectibles';
import {
  createDefaultHomeLayout,
  decodeHomeLayout,
  homePlacementId,
  moveHomePlacement,
  placeHomeReward,
  reconcileHomeLayout,
  removeHomePlacement,
  type HomeLayoutV1,
  type HomePlacementId,
} from '@/domain/home/homeLayout';

type Screen = 'home' | 'collection' | 'time' | 'touch' | 'casebook' | 'episode';
type CollectibleReward = { item: Item; variant: CollectibleVariant; placementId: HomePlacementId };
type MobbyTimeStage = 'arrived' | 'opening' | 'revealed' | 'placing' | 'placed';
type OnboardingRewardState = {
  version: 1;
  eventId: string;
  itemId: string;
  variant: 'key-normal';
  phase: MobbyTimeStage;
  inventoryGranted: boolean;
};
type OnboardingStep = 'none' | 'favorite' | 'mobbyTime' | 'opening' | 'place' | 'wallFlight' | 'home' | 'collection' | 'time';
type IncidentResolutionPhase = 'none' | 'returning' | 'aftermath';

const LEGACY_SCENE_MAX_WIDTH = 720;
const BOTTOM_NAV_CELLS = [
  { left: 0, width: 106 },
  { left: 106, width: 106 },
  { left: 212, width: 106 },
  { left: 318, width: 106 },
] as const;

function isDarkTextColor(color: unknown) {
  if (typeof color !== 'string') return true;
  const value = color.trim().toLowerCase();
  if (value === 'transparent') return false;
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i)?.[1];
  if (hex) {
    const normalized = hex.length === 3 ? hex.split('').map((digit) => `${digit}${digit}`).join('') : hex.slice(0, 6);
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    return red * 0.299 + green * 0.587 + blue * 0.114 < 205;
  }
  const rgb = value.match(/^rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i);
  if (rgb) return Number(rgb[1]) * 0.299 + Number(rgb[2]) * 0.587 + Number(rgb[3]) * 0.114 < 205;
  return value !== 'white';
}
/** Keep display headings playful while body copy stays rounded, bold, and readable. */
function Text({ style, maxFontSizeMultiplier = 1.2, ...props }: TextProps) {
  const { scale } = useAppLayout();
  const flattened = StyleSheet.flatten(style);
  const fontSize = typeof flattened?.fontSize === 'number' ? flattened.fontSize : 12;
  const lineHeight = typeof flattened?.lineHeight === 'number' ? flattened.lineHeight : undefined;
  const compactTypeScale = Math.min(1.22, Math.max(1, 0.9 / Math.max(scale, 0.01)));
  const compactType = compactTypeScale > 1.005 && fontSize < 15
    ? {
        fontSize: fontSize * compactTypeScale,
        ...(lineHeight ? { lineHeight: lineHeight * compactTypeScale } : null),
      }
    : null;
  const fontWeight = flattened?.fontWeight;
  const fontFamily = zenMaruFamily(fontWeight);
  const ivoryEdge = isDarkTextColor(flattened?.color) && !flattened?.textShadowColor
    ? { textShadowColor: 'rgba(255,250,237,0.94)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 1.15 }
    : null;

  return <NativeText {...props} maxFontSizeMultiplier={maxFontSizeMultiplier} style={[style, compactType, ivoryEdge, { fontFamily, fontWeight: 'normal' }]} />;
}

function useAppLayout() {
  const { width, height } = useResponsiveLayout();
  return { width: Math.min(width, LEGACY_SCENE_MAX_WIDTH), height, scale: 1 };
}

const ROOM_BACKGROUND = require('../../assets/rooms/sunny-stitch-room.png');
const OPENING_BACKDROP = require('../../assets/generated-ui/opening-backdrop-v2.png');
const HOME_WALL_BACKGROUND = require('../../assets/backgrounds/home-room-rich-v2.png');
const HOME_GARLAND = require('../../assets/backgrounds/home-garland-trimmed-v1.png');
const COLLECTION_WALL_BACKGROUND = require('../../assets/backgrounds/home-wall.png');
const WOODEN_HOOK = require('../../assets/backgrounds/hook-transparent.png');
const PLUSH_SHELF_BASE = require('../../assets/backgrounds/plush-base-transparent.png');
const MOBBY_TIME_PACKAGE = require('../../assets/mobby-time-package.png');
const MOBBY_TIME_OPENED_BOX = require('../../assets/mobby-time-opened-box.png');
const MOBBY_TIME_TIMER_PLAQUE = require('../../assets/mobby-time/timer-plaque.png');
const MOBBY_TIME_MESSAGE_PLAQUE = require('../../assets/mobby-time/message-plaque.png');
const UI_WIDE_PAPER = require('../../assets/home-ui/panels/wide-paper.png');
const MODAL_SURFACE = require('../../assets/generated-ui/surface-modal-portrait-v1.png');
const NOTICE_SURFACE = require('../../assets/generated-ui/surface-status-wide-v1.png');
const HEADER_SETTINGS_ICON = require('../../assets/generated-ui/header-settings-icon-v1.png');
const TAKARA_MOBBY_LOGO = require('../../assets/home-ui/logo/takara-mobby-logo-transparent.png');
const BELL = require('../../assets/home-ui/icons/bell.png');
const MOBIYAN_LOADING = require('../../assets/loading/mobiyan-loading.webp');
const STORAGE_TUTORIAL_COMPLETE = '@mobby/tutorial-complete-v2';
const STORAGE_FAVORITE = '@mobby/favorite-v1';
const STORAGE_OWNED = '@mobby/owned-v2';
const STORAGE_OWNED_LEGACY = '@mobby/owned-v1';
const DAILY_REWARD_RECEIPT_PREFIX = '@daily-reward:';
const STORAGE_ONBOARDING_REWARD = '@mobby/onboarding-first-reward-v1';
const ONBOARDING_REWARD_EVENT_ID = 'onboarding:first-reward:v1';
const ONBOARDING_REWARD_RECEIPT = '@onboarding-reward:first-reward:v1';
const STORAGE_CASES = '@mobby/case-files-v2';
const STORAGE_HOME_LAYOUT = '@mobby/home-layout-v1';
const FEATURED_EPISODE_ID = 'episode-1' as const;
const EPISODE_PROGRESS_DEBOUNCE_MS = 180;
const MOBBY_TIME_STAGES: readonly MobbyTimeStage[] = ['arrived', 'opening', 'revealed', 'placing', 'placed'];

function decodeOnboardingReward(raw: string | null): OnboardingRewardState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingRewardState>;
    if (parsed.version !== 1 || !isItemId(parsed.itemId)) return null;
    const phase = MOBBY_TIME_STAGES.includes(parsed.phase as MobbyTimeStage) ? parsed.phase as MobbyTimeStage : 'arrived';
    return {
      version: 1,
      eventId: ONBOARDING_REWARD_EVENT_ID,
      itemId: parsed.itemId,
      variant: 'key-normal',
      phase,
      inventoryGranted: parsed.inventoryGranted === true,
    };
  } catch {
    return null;
  }
}

function ensureAllCollectiblesOwned(inventory: Record<string, number>) {
  const unlocked = { ...inventory };
  for (const item of ITEMS) {
    for (const variant of COLLECTIBLE_VARIANTS) {
      const key = collectibleInventoryKey(item.id, variant);
      unlocked[key] = Math.max(1, inventory[key] ?? 0);
    }
  }
  return unlocked;
}

const DEFAULT_OWNED: Record<string, number> = ITEMS.reduce<Record<string, number>>((inventory, item) => {
  inventory[collectibleInventoryKey(item.id, legacyVariantForItem(item))] = 1;
  return inventory;
}, { ...EMPTY_OWNED });

const INITIAL_OWNED: Record<string, number> = __DEV__ ? ensureAllCollectiblesOwned(DEFAULT_OWNED) : DEFAULT_OWNED;

function normalizeOwnedInventory(raw: Record<string, unknown>) {
  return normalizeCollectibleInventory(raw, (key) => key.startsWith(DAILY_REWARD_RECEIPT_PREFIX) || key === ONBOARDING_REWARD_RECEIPT);
}

type CollectibleDailyRewardDefinition = {
  itemId: string;
  variant: CollectibleVariant;
  amount: number;
};

function resolveCollectibleDailyReward(reward: PendingReward): CollectibleDailyRewardDefinition | null {
  const definition = reward.id === MISSION_BONUS.id
    ? MISSION_BONUS
    : STAMP_REWARDS.find((candidate) => candidate.id === reward.id)
      ?? (/^reaction-(25|50|75|100)$/.test(reward.id)
        ? reactionMilestoneReward(Number(reward.id.slice('reaction-'.length)) as 25 | 50 | 75 | 100)
        : null);
  if (!definition) return null;
  const collectible = definition as typeof definition & Partial<CollectibleDailyRewardDefinition>;
  const variant = collectible.variant;
  if (!isItemId(collectible.itemId)) return null;
  if (!isCollectibleVariant(variant)) return null;
  if (!Number.isSafeInteger(collectible.amount) || collectible.amount <= 0) return null;
  return { itemId: collectible.itemId, variant, amount: collectible.amount };
}

// The source illustrations have slightly different transparent padding below
// their feet. Normalize that padding so every plush touches the same shelf
// edge instead of making some characters appear to float.

// Foreground anchors align with the three-by-three pegs and shelves on the
// collection display board. Keeping them in design-space coordinates makes
// every item stay attached while the responsive app canvas is scaled.

const OPENING_KEY_DECORATIONS = [
  { itemIndex: 1, left: 18, top: 94, size: 117, fromY: 8, toY: -8, fromRotate: '-8deg', toRotate: '5deg', layer: 2 },
  { itemIndex: 6, left: 323, top: 88, size: 117, fromY: -7, toY: 8, fromRotate: '7deg', toRotate: '-5deg', layer: 2 },
  { itemIndex: 2, left: 58, top: 7, size: 96, fromY: 5, toY: -9, fromRotate: '-5deg', toRotate: '7deg', layer: 2 },
  { itemIndex: 7, left: 318, top: 12, size: 96, fromY: -8, toY: 5, fromRotate: '6deg', toRotate: '-6deg', layer: 2 },
  { itemIndex: 3, left: 0, top: 219, size: 108, fromY: 7, toY: -6, fromRotate: '-10deg', toRotate: '4deg', layer: 5 },
  { itemIndex: 8, left: 332, top: 222, size: 108, fromY: -6, toY: 8, fromRotate: '8deg', toRotate: '-4deg', layer: 5 },
  { itemIndex: 4, left: 42, top: 302, size: 99, fromY: 9, toY: -5, fromRotate: '-6deg', toRotate: '8deg', layer: 5 },
  { itemIndex: 5, left: 314, top: 296, size: 99, fromY: -7, toY: 7, fromRotate: '7deg', toRotate: '-7deg', layer: 5 },
] as const;


function Header({ onBell, onSettings }: { onBell: () => void; onSettings: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.brandWrap}><Image source={TAKARA_MOBBY_LOGO} resizeMode="contain" style={styles.headerLogoImage} /></View>
      <View style={styles.headerSpacer} />
      <View style={styles.headerActions}>
        <MobbyAssetIconButton accessibilityLabel="設定を開く" icon={HEADER_SETTINGS_ICON} iconStyle={styles.headerSettingsIcon} onPress={onSettings} style={styles.soundButton} />
        <MobbyAssetIconButton accessibilityLabel="お知らせ" icon={BELL} iconStyle={styles.bellIcon} onPress={onBell} style={[styles.bellButton, styles.pressableFocusReset]} badge={<View style={styles.bellBadge}><Text style={styles.bellBadgeText}>1</Text></View>} />
      </View>
    </View>
  );
}

function LoadingMascot({ compact = false }: { compact?: boolean }) {
  const motion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 520, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(motion, { toValue: 0, duration: 520, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [motion]);

  return (
    <View pointerEvents="none" style={[styles.loadingMascotWrap, compact && styles.loadingMascotWrapCompact]}>
      <Animated.Image
        source={MOBIYAN_LOADING}
        resizeMode="contain"
        style={[
          styles.loadingMascotImage,
          compact && styles.loadingMascotImageCompact,
          {
            transform: [
              { translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [4, -7] }) },
              { rotate: motion.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] }) },
            ],
          },
        ]}
      />
      <View style={styles.loadingDots}>
        {[0, 1, 2].map((index) => (
          <Animated.View
            key={index}
            style={[
              styles.loadingDot,
              {
                opacity: motion.interpolate({
                  inputRange: [0, 0.33, 0.66, 1],
                  outputRange: index === 0 ? [1, 0.28, 0.28, 1] : index === 1 ? [0.28, 1, 0.28, 0.28] : [0.28, 0.28, 1, 0.28],
                }),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function LoadingOverlay() {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="読み込み中" accessibilityViewIsModal style={styles.loadingOverlay}>
      <View style={styles.loadingCard}>
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}><ImageBackground source={MODAL_SURFACE} resizeMode="stretch" style={styles.loadingCardImage} /></View>
        <LoadingMascot />
        <Text style={styles.loadingTitle}>お部屋を準備中</Text>
        <Text style={styles.loadingText}>もびやんがグッズを運んでいます</Text>
      </View>
    </View>
  );
}

function FavoriteMobbyPicker({
  selectedId,
  onSelect,
  onConfirm,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
}) {
  const entrance = useRef(new Animated.Value(0)).current;
  const { scale } = useAppLayout();
  const selectedItem = ITEMS.find((item) => item.id === selectedId) ?? ITEMS[0];
  const selectedMobbyId = ITEM_MOBBY_IDS[selectedItem.id] ?? 'mobichi';

  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, speed: 18, bounciness: 7, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [entrance]);

  return (
      <View style={styles.onboardingOverlay}>
      <View style={styles.onboardingBackdrop} />
      <Animated.View style={[styles.favoriteCard, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}> 
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}><ImageBackground source={MODAL_SURFACE} resizeMode="stretch" style={styles.favoriteCardImage} /></View>
        <View pointerEvents="none" style={styles.favoriteGlassSheen} />
        <Text style={styles.onboardingKicker}>WELCOME TO MOBBY</Text>
        <Text style={styles.favoriteTitle}>お気に入りのモビーは？</Text>
        <Text style={styles.favoriteLead}>モビーは全部で9キャラ！ 最初の相棒を選んでね。{`\n`}左右にスワイプ・あとからいつでも変更できます。</Text>
        <MobbyCarousel
          interactionScale={scale}
          selectedId={selectedMobbyId}
          onSelect={(mobby) => {
            const item = ITEMS.find((candidate) => ITEM_MOBBY_IDS[candidate.id] === mobby.id);
            if (item) onSelect(item.id);
          }}
          style={styles.favoriteCarousel}
        />
        <MobbyAssetButton accessibilityLabel={`${itemCharacterName(selectedItem)}と始める`} onPress={onConfirm} style={styles.onboardingPrimaryButton} contentStyle={styles.onboardingPrimaryContent}>
          <Text style={styles.onboardingPrimaryText}>この子と始める</Text>
        </MobbyAssetButton>
      </Animated.View>
    </View>
  );
}

type OnboardingCopy = {
  step: string;
  title: string;
  body: string;
  action?: string;
  navIndex?: number;
};

const ONBOARDING_COPY: Partial<Record<OnboardingStep, OnboardingCopy>> = {
  mobbyTime: { step: '最初のグッズ', title: '箱をタップして受け取ろう', body: '選んだモビーのぬいキーが必ず入っています。中央の箱をタップしてね。' },
  opening: { step: '開封中', title: '最初のぬいキーがもうすぐ登場', body: '開封が終わるまで少しだけ待ってね。' },
  place: { step: '受け取り', title: '「壁に追加する」を押そう', body: 'このボタンを押すとホームへ移動し、ぬいキーが壁へ飾られるところまで見られます。' },
  wallFlight: { step: '飾り付け中', title: 'ぬいキーを壁へ運んでいます', body: 'フックに掛かったら、アプリ全体の短いチュートリアルが始まります。' },
  home: { step: '1 / 3', title: 'ホーム：モビーと部屋で遊ぶ', body: 'メインモビーを引っ張ると表情・セリフ・リアクションが変化。壁のぬいキーや棚のぬいぐるみに触れて、お部屋の反応を楽しめます。', action: 'コレクションへ', navIndex: 0 },
  collection: { step: '2 / 3', title: 'コレクション：集めたグッズを見る', body: 'ぬいキー／ぬいぐるみを切り替えて一覧を確認。ぬいキーは通常・Sサイズを選べ、指で触れると揺れて音が鳴ります。', action: 'MOBBY TIMEへ', navIndex: 1 },
  time: { step: '3 / 3', title: 'MOBBY TIME：新しいグッズと出会う', body: '届いた箱を開けてグッズを獲得し、ホームへ飾る場所。開催中は残り時間もここで確認できます。', action: '遊び始める', navIndex: 2 },
};

function OnboardingGuide({ step, onNext, onSkip }: { step: OnboardingStep; onNext: () => void; onSkip: () => void }) {
  const copy = ONBOARDING_COPY[step];
  if (!copy) return null;
  const interactive = Boolean(copy.action);
  const cardAtTop = !interactive;
  const navCell = typeof copy.navIndex === 'number' ? BOTTOM_NAV_CELLS[copy.navIndex] : null;
  return (
    <View pointerEvents={interactive ? 'auto' : 'box-none'} style={styles.guideOverlay}>
      {navCell ? <View pointerEvents="none" style={[styles.guideNavHighlight, { left: 8 + navCell.left, width: navCell.width }]}><View style={styles.guideNavHighlightInner} /></View> : null}
      <ImageBackground source={UI_WIDE_PAPER} resizeMode="stretch" style={[styles.guideCard, cardAtTop ? styles.guideCardTop : styles.guideCardBottom]} imageStyle={styles.guideCardImage}>
        <View style={styles.guideHeadingRow}>
          <Text style={styles.guideStep}>{copy.step}</Text>
          {interactive ? <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={10}><Text style={styles.guideSkip}>スキップ</Text></Pressable> : null}
        </View>
        <Text style={styles.guideTitle}>{copy.title}</Text>
        <Text style={styles.guideBody}>{copy.body}</Text>
        {copy.action ? <MobbyAssetButton accessibilityLabel={copy.action} onPress={onNext} style={[styles.guideButton, styles.pressableFocusReset]} contentStyle={styles.guideButtonContent}><Text style={styles.guideButtonText}>{copy.action}</Text></MobbyAssetButton> : null}
      </ImageBackground>
    </View>
  );
}

function OpeningScreen({ onBegin, onStart }: { onBegin: () => void; onStart: () => void }) {
  const { width: appWidth, height: appHeight } = useAppLayout();
  const intro = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const startPulse = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const [leaving, setLeaving] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const itemAssets = ITEMS.flatMap((item) => [item.image, item.keyImage, item.smallKeyImage].filter((asset): asset is number => typeof asset === 'number'));
    Asset.loadAsync([OPENING_BACKDROP, HOME_WALL_BACKGROUND, HOME_GARLAND, PLUSH_SHELF_BASE, WOODEN_HOOK, TAKARA_MOBBY_LOGO, MOBBY_TIME_OPENED_BOX, MOBBY_TIME_PACKAGE, ...itemAssets])
      .catch(() => undefined)
      .finally(() => { if (mounted) setAssetsReady(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const introAnimation = Animated.timing(intro, { toValue: 1, duration: 780, easing: Easing.out(Easing.back(1.25)), useNativeDriver: Platform.OS !== 'web' });
    const bobLoop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 1150, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(bob, { toValue: 0, duration: 1150, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    const floatLoop = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 1650, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(float, { toValue: 0, duration: 1650, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    const pulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(startPulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(startPulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    introAnimation.start();
    bobLoop.start();
    floatLoop.start();
    pulseLoop.start();
    return () => {
      introAnimation.stop();
      bobLoop.stop();
      floatLoop.stop();
      pulseLoop.stop();
    };
  }, [bob, float, intro, startPulse]);

  const startGame = useCallback(() => {
    if (leaving) return;
    onBegin();
    setLeaving(true);
    Animated.timing(exit, { toValue: 1, duration: 430, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => {
      if (finished) onStart();
    });
  }, [exit, leaving, onBegin, onStart]);

  const mobbyTranslateY = Animated.add(
    intro.interpolate({ inputRange: [0, 1], outputRange: [58, 0] }),
    bob.interpolate({ inputRange: [0, 1], outputRange: [4, -7] }),
  );
  const compactOpeningGroup = appHeight < 840;
  // Keep the start plaque comfortably inside the scaled app shell while
  // leaving enough vertical room for the unopened package above it.
  const openingStartWidth = compactOpeningGroup ? 320 : Math.min(390, Math.max(360, appHeight - 360));
  const openingStartHeight = openingStartWidth * (126 / 292);
  // The opened box, mascot, keychains, and unopened package share one
  // composition whose midpoint stays on the screen midpoint.
  const openingCoreHeight = compactOpeningGroup ? 360 : 428;
  const openingPackageTop = 322;
  const openingPackageSize = compactOpeningGroup ? 110 : 140;
  const openingCompositionHeight = Math.max(openingCoreHeight, openingPackageTop + openingPackageSize);
  const openingSceneTop = Math.max(0, (appHeight - openingCompositionHeight) / 2);
  // The key art was authored on a 440px-wide canvas.  Keep the center
  // composition on its existing anchor, but scale and center the surrounding
  // keychains so narrow phones never crop the left/right characters.
  const openingKeyDesignWidth = 440;
  const openingKeyHorizontalInset = 12;
  const openingKeyScale = Math.min(1, Math.max(0, (appWidth - openingKeyHorizontalInset * 2) / openingKeyDesignWidth));
  const openingKeyGroupWidth = openingKeyDesignWidth * openingKeyScale;
  const openingKeyGroupLeft = (appWidth - openingKeyGroupWidth) / 2;
  return (
    <View
      accessibilityLabel="MOBBY COLLECTION 起動画面"
      accessibilityViewIsModal
      style={styles.openingScreen}
    >
      <Image source={OPENING_BACKDROP} resizeMode="cover" style={styles.openingBackdrop} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={assetsReady ? '画面をタップしてスタート' : '読み込み中'}
        disabled={leaving || !assetsReady}
        onPress={startGame}
        style={styles.openingTapSurface}
      />
      <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.055] }) }] }]}> 
      <Animated.View pointerEvents="none" style={[styles.openingTitleWrap, { opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }] }]}>
        <ImageBackground source={MOBBY_TIME_TIMER_PLAQUE} resizeMode="contain" style={styles.openingTitlePlaque}>
          <Image source={TAKARA_MOBBY_LOGO} resizeMode="contain" style={styles.openingLogoImage} />
          <Text style={styles.openingTitleSub}>C O L L E C T I O N</Text>
        </ImageBackground>
        <Text style={styles.openingTagline}>モビーたちと、毎日を飾ろう。</Text>
      </Animated.View>
      <View pointerEvents="none" style={[styles.openingScene, { top: openingSceneTop, height: openingCompositionHeight }]}>
        <Animated.Image source={MOBBY_TIME_OPENED_BOX} resizeMode="contain" style={[styles.openingOpenedBox, { opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }, { scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.76, 1] }) }, { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-1deg', '1deg'] }) }] }]} />
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
                  left: openingKeyGroupLeft + decoration.left * openingKeyScale,
                  top: decoration.top,
                  width: decoration.size * openingKeyScale,
                  height: decoration.size * 1.18 * openingKeyScale,
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
        <Animated.Image source={MOBBY_TIME_PACKAGE} resizeMode="contain" style={[styles.openingUnopenedPackage, { top: openingPackageTop, width: openingPackageSize, height: openingPackageSize, marginLeft: -openingPackageSize / 2, opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }, { scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }, { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-1.4deg', '1.4deg'] }) }] }]} />
      </View>
      <Animated.View pointerEvents="box-none" style={[styles.openingStartWrap, { opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [25, 0] }) }, { scale: startPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) }] }]}>
        {!assetsReady ? <LoadingMascot compact /> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={assetsReady ? 'タップしてスタート' : '読み込み中'} disabled={leaving || !assetsReady} onPress={startGame} style={({ pressed }) => [styles.openingStartButton, { width: openingStartWidth, height: openingStartHeight }, !assetsReady && styles.openingStartLoading, pressed && styles.openingStartPressed]}>
          <ImageBackground source={MOBBY_TIME_MESSAGE_PLAQUE} resizeMode="contain" style={[styles.openingStartPlaque, { width: openingStartWidth, height: openingStartHeight }]}>
            <Text style={styles.openingStartTitle}>{assetsReady ? 'TAP TO START' : 'LOADING…'}</Text>
            <Text style={styles.openingStartSub}>{assetsReady ? 'モビーの部屋へ' : 'モビーたちを呼んでいます'}</Text>
          </ImageBackground>
        </Pressable>
      </Animated.View>
      </Animated.View>
    </View>
  );
}

type MobbySceneContextValue = { scene: ReactNode };
const MobbySceneContext = createContext<MobbySceneContextValue>({ scene: null });

export type MobbyShellCharacter = {
  id: string;
  name: string;
  image: number;
  owned: boolean;
};

type MobbyShellValue = {
  appStarted: boolean;
  opening: boolean;
  isHydrated: boolean;
  characters: readonly MobbyShellCharacter[];
  collectibleInventory: Readonly<Record<string, number>>;
  favoriteId: string;
  setFavorite: (id: string) => boolean;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  reduceMotion: boolean;
  hasUnresolvedEpisode: boolean;
  unresolvedEpisodeTitle: string | null;
  mobbyTimeOpenScene: ReactNode;
  mobbyTimeResultReady: boolean;
  activeEpisode: ActiveEpisode | null;
  activeEpisodeData: EpisodeData | null;
  saveEpisodeProgress: (playback: PlaybackState) => void;
  interruptEpisode: (playback: PlaybackState) => Promise<void>;
  completeActiveEpisode: (result: { completedAt: string; finalState: PlaybackState }) => Promise<void>;
  emitEpisodeCue: (cue: Cue) => void;
};

const MobbyShellContext = createContext<MobbyShellValue | null>(null);

export function useMobbyAppShell() {
  const value = useContext(MobbyShellContext);
  if (!value) throw new Error('useMobbyAppShell must be used inside MobbyAppShell');
  return value;
}

export function MobbyRouteScene() {
  const { scene } = useContext(MobbySceneContext);
  const pathname = usePathname();
  const tabScene = selectTabScene(pathname);
  if (!tabScene) return null;
  return scene;
}

export default function MobbyAppShell({ children }: { children: ReactNode }) {
  const [clientReady, setClientReady] = useState(false);
  useEffect(() => setClientReady(true), []);
  if (!clientReady) return null;
  return <MobbyAppShellClient>{children}</MobbyAppShellClient>;
}

function MobbyAppShellClient({ children }: { children: ReactNode }) {
  const daily = useDailyLoop();
  const pathname = usePathname();
  const responsive = useResponsiveLayout();
  const safeAreaInsets = useSafeAreaInsets();
  const clientMounted = true;
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontError, setFontError] = useState<Error | null>(null);
  const [appStarted, setAppStarted] = useState(false);
  const [experienceScreen, setExperienceScreen] = useState<Extract<Screen, 'touch' | 'episode'> | null>(null);
  const [selectedId, setSelectedId] = useState('yami-key');
  const [owned, setOwned] = useState(INITIAL_OWNED);
  const [mobbyTimeStage, setMobbyTimeStage] = useState<MobbyTimeStage>('arrived');
  const [todayId, setTodayId] = useState(ITEMS[0].id);
  const [todayVariant, setTodayVariant] = useState<CollectibleVariant>('key-normal');
  const [secondsLeft, setSecondsLeft] = useState(1421);
  const [reaction, setReaction] = useState('');
  const [incidentStorage, setIncidentStorage] = useState<IncidentStorageV5>(() => freshEpisodeStorage());
  const [incidentCutInVisible, setIncidentCutInVisible] = useState(false);
  const [casebookInitialTab, setCasebookInitialTab] = useState<IncidentCasebookTab>('active');
  const [notice, setNotice] = useState('');
  const [headerPopover, setHeaderPopover] = useState<'settings' | 'notifications' | 'daily' | 'mobby-time' | 'stories' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [wallPlacement, setWallPlacement] = useState<CollectibleReward | null>(null);
  const [homeLayout, setHomeLayout] = useState(() => createDefaultHomeLayout(INITIAL_OWNED));
  const [storageReady, setStorageReady] = useState(false);
  const [tutorialComplete, setTutorialComplete] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('none');
  const [favoriteDraftId, setFavoriteDraftId] = useState(ITEMS[0].id);
  const [onboardingReward, setOnboardingReward] = useState<OnboardingRewardState | null>(null);
  const [onboardingGrantRetry, setOnboardingGrantRetry] = useState(0);
  const pullReactionIndexRef = useRef<Record<string, number>>({});
  const lastKeyJingleRef = useRef(0);
  const placementHandledIdRef = useRef<string | null>(null);
  const storageWriteChainRef = useRef<Promise<void>>(Promise.resolve());
  const incidentStorageRef = useRef(incidentStorage);
  const ownedRef = useRef(owned);
  const onboardingRewardRef = useRef(onboardingReward);
  const onboardingRewardBridgeRunningRef = useRef(false);
  const onboardingGrantRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onboardingConfirmRunningRef = useRef(false);
  const dailyRewardBridgeRunningRef = useRef(false);
  const episodeProgressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEpisodeProgressRef = useRef<{ runId: string; playback: PlaybackState } | null>(null);
  const completedEpisodeRunIdsRef = useRef(new Set<string>());
  const selected = useMemo(() => ITEMS.find((item) => item.id === selectedId) ?? ITEMS[0], [selectedId]);
  const shellCharacters = useMemo<MobbyShellCharacter[]>(() => ITEMS.map((item) => ({
    id: item.id,
    name: getMobby(ITEM_MOBBY_IDS[item.id] ?? 'mobichi').name,
    image: item.image,
    owned: COLLECTIBLE_VARIANTS.some((variant) => ownedCollectibleCount(owned, item.id, variant) > 0),
  })), [owned]);
  const persistedMobbyTimeReward = daily.state.mobbyTimeReward;
  const onboardingRewardActive = Boolean(
    !tutorialComplete && onboardingReward && ['mobbyTime', 'opening', 'place', 'wallFlight'].includes(onboardingStep),
  );
  const today = ITEMS.find((item) => item.id === (
    onboardingRewardActive ? onboardingReward?.itemId : persistedMobbyTimeReward?.itemId ?? todayId
  )) ?? ITEMS[0];
  const routeScreen = selectTabScene(pathname);
  const previousRouteScreenRef = useRef<typeof routeScreen>(routeScreen);
  const [tabEntryNonce, setTabEntryNonce] = useState(0);
  useEffect(() => {
    if (routeScreen !== previousRouteScreenRef.current && routeScreen !== null) {
      setTabEntryNonce((value) => value + 1);
    }
    previousRouteScreenRef.current = routeScreen;
  }, [routeScreen]);
  const screen: Screen | null = experienceScreen ?? routeScreen;
  const activeIncident = incidentStorage.activeEpisode;
  const pendingIncidentReward = incidentStorage.pendingResolution;
  const activeIncidentId = activeIncident?.runId ?? null;
  const incidentTargetItemId = activeIncident?.targetItemId ?? null;
  const incidentTargetItem = useMemo(() => ITEMS.find((item) => item.id === incidentTargetItemId) ?? null, [incidentTargetItemId]);
  const resolutionTargetItemId = pendingIncidentReward?.targetItemId ?? null;
  const resolutionTargetItem = useMemo(() => ITEMS.find((item) => item.id === pendingIncidentReward?.targetItemId) ?? null, [pendingIncidentReward?.targetItemId]);
  const incidentResolutionPhase: IncidentResolutionPhase = pendingIncidentReward?.step ?? 'none';
  const cutInTargetItem = incidentTargetItem;
  const hasUnresolvedIncident = Boolean(activeIncident);
  const incidentCutInActive = Boolean(incidentCutInVisible && appStarted && tutorialComplete && cutInTargetItem && !pendingIncidentReward);
  const incidentEpisodeActive = screen === 'episode';
  const incidentResolutionActive = Boolean(pendingIncidentReward && appStarted && storageReady && tutorialComplete);
  const incidentExperienceActive = incidentCutInActive || incidentEpisodeActive || incidentResolutionActive;
  const appBaseIsolated = !appStarted || incidentExperienceActive || headerPopover !== null;
  const bgmMode = incidentResolutionPhase === 'returning'
    ? 'silent' as const
    : hasUnresolvedIncident ? 'incident' as const : 'normal' as const;
  const { engageBgm, playSfx } = useMobbyAudio({ bgmEnabled: appStarted && soundEnabled, sfxEnabled: soundEnabled, bgmMode });
  const navigateTo = useCallback((nextScreen: Screen, cue: 'transition' | 'tab' | 'silent' = 'transition') => {
    if (nextScreen === screen) return;
    if (cue !== 'silent') playSfx(cue);
    const topLevelRoute = nextScreen === 'home' ? '/' : nextScreen === 'collection' ? '/collection' : nextScreen === 'time' ? '/mobby-time' : nextScreen === 'casebook' ? '/stories' : null;
    if (topLevelRoute) {
      setExperienceScreen(null);
      if (pathname !== topLevelRoute) router.navigate(topLevelRoute);
      return;
    }
    if (nextScreen === 'touch' || nextScreen === 'episode') setExperienceScreen(nextScreen);
  }, [pathname, playSfx, screen]);
  const haptics = useMobbyHaptics(soundEnabled);
  const tutorialRewardActive = onboardingRewardActive;
  const effectiveTodayVariant: CollectibleVariant = onboardingRewardActive
    ? 'key-normal'
    : persistedMobbyTimeReward?.variant ?? todayVariant;
  const effectiveMobbyTimeStage: MobbyTimeStage = onboardingRewardActive
    ? onboardingReward?.phase ?? 'arrived'
    : persistedMobbyTimeReward?.phase ?? mobbyTimeStage;
  const mobbyTimeResultReady = effectiveMobbyTimeStage === 'placed' && (
    onboardingRewardActive
      ? owned[ONBOARDING_REWARD_RECEIPT] === 1
      : Boolean(persistedMobbyTimeReward && owned[`${DAILY_REWARD_RECEIPT_PREFIX}${persistedMobbyTimeReward.eventId}`] === 1)
  );
  const viewportHeight = Math.max(1, responsive.height - safeAreaInsets.top - safeAreaInsets.bottom);

  useEffect(() => {
    if (incidentExperienceActive) setHeaderPopover(null);
  }, [incidentExperienceActive]);

  ownedRef.current = owned;
  incidentStorageRef.current = incidentStorage;
  onboardingRewardRef.current = onboardingReward;

  useEffect(() => {
    if (!clientMounted) return;
    let active = true;
    Font.loadAsync({ ZenMaruGothic_400Regular, ZenMaruGothic_500Medium, ZenMaruGothic_700Bold, ZenMaruGothic_900Black })
      .then(() => { if (active) setFontsLoaded(true); })
      .catch((error: unknown) => { if (active) setFontError(error instanceof Error ? error : new Error(String(error))); });
    return () => { active = false; };
  }, [clientMounted]);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => { if (mounted) setReduceMotion(enabled); })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.multiGet([STORAGE_TUTORIAL_COMPLETE, STORAGE_FAVORITE, STORAGE_OWNED, STORAGE_OWNED_LEGACY, STORAGE_ONBOARDING_REWARD, STORAGE_CASES, STORAGE_HOME_LAYOUT])
      .then((entries) => {
        if (!mounted) return;
        const values = Object.fromEntries(entries);
        const completed = values[STORAGE_TUTORIAL_COMPLETE] === 'true';
        const favoriteValue = values[STORAGE_FAVORITE] ?? ITEMS[0].id;
        const storedFavorite = ITEMS.some((item) => item.id === favoriteValue) ? favoriteValue : ITEMS[0].id;
        let storedOwned = __DEV__ ? INITIAL_OWNED : completed ? INITIAL_OWNED : EMPTY_OWNED;
        const storedInventory = values[STORAGE_OWNED] ?? values[STORAGE_OWNED_LEGACY];
        if (storedInventory) {
          try {
            const parsed = JSON.parse(storedInventory) as Record<string, unknown>;
            const normalizedInventory = normalizeOwnedInventory(parsed);
            storedOwned = __DEV__ ? ensureAllCollectiblesOwned(normalizedInventory) : normalizedInventory;
          } catch {
            storedOwned = __DEV__ ? INITIAL_OWNED : completed ? INITIAL_OWNED : EMPTY_OWNED;
          }
        }
        const decodedOnboardingReward = decodeOnboardingReward(values[STORAGE_ONBOARDING_REWARD] ?? null);
        const storedOnboardingReward = decodedOnboardingReward
          ? { ...decodedOnboardingReward, inventoryGranted: storedOwned[ONBOARDING_REWARD_RECEIPT] === 1 }
          : null;
        setTutorialComplete(completed);
        setFavoriteDraftId(storedFavorite);
        setSelectedId(storedFavorite);
        setOwned(storedOwned);
        setHomeLayout(decodeHomeLayout(values[STORAGE_HOME_LAYOUT] ?? null, storedOwned));
        setOnboardingReward(storedOnboardingReward);
        if (values[STORAGE_CASES]) {
          try {
            const decoded = decodeEpisodeStorage(JSON.parse(values[STORAGE_CASES]), {
              validTargetItemIds: new Set(ITEMS.map((item) => item.id)),
              validEnemyIds: new Set(EPISODES.map((episode) => episode.enemyId)),
              validMobbyIds: new Set(EPISODES.map((episode) => episode.featuredMobbyId)),
              mobbyIdForTargetItem: (itemId) => ITEM_MOBBY_IDS[itemId] ?? null,
              targetItemIdForMobby: (mobbyId) => ITEMS.find((item) => ITEM_MOBBY_IDS[item.id] === mobbyId)?.id ?? null,
            });
            setIncidentStorage(decoded);
            setIncidentCutInVisible(Boolean(decoded.activeEpisode && !decoded.activeEpisode.notification.pending && !decoded.activeEpisode.notification.cutInSeen));
          } catch {
            setIncidentStorage(freshEpisodeStorage());
            setIncidentCutInVisible(false);
          }
        }
      })
      .catch(() => {
        if (!mounted) return;
        const fallbackOwned = __DEV__ ? INITIAL_OWNED : EMPTY_OWNED;
        setOwned(fallbackOwned);
        setHomeLayout(createDefaultHomeLayout(fallbackOwned));
      })
      .finally(() => { if (mounted) setStorageReady(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    const entries: [string, string][] = [
      [STORAGE_CASES, JSON.stringify(incidentStorage)],
      [STORAGE_HOME_LAYOUT, JSON.stringify(homeLayout)],
    ];
    if (tutorialComplete) {
      entries.push(
        [STORAGE_TUTORIAL_COMPLETE, 'true'],
        [STORAGE_FAVORITE, selectedId],
        [STORAGE_OWNED, JSON.stringify(owned)],
      );
    }
    storageWriteChainRef.current = storageWriteChainRef.current
      .catch(() => undefined)
      .then(() => AsyncStorage.multiSet(entries))
      .catch(() => undefined);
  }, [homeLayout, incidentStorage, owned, selectedId, storageReady, tutorialComplete]);

  useEffect(() => {
    if (!storageReady) return;
    setHomeLayout((current) => reconcileHomeLayout(current, owned));
  }, [owned, storageReady]);

  const enqueueStorageWrite = useCallback(async (operation: () => Promise<void>) => {
    const write = storageWriteChainRef.current
      .catch(() => undefined)
      .then(operation);
    storageWriteChainRef.current = write.catch(() => undefined);
    await write;
  }, []);

  const commitIncidentStorage = useCallback(async (update: (current: IncidentStorageV5) => IncidentStorageV5) => {
    await enqueueStorageWrite(async () => {
      const current = incidentStorageRef.current;
      const next = update(current);
      if (next === current) return;
      await AsyncStorage.setItem(STORAGE_CASES, JSON.stringify(next));
      incidentStorageRef.current = next;
      setIncidentStorage(next);
    });
  }, [enqueueStorageWrite]);

  const persistReceiptBackedInventoryGrant = useCallback(async (
    receiptKey: string,
    inventoryKey: string,
    amount: number,
  ) => {
    let published: Record<string, number> | null = null;
    await enqueueStorageWrite(async () => {
      const current = ownedRef.current;
      const next = receiptBackedInventoryGrant(current, receiptKey, inventoryKey, amount);
      if (next === current) return;
      await AsyncStorage.setItem(STORAGE_OWNED, JSON.stringify(next));
      ownedRef.current = next;
      published = next;
    });
    if (published) setOwned(published);
  }, [enqueueStorageWrite]);

  const persistOnboardingReward = useCallback(async (next: OnboardingRewardState) => {
    await enqueueStorageWrite(() => AsyncStorage.setItem(STORAGE_ONBOARDING_REWARD, JSON.stringify(next)));
    onboardingRewardRef.current = next;
    setOnboardingReward(next);
  }, [enqueueStorageWrite]);

  const ensureOnboardingRewardGranted = useCallback(async (reward: OnboardingRewardState) => {
    if (reward.eventId !== ONBOARDING_REWARD_EVENT_ID || reward.variant !== 'key-normal' || !ITEMS.some((item) => item.id === reward.itemId)) {
      throw new Error('Invalid onboarding reward payload');
    }
    if (ownedRef.current[ONBOARDING_REWARD_RECEIPT] !== 1) {
      const inventoryKey = collectibleInventoryKey(reward.itemId, reward.variant);
      await persistReceiptBackedInventoryGrant(
        ONBOARDING_REWARD_RECEIPT,
        inventoryKey,
        1,
      );
    }
    const current = onboardingRewardRef.current?.eventId === reward.eventId
      ? onboardingRewardRef.current
      : reward;
    if (!current.inventoryGranted) {
      await persistOnboardingReward({ ...current, inventoryGranted: true });
    }
  }, [persistOnboardingReward, persistReceiptBackedInventoryGrant]);

  const persistOnboardingRewardPhase = useCallback(async (phase: MobbyTimeStage) => {
    const current = onboardingRewardRef.current;
    if (!current || current.eventId !== ONBOARDING_REWARD_EVENT_ID) return false;
    if (current.phase === phase) return true;
    await persistOnboardingReward({ ...current, phase });
    return true;
  }, [persistOnboardingReward]);

  useEffect(() => {
    if (
      !storageReady || tutorialComplete || !onboardingReward || onboardingRewardBridgeRunningRef.current ||
      (onboardingReward.inventoryGranted && ownedRef.current[ONBOARDING_REWARD_RECEIPT] === 1)
    ) return;
    let disposed = false;
    onboardingRewardBridgeRunningRef.current = true;
    void ensureOnboardingRewardGranted(onboardingReward)
      .catch(() => {
        if (disposed) return;
        if (onboardingGrantRetryTimerRef.current) clearTimeout(onboardingGrantRetryTimerRef.current);
        onboardingGrantRetryTimerRef.current = setTimeout(() => {
          onboardingGrantRetryTimerRef.current = null;
          setOnboardingGrantRetry((value) => value + 1);
        }, 1000);
      })
      .finally(() => { onboardingRewardBridgeRunningRef.current = false; });
    return () => { disposed = true; };
  }, [ensureOnboardingRewardGranted, onboardingGrantRetry, onboardingReward, storageReady, tutorialComplete]);

  useEffect(() => () => {
    if (onboardingGrantRetryTimerRef.current) clearTimeout(onboardingGrantRetryTimerRef.current);
  }, []);

  useEffect(() => {
    if (!storageReady || !daily.isHydrated || dailyRewardBridgeRunningRef.current) return;
    dailyRewardBridgeRunningRef.current = true;
    const processPendingRewards = async () => {
      const mobbyTimeReward = daily.state.mobbyTimeReward;
      const entitlement = daily.state.mobbyTime;
      if (!mobbyTimeReward && entitlement) {
        const recoveredReceipt = `${DAILY_REWARD_RECEIPT_PREFIX}mobby-time-reward:${entitlement.id}`;
        if (ownedRef.current[recoveredReceipt] === 1) await daily.completeReceiptedMobbyTime(entitlement.id);
      }
      if (shouldGrantMobbyTimeReceipt(mobbyTimeReward)) {
        const itemExists = ITEMS.some((item) => item.id === mobbyTimeReward.itemId);
        const variantValid = COLLECTIBLE_VARIANTS.includes(mobbyTimeReward.variant);
        if (itemExists && variantValid && mobbyTimeReward.amount === 1) {
          const receiptKey = `${DAILY_REWARD_RECEIPT_PREFIX}${mobbyTimeReward.eventId}`;
          if (ownedRef.current[receiptKey] !== 1) {
            const inventoryKey = collectibleInventoryKey(mobbyTimeReward.itemId, mobbyTimeReward.variant);
            await persistReceiptBackedInventoryGrant(receiptKey, inventoryKey, mobbyTimeReward.amount);
          }
          await daily.consumeMobbyTimeReward(mobbyTimeReward.eventId);
        }
      }
      for (const reward of daily.state.pendingRewards) {
        if (reward.kind === 'mobby-time') {
          await daily.consumePendingReward(reward.eventId);
          continue;
        }
        const collectible = resolveCollectibleDailyReward(reward);
        if (!collectible) continue;
        const receiptKey = `${DAILY_REWARD_RECEIPT_PREFIX}${reward.eventId}`;
        if (ownedRef.current[receiptKey] !== 1) {
          const inventoryKey = collectibleInventoryKey(collectible.itemId, collectible.variant);
          await persistReceiptBackedInventoryGrant(receiptKey, inventoryKey, collectible.amount);
        }
        await daily.consumePendingReward(reward.eventId);
      }
    };
    void processPendingRewards()
      .catch(() => undefined)
      .finally(() => { dailyRewardBridgeRunningRef.current = false; });
  }, [daily, persistReceiptBackedInventoryGrant, storageReady]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4200);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    setTodayId(ITEMS[Math.floor(Math.random() * ITEMS.length)].id);
    setTodayVariant(COLLECTIBLE_VARIANTS[Math.floor(Math.random() * COLLECTIBLE_VARIANTS.length)]);
    const timer = setInterval(() => setSecondsLeft((value) => value > 0 ? value - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, []);

  const selectItem = useCallback((id: string) => {
    playSfx('tap');
    setReaction('');
    setSelectedId(id);
  }, [playSfx]);
  const revealToday = useCallback(() => {
    playSfx('reward');
    setMobbyTimeStage('revealed');
    if (onboardingStep === 'opening' || onboardingStep === 'mobbyTime') setOnboardingStep('place');
  }, [onboardingStep, playSfx]);
  const handleRewardOpen = useCallback(async () => {
    if (onboardingRewardActive) {
      if (!await persistOnboardingRewardPhase('opening')) throw new Error('Onboarding reward is unavailable');
    }
    placementHandledIdRef.current = null;
    playSfx('boxOpen');
    setMobbyTimeStage('opening');
    if (onboardingStep === 'mobbyTime') setOnboardingStep('opening');
  }, [onboardingRewardActive, onboardingStep, persistOnboardingRewardPhase, playSfx]);
  const handleRewardReveal = useCallback(async () => {
    if (onboardingRewardActive) {
      if (!await persistOnboardingRewardPhase('revealed')) throw new Error('Onboarding reward is unavailable');
    }
    revealToday();
  }, [onboardingRewardActive, persistOnboardingRewardPhase, revealToday]);
  const finalizePlacement = useCallback((item: Item, variant: CollectibleVariant, exactPlacementId?: HomePlacementId) => {
    const placementId = exactPlacementId ?? homePlacementId(
      item.id,
      variant,
      Math.max(1, ownedCollectibleCount(ownedRef.current, item.id, variant)),
    );
    setMobbyTimeStage('placed');
    setSelectedId(item.id);
    const placement = variant === 'plush' ? '棚' : '壁';
    setHomeLayout((current) => placeHomeReward(current, placementId));
    setNotice(`NEW! ${collectibleName(item, variant)}を${placement}に追加しました`);
    if (['place', 'opening', 'mobbyTime', 'wallFlight'].includes(onboardingStep)) {
      navigateTo('home');
      setOnboardingStep('home');
    }
  }, [navigateTo, onboardingStep]);
  const placeToday = useCallback(() => {
    // The inventory grant completes before this placement callback. Therefore
    // the current owned count is the exact newly-earned copy number (not +1).
    const placementId = homePlacementId(
      today.id,
      effectiveTodayVariant,
      Math.max(1, ownedCollectibleCount(ownedRef.current, today.id, effectiveTodayVariant)),
    );
    if (placementHandledIdRef.current === placementId) return;
    placementHandledIdRef.current = placementId;
    setSelectedId(today.id);
    if (effectiveTodayVariant !== 'plush') {
      setNotice('');
      setHomeLayout((current) => placeHomeReward(current, placementId));
      setWallPlacement({ item: today, variant: effectiveTodayVariant, placementId });
      navigateTo('home');
      if (onboardingStep === 'place') setOnboardingStep('wallFlight');
      return;
    }
    playSfx('place');
    finalizePlacement(today, effectiveTodayVariant, placementId);
    // Plush placement finishes its in-card motion before this callback runs.
    // Return to the home shelf for all sessions, including users who have
    // already completed onboarding (the wall-flight branch does this before
    // its animation starts).
    navigateTo('home');
  }, [effectiveTodayVariant, finalizePlacement, navigateTo, onboardingStep, playSfx, today]);
  const startPlacement = useCallback(() => {
    playSfx('tap');
    // Wall rewards need to enter the home flow immediately. The wall-flight
    // overlay then provides the visual handoff and owns its own safe fallback.
    if (effectiveTodayVariant !== 'plush') {
      placeToday();
      return;
    }
    setMobbyTimeStage('placing');
  }, [effectiveTodayVariant, placeToday, playSfx]);
  const handleRewardPlace = useCallback(async () => {
    if (onboardingRewardActive) {
      if (!await persistOnboardingRewardPhase('placing')) throw new Error('Onboarding reward is unavailable');
    }
    startPlacement();
  }, [onboardingRewardActive, persistOnboardingRewardPhase, startPlacement]);
  const completeMobbyTimePlacement = useCallback(() => {
    // Plush rewards run the short “moving to the shelf” animation inside the
    // encounter card. Once it finishes, commit the item and leave Mobby Time
    // automatically instead of waiting for a second tap.
    if (effectiveTodayVariant === 'plush') {
      placeToday();
      return;
    }
    // A remount can resume a persisted keychain placement without the
    // wall-flight overlay. Complete the same visual/home placement safely.
    finalizePlacement(today, effectiveTodayVariant);
  }, [effectiveTodayVariant, finalizePlacement, placeToday, today]);
  const handleRewardPlaced = useCallback(async () => {
    if (onboardingRewardActive) {
      if (!await persistOnboardingRewardPhase('placed')) throw new Error('Onboarding reward is unavailable');
    }
    completeMobbyTimePlacement();
  }, [completeMobbyTimePlacement, onboardingRewardActive, persistOnboardingRewardPhase]);
  const handleModalRewardPlace = useCallback(() => {
    playSfx('tap');
    setMobbyTimeStage('placing');
  }, [playSfx]);
  const handleModalRewardPlaced = useCallback(() => {
    playSfx('place');
    setSelectedId(today.id);
    setMobbyTimeStage('placed');
  }, [playSfx, today.id]);
  const completeWallPlacement = useCallback(async () => {
    if (!wallPlacement) return;
    try {
      if (onboardingRewardActive) {
        if (!await persistOnboardingRewardPhase('placed')) return;
      }
    } catch {
      return;
    }
    playSfx('place');
    finalizePlacement(wallPlacement.item, wallPlacement.variant, wallPlacement.placementId);
    setWallPlacement(null);
  }, [finalizePlacement, onboardingRewardActive, persistOnboardingRewardPhase, playSfx, wallPlacement]);
  const commitHomeLayout = useCallback((nextLayout: HomeLayoutV1) => {
    setHomeLayout(nextLayout);
  }, []);
  const moveHomeItem = useCallback((placementId: HomePlacementId, targetIndex: number) => {
    setHomeLayout((current) => moveHomePlacement(current, placementId, targetIndex));
  }, []);
  const hideHomeItem = useCallback((placementId: HomePlacementId) => {
    setHomeLayout((current) => removeHomePlacement(current, placementId));
  }, []);
  const incidentWallState: 'none' | 'stolen' | 'returning' = incidentResolutionPhase === 'returning'
    ? 'returning'
    : hasUnresolvedIncident ? 'stolen' : 'none';

  const activeEpisodeData = activeIncident ? getEpisode(activeIncident.episodeId) : undefined;
  const activeEpisodeEnemy = activeEpisodeData ? getEnemy(activeEpisodeData.enemyId) : null;
  const casebookActiveCase = useMemo<IncidentCasebookActiveEpisode | null>(() => activeIncident && incidentTargetItem && activeEpisodeData && activeEpisodeEnemy ? {
    title: activeEpisodeData.title, chapter: activeEpisodeData.chapter, targetName: getMobby(activeEpisodeData.featuredMobbyId).name, targetImage: incidentTargetItem.image,
    enemyName: activeEpisodeEnemy.name, enemyImage: activeEpisodeEnemy.image,
    progressLabel: activeIncident.notification.pending ? '通知・未確認' : activeIncident.playback.sceneId === activeEpisodeData.entrySceneId && activeIncident.playback.lineIndex === 0 ? '未再生' : '途中保存済み',
  } : null, [activeEpisodeData, activeEpisodeEnemy, activeIncident, incidentTargetItem]);
  const relationshipLabel = '王子専属の紅茶係（本人は否定）';
  const casebookEpisodes = useMemo<readonly IncidentCasebookEpisodeEntry[]>(() => EPISODES.flatMap((episode, index) => {
    const entry = incidentStorage.archive.episodes.find((record) => record.episodeId === episode.id);
    const target = ITEMS.find((item) => ITEM_MOBBY_IDS[item.id] === episode.featuredMobbyId); if (!target) return [];
    const enemy = getEnemy(episode.enemyId);
    const options = episode.scenes.flatMap((scene) => scene.interaction?.kind === 'choice' ? scene.interaction.options : []);
    const endingLabel = entry ? options.find((option) => option.id === entry.lastEndingId)?.label ?? entry.lastEndingId : null;
    const unseen = entry ? options.find((option) => !entry.endingIds.includes(option.id))?.label ?? null : options[0]?.label ?? null;
    const unlocked = index === 0 || incidentStorage.archive.episodes.some((record) => record.episodeId === EPISODES[index - 1]?.id);
    const relationship = episode.credits.find((credit) => credit.startsWith('関係：'))?.replace('関係：', '') ?? (episode.id === FEATURED_EPISODE_ID ? relationshipLabel : '思いがけない名コンビ');
    const keyVisual = resolveEpisodeAsset(entry?.outcome.keyVisualAssetId ?? episode.keyVisualAssetId ?? 'bg-mansion')?.source ?? require('../../assets/incidents/midnight-mansion-corridor-v2.png');
    return [{ episodeId: episode.id, chapter: episode.chapter, title: episode.title, synopsis: episode.synopsis, enemyName: enemy.name, targetName: getMobby(episode.featuredMobbyId).name, keyVisual, memorableLine: entry?.outcome.caption ?? entry?.memorableLine ?? '未再生', relationship, endingLabel, unseenEndingLabel: unseen, playCount: entry?.playCount ?? 0, unlocked }];
  }), [incidentStorage.archive.episodes]);
  const casebookRelationships = useMemo<readonly IncidentCasebookRelationshipEntry[]>(() => incidentStorage.archive.relationships.map((entry) => ({ id: `${entry.enemyId}:${entry.mobbyId}`, enemyName: getEnemy(entry.enemyId).name, mobbyName: getMobby(entry.mobbyId).name, label: entry.label, image: getEnemy(entry.enemyId).image })), [incidentStorage.archive.relationships]);
  const resolutionEpisode = pendingIncidentReward ? getEpisode(pendingIncidentReward.episodeId) : undefined;
  const resolutionEnemy = resolutionEpisode ? getEnemy(resolutionEpisode.enemyId) : null;
  const resolutionEndingLabel = resolutionEpisode?.scenes.flatMap((scene) => scene.interaction?.kind === 'choice' ? scene.interaction.options : []).find((option) => option.id === pendingIncidentReward?.endingId)?.label ?? pendingIncidentReward?.endingId ?? '';
  const resolutionRelationshipLabel = pendingIncidentReward ? incidentStorage.archive.relationships.find((entry) => entry.enemyId === pendingIncidentReward.enemyId && entry.mobbyId === pendingIncidentReward.targetMobbyId)?.label ?? '思いがけない名コンビ' : '';

  const startEpisodeById = useCallback(async (episodeId: EpisodeId, mode: 'automatic' | 'demo' | 'direct' = 'direct') => {
    const episode = getEpisode(episodeId);
    if (incidentResolutionPhase !== 'none' || !tutorialComplete || !episode) return;
    const episodeIndex = EPISODES.findIndex((candidate) => candidate.id === episode.id);
    const unlocked = episodeIndex === 0 || incidentStorageRef.current.archive.episodes.some((entry) => entry.episodeId === EPISODES[episodeIndex - 1]?.id);
    if (!unlocked) return;
    const target = ITEMS.find((item) => ITEM_MOBBY_IDS[item.id] === episode.featuredMobbyId);
    if (!target) return;
    const runId = `${episode.id}:${target.id}:${Date.now()}`;
    const nextActive = { runId, episodeId: episode.id, targetItemId: target.id, targetMobbyId: episode.featuredMobbyId, enemyId: episode.enemyId, notification: { pending: mode === 'demo', cutInSeen: mode === 'direct' }, playback: createInitialPlaybackState(episode) };
    const alreadyActive = incidentStorageRef.current.activeEpisode;
    if (alreadyActive) {
      setCasebookInitialTab('active');
      setNotice(alreadyActive.episodeId === episode.id ? 'このおはなしは進行中です。「続きから」または「最初から」を選んでください' : '別のおはなしが進行中です。先に進行中のおはなしを続けてください');
      if (headerPopover !== 'stories') navigateTo('casebook');
      return;
    }
    try {
      await commitIncidentStorage((current) => current.activeEpisode || current.pendingResolution ? current : startEpisode(current, nextActive));
    } catch {
      setNotice('おはなしを保存できませんでした。もう一度お試しください');
      return;
    }
    if (incidentStorageRef.current.activeEpisode?.runId !== runId || incidentStorageRef.current.activeEpisode.episodeId !== episode.id) return;
    setIncidentCutInVisible(false);
    if (mode === 'direct') {
      setHeaderPopover(null);
      router.push({ pathname: '/story/[episodeId]', params: { episodeId: episode.id } });
    } else if (mode === 'demo') {
      navigateTo('home'); setNotice(`新しいおはなし：${getEnemy(episode.enemyId).name}と${getMobby(episode.featuredMobbyId).name}`);
    } else {
      navigateTo('home'); setTimeout(() => setIncidentCutInVisible(true), 80); setNotice(`${getEnemy(episode.enemyId).name}と${getMobby(episode.featuredMobbyId).name}のおはなしが始まります`);
    }
    playSfx('incidentSting');
  }, [commitIncidentStorage, headerPopover, incidentResolutionPhase, navigateTo, playSfx, tutorialComplete]);

  const triggerIncident = useCallback((mode: 'automatic' | 'demo' | 'direct' = 'automatic') => startEpisodeById(FEATURED_EPISODE_ID, mode), [startEpisodeById]);

  const openIncident = useCallback(() => {
    playSfx('tap');
    setIncidentCutInVisible(false);
    setCasebookInitialTab('active');
    navigateTo('casebook');
  }, [navigateTo, playSfx]);

  const resumeIncident = useCallback(async () => {
    if (!activeIncident) return;
    playSfx('tap');
    try { await commitIncidentStorage((current) => acknowledgeEpisode(current, activeIncident.runId, true)); } catch { setNotice('進行状況を保存できませんでした。もう一度お試しください'); return; }
    if (incidentStorageRef.current.activeEpisode?.runId !== activeIncident.runId || incidentStorageRef.current.activeEpisode.episodeId !== activeIncident.episodeId) return;
    setIncidentCutInVisible(false); setHeaderPopover(null); router.push({ pathname: '/story/[episodeId]', params: { episodeId: activeIncident.episodeId } });
  }, [activeIncident, commitIncidentStorage, playSfx]);

  const restartIncident = useCallback(async () => {
    if (!activeEpisodeData && activeIncident) return;
    if (!activeIncident) { await triggerIncident('direct'); return; }
    playSfx('tap');
    try { await commitIncidentStorage((current) => current.activeEpisode?.runId === activeIncident.runId && activeEpisodeData ? { ...current, activeEpisode: { ...current.activeEpisode, playback: createInitialPlaybackState(activeEpisodeData), notification: { pending: false, cutInSeen: true } } } : current); } catch { setNotice('最初からの状態を保存できませんでした。もう一度お試しください'); return; }
    if (incidentStorageRef.current.activeEpisode?.runId !== activeIncident.runId || incidentStorageRef.current.activeEpisode.episodeId !== activeIncident.episodeId) return;
    setIncidentCutInVisible(false); setHeaderPopover(null); router.push({ pathname: '/story/[episodeId]', params: { episodeId: activeIncident.episodeId } });
  }, [activeEpisodeData, activeIncident, commitIncidentStorage, playSfx, triggerIncident]);

  const dismissIncidentCutIn = useCallback(async () => {
    playSfx('tap');
    setIncidentCutInVisible(false);
    if (activeIncident) {
      try { await commitIncidentStorage((current) => acknowledgeEpisode(current, activeIncident.runId, true)); } catch { setIncidentCutInVisible(true); setNotice('進行状況を保存できませんでした。もう一度お試しください'); return; }
      if (incidentStorageRef.current.activeEpisode?.runId !== activeIncident.runId) return;
    }
    navigateTo('home');
    setNotice('第1話をエピソードタブに保存しました');
  }, [activeIncident, commitIncidentStorage, navigateTo, playSfx]);

  const startIncidentInvestigation = useCallback(async () => {
    playSfx('tap');
    setIncidentCutInVisible(false);
    if (!activeIncident) return;
    try { await commitIncidentStorage((current) => acknowledgeEpisode(current, activeIncident.runId, true)); } catch { setNotice('進行状況を保存できませんでした。もう一度お試しください'); return; }
    if (incidentStorageRef.current.activeEpisode?.runId !== activeIncident.runId || incidentStorageRef.current.activeEpisode.episodeId !== activeIncident.episodeId) return;
    router.push({ pathname: '/story/[episodeId]', params: { episodeId: activeIncident.episodeId } });
  }, [activeIncident, commitIncidentStorage, playSfx]);

  useEffect(() => {
    if (!storageReady || !appStarted || !tutorialComplete || activeIncidentId || incidentResolutionPhase !== 'none') return;
    const delay = 14000 + Math.floor(Math.random() * 12000);
    const timer = setTimeout(() => triggerIncident(), delay);
    return () => clearTimeout(timer);
  }, [activeIncidentId, appStarted, incidentResolutionPhase, storageReady, triggerIncident, tutorialComplete]);

  const completeIncidentReturn = useCallback(() => {
    if (!pendingIncidentReward || pendingIncidentReward.step !== 'returning') return;
    setIncidentStorage((current) => advanceEpisodeResolution(current, pendingIncidentReward.runId));
    setIncidentCutInVisible(false);
  }, [pendingIncidentReward]);

  const flushEpisodeProgress = useCallback(async () => {
    if (episodeProgressTimerRef.current) clearTimeout(episodeProgressTimerRef.current);
    episodeProgressTimerRef.current = null;
    const pending = pendingEpisodeProgressRef.current;
    if (!pending) return;
    try {
      await commitIncidentStorage((current) => current.activeEpisode?.runId === pending.runId && current.activeEpisode.episodeId === pending.playback.episodeId ? saveEpisodePlayback(current, pending.runId, pending.playback) : current);
      if (pendingEpisodeProgressRef.current === pending) pendingEpisodeProgressRef.current = null;
    } catch {
      if (!pendingEpisodeProgressRef.current) pendingEpisodeProgressRef.current = pending;
    }
  }, [commitIncidentStorage]);

  const handleEpisodeProgress = useCallback((playback: PlaybackState) => {
    if (!activeIncident || playback.episodeId !== activeIncident.episodeId) return;
    const choiceChanged = Object.keys(playback.choices).length > Object.keys(activeIncident.playback.choices).length;
    pendingEpisodeProgressRef.current = { runId: activeIncident.runId, playback };
    if (choiceChanged) { void flushEpisodeProgress(); return; }
    if (episodeProgressTimerRef.current) clearTimeout(episodeProgressTimerRef.current);
    episodeProgressTimerRef.current = setTimeout(() => { void flushEpisodeProgress(); }, EPISODE_PROGRESS_DEBOUNCE_MS);
  }, [activeIncident, flushEpisodeProgress]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') void flushEpisodeProgress();
    });
    return () => subscription.remove();
  }, [flushEpisodeProgress]);

  const interruptEpisode = useCallback(async (playback: PlaybackState) => {
    const active = incidentStorageRef.current.activeEpisode;
    if (!active || active.episodeId !== playback.episodeId) return;
    if (episodeProgressTimerRef.current) clearTimeout(episodeProgressTimerRef.current);
    await commitIncidentStorage((current) => current.activeEpisode?.runId === active.runId && current.activeEpisode.episodeId === playback.episodeId ? saveEpisodePlayback(current, active.runId, playback) : current);
    if (pendingEpisodeProgressRef.current?.runId === active.runId) pendingEpisodeProgressRef.current = null;
  }, [commitIncidentStorage]);

  const completeActiveEpisode = useCallback(async (result: { completedAt: string; finalState: PlaybackState }) => {
    const active = incidentStorageRef.current.activeEpisode;
    if (!active || completedEpisodeRunIdsRef.current.has(active.runId)) return;
    if (episodeProgressTimerRef.current) clearTimeout(episodeProgressTimerRef.current);
    await commitIncidentStorage((current) => completeEpisode(current, active.runId, result.finalState, Date.parse(result.completedAt) || Date.now()));
    completedEpisodeRunIdsRef.current.add(active.runId);
    if (pendingEpisodeProgressRef.current?.runId === active.runId) pendingEpisodeProgressRef.current = null;
    playSfx('caseSolved'); haptics.success();
  }, [commitIncidentStorage, haptics, playSfx]);

  const handleEpisodeCue = useCallback((cue: Cue) => {
    if (cue === 'vibrate-heavy') haptics.heavy();
    else if (cue === 'vibrate-light') haptics.light();
    else if (cue === 'transition-flash') { haptics.medium(); playSfx('incidentSting'); }
    else if (cue === 'zoom-in' || cue === 'zoom-out') playSfx('clueReveal');
    else playSfx('tap');
  }, [haptics, playSfx]);

  useEffect(() => () => {
    if (episodeProgressTimerRef.current) clearTimeout(episodeProgressTimerRef.current);
  }, []);

  const interact = useCallback((kind: string) => {
    if (kind !== 'ほっぺ') {
      playSfx('tap');
      setReaction('？');
      return 0;
    }
    const mobby = getMobby(ITEM_MOBBY_IDS[selected.id] ?? 'mobichi');
    const lines = mobby.lines.tease;
    const currentIndex = pullReactionIndexRef.current[selected.id] ?? 0;
    setReaction(lines[currentIndex % lines.length]);
    const nextCount = currentIndex + 1;
    pullReactionIndexRef.current[selected.id] = nextCount;
    playSfx(nextCount % 10 === 0 ? 'reward' : 'tap');
    return nextCount;
  }, [playSfx, selected.id]);

  const playKeychainJingle = useCallback(() => {
    const now = Date.now();
    if (now - lastKeyJingleRef.current < 90) return;
    lastKeyJingleRef.current = now;
    playSfx('keyJingle');
  }, [playSfx]);

  const dismissResolution = useCallback(() => {
    if (!pendingIncidentReward || pendingIncidentReward.step !== 'aftermath') return;
    playSfx('tap');
    setIncidentStorage((current) => dismissEpisodeResolution(current, pendingIncidentReward.runId));
    setNotice('エピソード完走！ モビーが壁に戻りました');
  }, [pendingIncidentReward, playSfx]);

  const openResolutionCasebook = useCallback(() => {
    if (!pendingIncidentReward || pendingIncidentReward.step !== 'aftermath') return;
    playSfx('tap');
    setCasebookInitialTab('relationships');
    setIncidentStorage((current) => dismissEpisodeResolution(current, pendingIncidentReward.runId));
    navigateTo('casebook');
  }, [navigateTo, pendingIncidentReward, playSfx]);

  const playEpisodeFromCasebook = useCallback((episodeId: string) => startEpisodeById(episodeId as EpisodeId, 'direct'), [startEpisodeById]);

  const toggleSound = useCallback(() => {
    if (soundEnabled) {
      setSoundEnabled(false);
      return;
    }
    engageBgm();
    setSoundEnabled(true);
  }, [engageBgm, soundEnabled]);

  const setSoundPreference = useCallback((enabled: boolean) => {
    if (enabled === soundEnabled) return;
    toggleSound();
  }, [soundEnabled, toggleSound]);

  const closeHeaderPopover = useCallback(() => {
    playSfx('tap');
    setHeaderPopover(null);
  }, [playSfx]);

  const returnToNotifications = useCallback(() => {
    playSfx('tap');
    setHeaderPopover('notifications');
  }, [playSfx]);

  const finishMobbyTimePopover = useCallback(async (destination: '/' | '/collection') => {
    const reward = daily.state.mobbyTimeReward;
    if (!reward || reward.phase !== 'placed' || !mobbyTimeResultReady) return;
    if (!await daily.completeMobbyTimeReward(reward.eventId)) return;
    playSfx('tap');
    setHeaderPopover(null);
    if (pathname !== destination) requestAnimationFrame(() => router.navigate(destination));
  }, [daily, mobbyTimeResultReady, pathname, playSfx]);

  const setFavorite = useCallback((id: string) => {
    if (!ITEMS.some((item) => item.id === id)) return false;
    const item = ITEMS.find((candidate) => candidate.id === id)!;
    const isOwned = COLLECTIBLE_VARIANTS.some((variant) => ownedCollectibleCount(owned, item.id, variant) > 0);
    if (!isOwned) return false;
    setReaction('');
    setSelectedId(id);
    return true;
  }, [owned]);

  const startApp = useCallback(() => {
    setAppStarted(true);
    // Deep-linked tab routes own their initial scene. Starting the shell must
    // never redirect a retained Collection/Stories tab into onboarding.
    if (pathname !== '/' && pathname !== '/mobby-time') return;
    if (!tutorialComplete && onboardingReward) {
      setSelectedId(onboardingReward.itemId);
      setMobbyTimeStage(onboardingReward.phase);
      const recoveredStep: OnboardingStep = onboardingReward.phase === 'arrived'
        ? 'mobbyTime'
        : onboardingReward.phase === 'opening'
          ? 'opening'
          : onboardingReward.phase === 'placed'
            ? 'home'
            : 'place';
      setOnboardingStep(recoveredStep);
      navigateTo(onboardingReward.phase === 'placed' ? 'home' : 'time', 'silent');
      return;
    }
    navigateTo('home', 'silent');
    if (!tutorialComplete) setOnboardingStep('favorite');
  }, [navigateTo, onboardingReward, pathname, tutorialComplete]);

  const confirmFavorite = useCallback(async () => {
    if (onboardingConfirmRunningRef.current) return;
    onboardingConfirmRunningRef.current = true;
    const existing = onboardingRewardRef.current;
    const reward: OnboardingRewardState = existing ?? {
      version: 1,
      eventId: ONBOARDING_REWARD_EVENT_ID,
      itemId: favoriteDraftId,
      variant: 'key-normal',
      phase: 'arrived',
      inventoryGranted: false,
    };
    try {
      if (!existing) await persistOnboardingReward(reward);
      await ensureOnboardingRewardGranted(reward);
      const persistedReward = onboardingRewardRef.current ?? reward;
      placementHandledIdRef.current = null;
      setSelectedId(persistedReward.itemId);
      setFavoriteDraftId(persistedReward.itemId);
      setSecondsLeft(1800);
      setMobbyTimeStage(persistedReward.phase);
      playSfx('reward');
      const nextStep: OnboardingStep = persistedReward.phase === 'arrived'
        ? 'mobbyTime'
        : persistedReward.phase === 'opening'
          ? 'opening'
          : persistedReward.phase === 'placed'
            ? 'home'
            : 'place';
      setOnboardingStep(nextStep);
      navigateTo(persistedReward.phase === 'placed' ? 'home' : 'time');
      setNotice('最初のグッズが届きました。箱をタップして受け取ろう！');
    } catch {
      setNotice('最初のグッズを保存できませんでした。もう一度お試しください');
    } finally {
      onboardingConfirmRunningRef.current = false;
    }
  }, [ensureOnboardingRewardGranted, favoriteDraftId, navigateTo, persistOnboardingReward, playSfx]);

  const finishOnboarding = useCallback(() => {
    if (onboardingRewardRef.current && ownedRef.current[ONBOARDING_REWARD_RECEIPT] !== 1) {
      setNotice('最初のグッズを保存しています。少し待ってからもう一度お試しください');
      return;
    }
    playSfx('reward');
    setTutorialComplete(true);
    setOnboardingStep('none');
    navigateTo('home');
    setNotice('チュートリアル完了！あとは自由にモビーと遊べます');
  }, [navigateTo, playSfx]);

  const advanceOnboarding = useCallback(() => {
    playSfx('tap');
    if (onboardingStep === 'home') {
      navigateTo('collection');
      setOnboardingStep('collection');
      return;
    }
    if (onboardingStep === 'collection') {
      navigateTo('time');
      setOnboardingStep('time');
      return;
    }
    if (onboardingStep === 'time') {
      finishOnboarding();
    }
  }, [finishOnboarding, navigateTo, onboardingStep, playSfx]);

  // The outer client-ready boundary keeps this entire stateful subtree out of
  // both static rendering and the first client render.
  const stableHydrationScene = null;
  const scene = !clientMounted ? stableHydrationScene : (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outer}>
        <View style={[styles.appViewport, { height: viewportHeight }]}>
            <View style={styles.appShell}>
              <View
                style={styles.appBaseLayer}
                pointerEvents={appBaseIsolated ? 'none' : 'auto'}
                accessibilityElementsHidden={appBaseIsolated}
                importantForAccessibility={appBaseIsolated ? 'no-hide-descendants' : 'auto'}
              >
              {appStarted ? <>
              {screen === 'collection' ? <>
                <Image source={ROOM_BACKGROUND} resizeMode="cover" style={styles.appShellBackground} />
                <Image source={COLLECTION_WALL_BACKGROUND} resizeMode="cover" style={styles.collectionReferenceBackground} />
              </> : <Image source={screen === 'home' ? HOME_WALL_BACKGROUND : ROOM_BACKGROUND} resizeMode="cover" style={styles.appShellBackground} />}
              {incidentExperienceActive ? <View pointerEvents="none" style={styles.globalHeaderPlaceholder} /> : <Header
                onSettings={() => {
                  playSfx('tap');
                  setHeaderPopover('settings');
                }}
                onBell={() => {
                  playSfx('notification');
                  setHeaderPopover('notifications');
                }}
              />}
              {notice && !tutorialRewardActive ? <Pressable accessibilityRole="button" accessibilityLabel={`${notice}。閉じる`} accessibilityLiveRegion="polite" onPress={() => { playSfx('tap'); setNotice(''); }} style={styles.noticeToast}><ImageBackground accessible={false} source={NOTICE_SURFACE} resizeMode="stretch" style={styles.noticeToastImage} /><View style={styles.noticeToastContent}><Text style={styles.noticeToastText}>{notice}</Text><Text style={styles.noticeToastClose}>×</Text></View></Pressable> : null}
              <View style={styles.screenBody}>
                <ScreenTransition screenKey={screen ?? `route:${pathname}`} reduceMotion={reduceMotion}>
                {screen === 'home' ? <HomeScreen selected={selected} characters={shellCharacters} onSelectCharacter={setFavorite} owned={owned} incidentWallItemId={incidentTargetItemId ?? resolutionTargetItemId ?? undefined} incidentWallState={incidentWallState} placementHiddenWallPlacementId={wallPlacement && wallPlacement.variant !== 'plush' ? wallPlacement.placementId : undefined} onIncidentPress={openIncident} homeLayout={homeLayout} onCommitHomeLayout={commitHomeLayout} onMoveHomePlacement={moveHomeItem} onRemoveHomePlacement={hideHomeItem} onArrangeStart={haptics.medium} onArrangeMove={haptics.threshold} onUiTap={() => playSfx('tap')} onInteract={interact} onKeychainSwing={playKeychainJingle} reaction={reaction} entryNonce={tabEntryNonce} /> : null}
                {screen === 'collection' ? <CollectionScreen items={ITEMS} owned={owned} selectedId={selectedId} onSelect={selectItem} onKeychainSwing={playKeychainJingle} entryNonce={tabEntryNonce} /> : null}
                {screen === 'time' && headerPopover !== 'mobby-time' ? <MobbyTimeScreen flow={onboardingRewardActive ? 'onboarding' : 'daily'} today={today} todayVariant={effectiveTodayVariant} stage={effectiveMobbyTimeStage} reduceMotion={reduceMotion} onOpen={handleRewardOpen} onReveal={handleRewardReveal} onPlace={handleRewardPlace} onPlaced={handleRewardPlaced} secondsLeft={secondsLeft} entryNonce={tabEntryNonce} /> : null}
                {screen === 'touch' ? <TouchScreen selected={selected} onInteract={interact} reaction={reaction} /> : null}
                {screen === 'casebook' ? <IncidentCasebookScreen activeEpisode={casebookActiveCase} episodes={casebookEpisodes} relationships={casebookRelationships} initialTab={casebookInitialTab} onResume={resumeIncident} onRestart={restartIncident} onStart={() => triggerIncident('direct')} onPlayEpisode={playEpisodeFromCasebook} onClose={() => navigateTo('home')} entryNonce={tabEntryNonce} /> : null}
                </ScreenTransition>
              </View>
              {wallPlacement && wallPlacement.variant !== 'plush' ? <WallPlacementFlight item={wallPlacement.item} variant={wallPlacement.variant} targetSlotIndex={homeLayout.wallSlots.indexOf(wallPlacement.placementId)} onComplete={completeWallPlacement} /> : null}
              {onboardingStep !== 'none' && onboardingStep !== 'favorite' ? <OnboardingGuide step={onboardingStep} onNext={advanceOnboarding} onSkip={finishOnboarding} /> : null}
              {onboardingStep === 'favorite' ? <FavoriteMobbyPicker selectedId={favoriteDraftId} onSelect={(id) => { playSfx('tap'); setFavoriteDraftId(id); }} onConfirm={confirmFavorite} /> : null}
              </> : null}
              </View>
              {appStarted && headerPopover === 'settings' ? <SettingsPopover
                soundEnabled={soundEnabled}
                reduceMotion={reduceMotion}
                onSoundEnabledChange={setSoundPreference}
                onClose={closeHeaderPopover}
              /> : null}
              {appStarted && headerPopover === 'notifications' ? <NotificationsPopover
                onOpenDaily={() => {
                  playSfx('tap');
                  setHeaderPopover('daily');
                }}
                onClose={closeHeaderPopover}
              /> : null}
              {appStarted && headerPopover === 'daily' ? <DailyRecordPopover
                stampCount={daily.state.stampCount}
                missions={daily.state.missions}
                isHydrated={daily.isHydrated}
                onBack={returnToNotifications}
                onClose={closeHeaderPopover}
                onOpenMobbyTime={() => {
                  playSfx('tap');
                  setHeaderPopover('mobby-time');
                }}
              /> : null}
              {appStarted && headerPopover === 'mobby-time' ? <MobbyTimePopover
                resultReady={Boolean(!onboardingRewardActive && persistedMobbyTimeReward?.phase === 'placed' && mobbyTimeResultReady)}
                onBack={returnToNotifications}
                onClose={closeHeaderPopover}
                onOpenHome={() => void finishMobbyTimePopover('/')}
                onOpenCollection={() => void finishMobbyTimePopover('/collection')}
              >
                <MobbyTimeScreen
                  flow={onboardingRewardActive ? 'onboarding' : 'daily'}
                  today={today}
                  todayVariant={effectiveTodayVariant}
                  stage={effectiveMobbyTimeStage}
                  reduceMotion={reduceMotion}
                  onOpen={handleRewardOpen}
                  onReveal={handleRewardReveal}
                  onPlace={handleModalRewardPlace}
                  onPlaced={handleModalRewardPlaced}
                  presentation="popover"
                  secondsLeft={secondsLeft}
                />
              </MobbyTimePopover> : null}
              {appStarted && headerPopover === 'stories' ? <ShellDetailPopover
                accessibilityLabel="関係性アルバム"
                eyebrow="RELATIONSHIP ALBUM"
                flush
                onBack={returnToNotifications}
                onClose={closeHeaderPopover}
                scrollable={false}
                subtitle="ふたりのおはなしを見返そう"
                title="関係性アルバム"
              >
                <IncidentCasebookScreen
                  activeEpisode={casebookActiveCase}
                  embedded
                  episodes={casebookEpisodes}
                  relationships={casebookRelationships}
                  initialTab={casebookInitialTab}
                  onResume={resumeIncident}
                  onRestart={restartIncident}
                  onStart={() => triggerIncident('direct')}
                  onPlayEpisode={playEpisodeFromCasebook}
                  onClose={closeHeaderPopover}
                  entryNonce={tabEntryNonce}
                />
              </ShellDetailPopover> : null}
              {!appStarted ? <OpeningScreen onBegin={() => { engageBgm(); playSfx('reward'); }} onStart={startApp} /> : null}
              {appStarted && (!storageReady || (!fontsLoaded && !fontError)) ? <LoadingOverlay /> : null}
              {incidentCutInActive && activeEpisodeEnemy && activeEpisodeData && cutInTargetItem ? <IncidentCutIn enemyName={activeEpisodeEnemy.name} enemyImage={activeEpisodeEnemy.image} targetName={getMobby(activeEpisodeData.featuredMobbyId).name} targetImage={cutInTargetItem.image} onPlay={startIncidentInvestigation} onLater={dismissIncidentCutIn} /> : null}
              {incidentResolutionActive && pendingIncidentReward && resolutionEpisode && resolutionEnemy && resolutionTargetItem ? <IncidentResolutionOverlay phase={incidentResolutionPhase === 'returning' ? 'returning' : 'aftermath'} targetName={getMobby(resolutionEpisode.featuredMobbyId).name} targetImage={resolutionTargetItem.image} enemyName={resolutionEnemy.name} endingLabel={resolutionEndingLabel} relationshipLabel={resolutionRelationshipLabel} onReturnComplete={completeIncidentReturn} onDismiss={dismissResolution} onOpenCasebook={openResolutionCasebook} /> : null}
            </View>
        </View>
      </View>
    </SafeAreaView>
  );
  const mobbyTimeOpenScene = useMemo(() => (
    <View style={styles.appShell}>
      <Image source={ROOM_BACKGROUND} resizeMode="cover" style={styles.appShellBackground} />
      <MobbyTimeScreen
        flow="daily"
        today={today}
        todayVariant={effectiveTodayVariant}
        stage={effectiveMobbyTimeStage}
        reduceMotion={reduceMotion}
        onOpen={handleRewardOpen}
        onReveal={handleRewardReveal}
        onPlace={handleModalRewardPlace}
        onPlaced={handleModalRewardPlaced}
        secondsLeft={secondsLeft}
      />
    </View>
  ), [effectiveMobbyTimeStage, effectiveTodayVariant, handleModalRewardPlace, handleModalRewardPlaced, handleRewardOpen, handleRewardReveal, reduceMotion, secondsLeft, today]);
  const shellValue = useMemo<MobbyShellValue>(() => ({
    appStarted,
    opening: !appStarted || incidentExperienceActive || effectiveMobbyTimeStage === 'opening',
    isHydrated: storageReady && daily.isHydrated,
    characters: shellCharacters,
    collectibleInventory: owned,
    favoriteId: selectedId,
    setFavorite,
    soundEnabled,
    setSoundEnabled: setSoundPreference,
    reduceMotion,
    hasUnresolvedEpisode: hasUnresolvedIncident,
    unresolvedEpisodeTitle: activeEpisodeData?.title ?? null,
    mobbyTimeOpenScene,
    mobbyTimeResultReady,
    activeEpisode: activeIncident,
    activeEpisodeData: activeEpisodeData ?? null,
    saveEpisodeProgress: handleEpisodeProgress,
    interruptEpisode,
    completeActiveEpisode,
    emitEpisodeCue: handleEpisodeCue,
  }), [activeEpisodeData, activeIncident, appStarted, completeActiveEpisode, daily.isHydrated, effectiveMobbyTimeStage, handleEpisodeCue, handleEpisodeProgress, hasUnresolvedIncident, incidentExperienceActive, interruptEpisode, mobbyTimeOpenScene, mobbyTimeResultReady, owned, reduceMotion, selectedId, setFavorite, setSoundPreference, shellCharacters, soundEnabled, storageReady]);

  return (
    <MobbyShellContext.Provider value={shellValue}>
      <MobbySceneContext.Provider value={{ scene }}>
        {children}
      </MobbySceneContext.Provider>
    </MobbyShellContext.Provider>
  );
}
