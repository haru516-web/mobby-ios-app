import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MPLUSRounded1c_700Bold, MPLUSRounded1c_800ExtraBold } from '@expo-google-fonts/m-plus-rounded-1c';
import { MochiyPopOne_400Regular } from '@expo-google-fonts/mochiy-pop-one';
import { Asset } from 'expo-asset';
import { useFonts } from 'expo-font';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text as NativeText,
  View,
  type LayoutChangeEvent,
  type TextProps,
} from 'react-native';

import { MobbyPullMesh, type MobbyPullMeshHandle } from '@/components/MobbyPullMesh';
import { MobbyCarousel } from '@/components/MobbyCarousel';
import { getMobby, type MobbyId } from '@/data/mobies';
import { getEnemy } from '@/data/enemyCases';
import { PULL_ASSETS, type MobbyPullAsset, type PullFrame } from '@/data/mobbyPullAssets';
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
} from '@/domain/incidents/episodeArchive';
import { createInitialPlaybackState } from '@/data/episodes/playback';
import { EPISODES, getEpisode } from '@/data/episodes/registry';
import type { Cue, EpisodeId, PlaybackState } from '@/data/episodes/types';
import { EpisodeScreen } from '@/screens/EpisodeScreen';
import { useMobbyHaptics } from '@/hooks/useMobbyHaptics';
import { HomeScreen } from '@/screens/HomeScreen';
import { CollectionScreen } from '@/screens/CollectionScreen';
import { MobbyTimeScreen } from '@/screens/MobbyTimeScreen';
import { TouchScreen } from '@/screens/TouchScreen';
import { styles } from '@/ui/layout/appStyles';
import { ScreenTransition } from '@/components/ScreenTransition';
import { WallPlacementFlight } from '@/screens/screenImplementations';
import { MISSION_BONUS, STAMP_REWARDS, reactionMilestoneReward } from '@/data/dailyRewards';
import { useDailyLoop } from '@/game/DailyLoopContext';
import { receiptBackedInventoryGrant, type PendingReward } from '@/game/dailyLoopStorage';

type Screen = 'home' | 'collection' | 'time' | 'touch' | 'casebook' | 'episode';
type ItemKind = 'ぬいキー' | 'ぬいぐるみ';
type CollectibleVariant = 'key-normal' | 'key-small' | 'plush';
type KeychainImageSize = 'normal' | 'small';
type CollectibleReward = { item: Item; variant: CollectibleVariant };
type MobbyTimeStage = 'arrived' | 'opening' | 'revealed' | 'placing' | 'placed';
type OnboardingRewardState = {
  version: 1;
  eventId: string;
  itemId: string;
  variant: 'key-normal';
  phase: MobbyTimeStage;
  inventoryGranted: boolean;
};
type HomePlacementKind = 'wall' | 'shelf';
type OnboardingStep = 'none' | 'favorite' | 'mobbyTime' | 'opening' | 'place' | 'wallFlight' | 'home' | 'collection' | 'time';
type IncidentResolutionPhase = 'none' | 'returning' | 'aftermath';

const DESIGN_WIDTH = 440;
const DESIGN_MIN_HEIGHT = 720;
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
  const isStrong = ['500', '600', '700', '800', '900', 'bold'].includes(String(fontWeight));
  const isDisplay = flattened?.fontFamily === 'MochiyPopOne_400Regular' || (['800', '900'].includes(String(fontWeight)) && fontSize >= 15);
  const fontFamily = isDisplay
    ? 'MochiyPopOne_400Regular'
    : isStrong
      ? 'MPLUSRounded1c_800ExtraBold'
      : 'MPLUSRounded1c_700Bold';
  const ivoryEdge = !isDisplay && isDarkTextColor(flattened?.color) && !flattened?.textShadowColor
    ? { textShadowColor: 'rgba(255,250,237,0.94)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 1.15 }
    : null;

  return <NativeText {...props} maxFontSizeMultiplier={maxFontSizeMultiplier} style={[style, compactType, ivoryEdge, { fontFamily, fontWeight: 'normal' }]} />;
}

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
const MOBBY_TIME_BOARD = require('../../assets/backgrounds/mobby-time-board.png');
const MOBBY_TIME_PACKAGE = require('../../assets/mobby-time-package.png');
const MOBBY_TIME_OPENED_BOX = require('../../assets/mobby-time-opened-box.png');
const MOBBY_TIME_TIMER_PLAQUE = require('../../assets/mobby-time/timer-plaque.png');
const MOBBY_TIME_MESSAGE_PLAQUE = require('../../assets/mobby-time/message-plaque.png');
const MOBBY_TIME_REWARD_SEAL = require('../../assets/mobby-time/reward-seal.png');
const UI_WIDE_PAPER = require('../../assets/home-ui/panels/wide-paper.png');
const UI_BOTTOM_STRIP = require('../../assets/home-ui/panels/bottom-strip.png');
const UI_CREAM_BUTTON = require('../../assets/home-ui/buttons/cream-button.png');
const UI_CORAL_BUTTON = require('../../assets/home-ui/buttons/coral-button.png');
const MOBBY_LOGO_RAINBOW = require('../../assets/home-ui/logo/mobby-logo-rainbow.webp');
const BELL = require('../../assets/home-ui/icons/bell.png');
const SPARKLES = require('../../assets/home-ui/icons/sparkles.png');
const HOUSE = require('../../assets/home-ui/icons/house.png');
const MOBBY_ICON = require('../../assets/home-ui/icons/mobby.png');
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
const FEATURED_EPISODE_ID = 'episode-1' as const;
const EPISODE_PROGRESS_DEBOUNCE_MS = 180;
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
    require('../../assets/mobies/reactions/mobibou_tease_reaction_01_notice.webp'),
    require('../../assets/mobies/reactions/mobibou_tease_reaction_02_escape.webp'),
    require('../../assets/mobies/reactions/mobibou_tease_reaction_03_swatt.webp'),
    require('../../assets/mobies/reactions/mobibou_tease_reaction_04_stomp.webp'),
    require('../../assets/mobies/reactions/mobibou_extra_reaction_09_bawling_waterfall.webp'),
    require('../../assets/mobies/reactions/mobibou_extra_reaction_10_defensive_curl.webp'),
    require('../../assets/mobies/reactions/mobibou_extra_reaction_11_frantic_no.webp'),
    require('../../assets/mobies/reactions/mobibou_extra_reaction_12_dramatic_faint.webp'),
    require('../../assets/mobies/reactions/mobibou_extra_reaction_13_furious_stomp.webp'),
    require('../../assets/mobies/reactions/mobibou_extra_reaction_14_backward_escape.webp'),
    require('../../assets/mobies/reactions/mobibou_extra_reaction_15_cheek_shield.webp'),
    require('../../assets/mobies/reactions/mobibou_extra_reaction_16_floor_cling.webp'),
    require('../../assets/mobies/reactions/mobibou_extra_reaction_17_starfish_tantrum.webp'),
    require('../../assets/mobies/reactions/mobibou_extra_reaction_18_offended_turnaway.webp'),
    require('../../assets/mobies/reactions/mobibou_extra_reaction_19_tiny_rage_shake.webp'),
    require('../../assets/mobies/reactions/mobibou_extra_reaction_20_ultimate_enough.webp'),
  ],
  mobiyura: [
    require('../../assets/mobies/reactions/mobiyura_pull_reaction_01_startled.webp'),
    require('../../assets/mobies/reactions/mobiyura_pull_reaction_02_hold_cheek.webp'),
    require('../../assets/mobies/reactions/mobiyura_pull_reaction_03_dramatic_protest.webp'),
    require('../../assets/mobies/reactions/mobiyura_pull_reaction_04_haughty_sulk.webp'),
    require('../../assets/mobies/reactions/mobiyura_tease_reaction_01_notice.webp'),
    require('../../assets/mobies/reactions/mobiyura_tease_reaction_02_escape.webp'),
    require('../../assets/mobies/reactions/mobiyura_tease_reaction_03_swatt.webp'),
    require('../../assets/mobies/reactions/mobiyura_tease_reaction_04_dramatic_stomp.webp'),
    require('../../assets/mobies/reactions/mobiyura_extra_reaction_09_bawling_waterfall.webp'),
    require('../../assets/mobies/reactions/mobiyura_extra_reaction_10_defensive_curl.webp'),
    require('../../assets/mobies/reactions/mobiyura_extra_reaction_11_frantic_no.webp'),
    require('../../assets/mobies/reactions/mobiyura_extra_reaction_12_dramatic_faint.webp'),
    require('../../assets/mobies/reactions/mobiyura_extra_reaction_13_furious_stomp.webp'),
    require('../../assets/mobies/reactions/mobiyura_extra_reaction_14_backward_escape.webp'),
    require('../../assets/mobies/reactions/mobiyura_extra_reaction_15_cheek_shield.webp'),
    require('../../assets/mobies/reactions/mobiyura_extra_reaction_16_floor_cling.webp'),
    require('../../assets/mobies/reactions/mobiyura_extra_reaction_17_starfish_tantrum.webp'),
    require('../../assets/mobies/reactions/mobiyura_extra_reaction_18_offended_turnaway.webp'),
    require('../../assets/mobies/reactions/mobiyura_extra_reaction_19_tiny_rage_shake.webp'),
    require('../../assets/mobies/reactions/mobiyura_extra_reaction_20_ultimate_enough.webp'),
  ],
  reomoby: [
    require('../../assets/mobies/reactions/reomoby_pull_reaction_01_startled.webp'),
    require('../../assets/mobies/reactions/reomoby_pull_reaction_02_hold_cheek.webp'),
    require('../../assets/mobies/reactions/reomoby_pull_reaction_03_aristocratic_protest.webp'),
    require('../../assets/mobies/reactions/reomoby_pull_reaction_04_haughty_sulk.webp'),
    require('../../assets/mobies/reactions/reomoby_tease_reaction_01_notice.webp'),
    require('../../assets/mobies/reactions/reomoby_tease_reaction_02_escape.webp'),
    require('../../assets/mobies/reactions/reomoby_tease_reaction_03_swatt.webp'),
    require('../../assets/mobies/reactions/reomoby_tease_reaction_04_royal_stomp.webp'),
    require('../../assets/mobies/reactions/reomoby_extra_reaction_09_bawling_waterfall.webp'),
    require('../../assets/mobies/reactions/reomoby_extra_reaction_10_defensive_curl.webp'),
    require('../../assets/mobies/reactions/reomoby_extra_reaction_11_frantic_no.webp'),
    require('../../assets/mobies/reactions/reomoby_extra_reaction_12_dramatic_faint.webp'),
    require('../../assets/mobies/reactions/reomoby_extra_reaction_13_furious_stomp.webp'),
    require('../../assets/mobies/reactions/reomoby_extra_reaction_14_backward_escape.webp'),
    require('../../assets/mobies/reactions/reomoby_extra_reaction_15_cheek_shield.webp'),
    require('../../assets/mobies/reactions/reomoby_extra_reaction_16_floor_cling.webp'),
    require('../../assets/mobies/reactions/reomoby_extra_reaction_17_starfish_tantrum.webp'),
    require('../../assets/mobies/reactions/reomoby_extra_reaction_18_offended_turnaway.webp'),
    require('../../assets/mobies/reactions/reomoby_extra_reaction_19_tiny_rage_shake.webp'),
    require('../../assets/mobies/reactions/reomoby_extra_reaction_20_ultimate_enough.webp'),
  ],
  mobirin: [
    require('../../assets/mobies/reactions/mobirin_mobirin_pull_reaction_01_startled.webp'),
    require('../../assets/mobies/reactions/mobirin_mobirin_pull_reaction_02_hold_cheek.webp'),
    require('../../assets/mobies/reactions/mobirin_mobirin_pull_reaction_03_indignant_protest.webp'),
    require('../../assets/mobies/reactions/mobirin_mobirin_pull_reaction_04_dignified_sulk.webp'),
    require('../../assets/mobies/reactions/mobirin_mobirin_tease_reaction_01_notice.webp'),
    require('../../assets/mobies/reactions/mobirin_mobirin_tease_reaction_02_escape.webp'),
    require('../../assets/mobies/reactions/mobirin_mobirin_tease_reaction_03_swatt.webp'),
    require('../../assets/mobies/reactions/mobirin_mobirin_tease_reaction_04_gentlemanly_stomp.webp'),
    require('../../assets/mobies/reactions/mobirin_extra_reaction_09_bawling_waterfall.webp'),
    require('../../assets/mobies/reactions/mobirin_extra_reaction_10_defensive_curl.webp'),
    require('../../assets/mobies/reactions/mobirin_extra_reaction_11_frantic_no.webp'),
    require('../../assets/mobies/reactions/mobirin_extra_reaction_12_dramatic_faint.webp'),
    require('../../assets/mobies/reactions/mobirin_extra_reaction_13_furious_stomp.webp'),
    require('../../assets/mobies/reactions/mobirin_extra_reaction_14_backward_escape.webp'),
    require('../../assets/mobies/reactions/mobirin_extra_reaction_15_cheek_shield.webp'),
    require('../../assets/mobies/reactions/mobirin_extra_reaction_16_floor_cling.webp'),
    require('../../assets/mobies/reactions/mobirin_extra_reaction_17_starfish_tantrum.webp'),
    require('../../assets/mobies/reactions/mobirin_extra_reaction_18_offended_turnaway.webp'),
    require('../../assets/mobies/reactions/mobirin_extra_reaction_19_tiny_rage_shake.webp'),
    require('../../assets/mobies/reactions/mobirin_extra_reaction_20_ultimate_enough.webp'),
  ],
  potemoby: [
    require('../../assets/mobies/reactions/potemoby_pote_pull_reaction_01_sleepy_startled.webp'),
    require('../../assets/mobies/reactions/potemoby_pote_pull_reaction_02_hold_cheek.webp'),
    require('../../assets/mobies/reactions/potemoby_pote_pull_reaction_03_lazy_protest.webp'),
    require('../../assets/mobies/reactions/potemoby_pote_pull_reaction_04_lazy_sulk.webp'),
    require('../../assets/mobies/reactions/potemoby_pote_tease_reaction_01_notice.webp'),
    require('../../assets/mobies/reactions/potemoby_pote_tease_reaction_02_lazy_escape.webp'),
    require('../../assets/mobies/reactions/potemoby_pote_tease_reaction_03_lazy_swatt.webp'),
    require('../../assets/mobies/reactions/potemoby_pote_tease_reaction_04_heavy_stomp.webp'),
    require('../../assets/mobies/reactions/potemoby_extra_reaction_09_bawling_waterfall.webp'),
    require('../../assets/mobies/reactions/potemoby_extra_reaction_10_defensive_curl.webp'),
    require('../../assets/mobies/reactions/potemoby_extra_reaction_11_frantic_no.webp'),
    require('../../assets/mobies/reactions/potemoby_extra_reaction_12_dramatic_faint.webp'),
    require('../../assets/mobies/reactions/potemoby_extra_reaction_13_furious_stomp.webp'),
    require('../../assets/mobies/reactions/potemoby_extra_reaction_14_backward_escape.webp'),
    require('../../assets/mobies/reactions/potemoby_extra_reaction_15_cheek_shield.webp'),
    require('../../assets/mobies/reactions/potemoby_extra_reaction_16_floor_cling.webp'),
    require('../../assets/mobies/reactions/potemoby_extra_reaction_17_starfish_tantrum.webp'),
    require('../../assets/mobies/reactions/potemoby_extra_reaction_18_offended_turnaway.webp'),
    require('../../assets/mobies/reactions/potemoby_extra_reaction_19_tiny_rage_shake.webp'),
    require('../../assets/mobies/reactions/potemoby_extra_reaction_20_ultimate_enough.webp'),
  ],
  babumoby: [
    require('../../assets/mobies/reactions/babumoby_babu_pull_reaction_01_startled.webp'),
    require('../../assets/mobies/reactions/babumoby_babu_pull_reaction_02_hold_cheek.webp'),
    require('../../assets/mobies/reactions/babumoby_babu_pull_reaction_03_baby_protest.webp'),
    require('../../assets/mobies/reactions/babumoby_babu_pull_reaction_04_sulking.webp'),
    require('../../assets/mobies/reactions/babumoby_babu_tease_reaction_01_notice.webp'),
    require('../../assets/mobies/reactions/babumoby_babu_tease_reaction_02_escape.webp'),
    require('../../assets/mobies/reactions/babumoby_babu_tease_reaction_03_push_away.webp'),
    require('../../assets/mobies/reactions/babumoby_babu_tease_reaction_04_tantrum.webp'),
    require('../../assets/mobies/reactions/babumoby_extra_reaction_09_bawling_waterfall.webp'),
    require('../../assets/mobies/reactions/babumoby_extra_reaction_10_defensive_curl.webp'),
    require('../../assets/mobies/reactions/babumoby_extra_reaction_11_frantic_no.webp'),
    require('../../assets/mobies/reactions/babumoby_extra_reaction_12_dramatic_faint.webp'),
    require('../../assets/mobies/reactions/babumoby_extra_reaction_13_furious_stomp.webp'),
    require('../../assets/mobies/reactions/babumoby_extra_reaction_14_backward_escape.webp'),
    require('../../assets/mobies/reactions/babumoby_extra_reaction_15_cheek_shield.webp'),
    require('../../assets/mobies/reactions/babumoby_extra_reaction_16_floor_cling.webp'),
    require('../../assets/mobies/reactions/babumoby_extra_reaction_17_starfish_tantrum.webp'),
    require('../../assets/mobies/reactions/babumoby_extra_reaction_18_offended_turnaway.webp'),
    require('../../assets/mobies/reactions/babumoby_extra_reaction_19_tiny_rage_shake.webp'),
    require('../../assets/mobies/reactions/babumoby_extra_reaction_20_ultimate_enough.webp'),
  ],
  mobichi: [
    require('../../assets/mobies/reactions/mobichi_mobichi_pull_reaction_01_startled.webp'),
    require('../../assets/mobies/reactions/mobichi_mobichi_pull_reaction_02_hold_cheek.webp'),
    require('../../assets/mobies/reactions/mobichi_mobichi_pull_reaction_03_indignant_protest.webp'),
    require('../../assets/mobies/reactions/mobichi_mobichi_pull_reaction_04_dignified_sulk.webp'),
    require('../../assets/mobies/reactions/mobichi_mobichi_tease_reaction_01_notice.webp'),
    require('../../assets/mobies/reactions/mobichi_mobichi_tease_reaction_02_escape.webp'),
    require('../../assets/mobies/reactions/mobichi_mobichi_tease_reaction_03_swatt.webp'),
    require('../../assets/mobies/reactions/mobichi_mobichi_tease_reaction_04_gentlemanly_stomp.webp'),
    require('../../assets/mobies/reactions/mobichi_extra_reaction_09_bawling_waterfall.webp'),
    require('../../assets/mobies/reactions/mobichi_extra_reaction_10_defensive_curl.webp'),
    require('../../assets/mobies/reactions/mobichi_extra_reaction_11_frantic_no.webp'),
    require('../../assets/mobies/reactions/mobichi_extra_reaction_12_dramatic_faint.webp'),
    require('../../assets/mobies/reactions/mobichi_extra_reaction_13_furious_stomp.webp'),
    require('../../assets/mobies/reactions/mobichi_extra_reaction_14_backward_escape.webp'),
    require('../../assets/mobies/reactions/mobichi_extra_reaction_15_cheek_shield.webp'),
    require('../../assets/mobies/reactions/mobichi_extra_reaction_16_floor_cling.webp'),
    require('../../assets/mobies/reactions/mobichi_extra_reaction_17_starfish_tantrum.webp'),
    require('../../assets/mobies/reactions/mobichi_extra_reaction_18_offended_turnaway.webp'),
    require('../../assets/mobies/reactions/mobichi_extra_reaction_19_tiny_rage_shake.webp'),
    require('../../assets/mobies/reactions/mobichi_extra_reaction_20_ultimate_enough.webp'),
  ],
  mobiyan: [
    require('../../assets/mobies/reactions/mobiyan_pull_reaction_01_startled.webp'),
    require('../../assets/mobies/reactions/mobiyan_pull_reaction_02_hold_cheek.webp'),
    require('../../assets/mobies/reactions/mobiyan_pull_reaction_03_indignant_protest.webp'),
    require('../../assets/mobies/reactions/mobiyan_pull_reaction_04_dignified_sulk.webp'),
    require('../../assets/mobies/reactions/mobiyan_tease_reaction_01_notice.webp'),
    require('../../assets/mobies/reactions/mobiyan_tease_reaction_02_escape.webp'),
    require('../../assets/mobies/reactions/mobiyan_tease_reaction_03_swatt.webp'),
    require('../../assets/mobies/reactions/mobiyan_tease_reaction_04_stomp.webp'),
    require('../../assets/mobies/reactions/mobiyan_extra_reaction_09_bawling_waterfall.webp'),
    require('../../assets/mobies/reactions/mobiyan_extra_reaction_10_defensive_curl.webp'),
    require('../../assets/mobies/reactions/mobiyan_extra_reaction_11_frantic_no.webp'),
    require('../../assets/mobies/reactions/mobiyan_extra_reaction_12_dramatic_faint.webp'),
    require('../../assets/mobies/reactions/mobiyan_extra_reaction_13_furious_stomp.webp'),
    require('../../assets/mobies/reactions/mobiyan_extra_reaction_14_backward_escape.webp'),
    require('../../assets/mobies/reactions/mobiyan_extra_reaction_15_cheek_shield.webp'),
    require('../../assets/mobies/reactions/mobiyan_extra_reaction_16_floor_cling.webp'),
    require('../../assets/mobies/reactions/mobiyan_extra_reaction_17_starfish_tantrum.webp'),
    require('../../assets/mobies/reactions/mobiyan_extra_reaction_18_offended_turnaway.webp'),
    require('../../assets/mobies/reactions/mobiyan_extra_reaction_19_tiny_rage_shake.webp'),
    require('../../assets/mobies/reactions/mobiyan_extra_reaction_20_ultimate_enough.webp'),
  ],
  yami: [
    require('../../assets/mobies/reactions/yami_pull_reaction_01_startled.webp'),
    require('../../assets/mobies/reactions/yami_pull_reaction_02_hold_cheek.webp'),
    require('../../assets/mobies/reactions/yami_pull_reaction_03_indignant_protest.webp'),
    require('../../assets/mobies/reactions/yami_pull_reaction_04_dignified_sulk.webp'),
    require('../../assets/mobies/reactions/yami_tease_reaction_01_notice.webp'),
    require('../../assets/mobies/reactions/yami_tease_reaction_02_escape.webp'),
    require('../../assets/mobies/reactions/yami_tease_reaction_03_swatt.webp'),
    require('../../assets/mobies/reactions/yami_tease_reaction_04_stomp.webp'),
    require('../../assets/mobies/reactions/yami_extra_reaction_09_bawling_waterfall.webp'),
    require('../../assets/mobies/reactions/yami_extra_reaction_10_defensive_curl.webp'),
    require('../../assets/mobies/reactions/yami_extra_reaction_11_frantic_no.webp'),
    require('../../assets/mobies/reactions/yami_extra_reaction_12_dramatic_faint.webp'),
    require('../../assets/mobies/reactions/yami_extra_reaction_13_furious_stomp.webp'),
    require('../../assets/mobies/reactions/yami_extra_reaction_14_backward_escape.webp'),
    require('../../assets/mobies/reactions/yami_extra_reaction_15_cheek_shield.webp'),
    require('../../assets/mobies/reactions/yami_extra_reaction_16_floor_cling.webp'),
    require('../../assets/mobies/reactions/yami_extra_reaction_17_starfish_tantrum.webp'),
    require('../../assets/mobies/reactions/yami_extra_reaction_18_offended_turnaway.webp'),
    require('../../assets/mobies/reactions/yami_extra_reaction_19_tiny_rage_shake.webp'),
    require('../../assets/mobies/reactions/yami_extra_reaction_20_ultimate_enough.webp'),
  ],
};

const CASE_REACTION_FRAME_INDEX: Record<string, number> = {
  'case-01-informant': 9,
  'case-02-tracker': 14,
  'case-03-safecracker': 11,
  'case-04-magician': 17,
  'case-05-veiled-duchess': 14,
  'case-06-courier': 15,
  'case-07-operation': 19,
};
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

const COLLECTIBLE_VARIANTS: readonly CollectibleVariant[] = ['key-normal', 'key-small', 'plush'];
const MOBBY_TIME_STAGES: readonly MobbyTimeStage[] = ['arrived', 'opening', 'revealed', 'placing', 'placed'];

function decodeOnboardingReward(raw: string | null): OnboardingRewardState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingRewardState>;
    if (parsed.version !== 1 || typeof parsed.itemId !== 'string' || !ITEMS.some((item) => item.id === parsed.itemId)) return null;
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

function itemCharacterName(item: Item) {
  return item.name.replace(' ぬいキー', '').replace(' ぬい', '');
}

function collectibleInventoryKey(itemId: string, variant: CollectibleVariant) {
  return `${itemId}::${variant}`;
}

function collectibleVariantLabel(variant: CollectibleVariant) {
  if (variant === 'key-normal') return 'ぬいキー（通常）';
  if (variant === 'key-small') return 'ぬいキー（S）';
  return 'ぬいぐるみ';
}

function collectibleVariantFromKeySize(size: KeychainImageSize): CollectibleVariant {
  return size === 'small' ? 'key-small' : 'key-normal';
}

function collectibleImage(item: Item, variant: CollectibleVariant) {
  if (variant === 'key-small') return item.smallKeyImage ?? item.keyImage ?? item.image;
  if (variant === 'key-normal') return item.keyImage ?? item.smallKeyImage ?? item.image;
  return item.image;
}

function collectibleName(item: Item, variant: CollectibleVariant) {
  return `${itemCharacterName(item)} ${collectibleVariantLabel(variant)}`;
}

function ownedCollectibleCount(owned: Record<string, number>, itemId: string, variant: CollectibleVariant) {
  return owned[collectibleInventoryKey(itemId, variant)] ?? 0;
}

function legacyVariantForItem(item: Item): CollectibleVariant {
  return item.kind === 'ぬいキー' ? 'key-normal' : 'plush';
}

const EMPTY_OWNED: Record<string, number> = Object.fromEntries(
  ITEMS.flatMap((item) => COLLECTIBLE_VARIANTS.map((variant) => [collectibleInventoryKey(item.id, variant), 0])),
);

const INITIAL_OWNED: Record<string, number> = ITEMS.reduce<Record<string, number>>((inventory, item) => {
  inventory[collectibleInventoryKey(item.id, legacyVariantForItem(item))] = 1;
  return inventory;
}, { ...EMPTY_OWNED });

function normalizeOwnedInventory(raw: Record<string, unknown>) {
  const normalized = { ...EMPTY_OWNED };
  const hasVariantKeys = Object.keys(raw).some((key) => key.includes('::'));
  if (hasVariantKeys) {
  ITEMS.forEach((item) => COLLECTIBLE_VARIANTS.forEach((variant) => {
      const key = collectibleInventoryKey(item.id, variant);
      normalized[key] = Math.max(0, Number(raw[key]) || 0);
    }));
    Object.entries(raw).forEach(([key, value]) => {
      if ((key.startsWith(DAILY_REWARD_RECEIPT_PREFIX) || key === ONBOARDING_REWARD_RECEIPT) && value === 1) normalized[key] = 1;
    });
    return normalized;
  }
  ITEMS.forEach((item) => {
    normalized[collectibleInventoryKey(item.id, legacyVariantForItem(item))] = Math.max(0, Number(raw[item.id]) || 0);
  });
  Object.entries(raw).forEach(([key, value]) => {
    if ((key.startsWith(DAILY_REWARD_RECEIPT_PREFIX) || key === ONBOARDING_REWARD_RECEIPT) && value === 1) normalized[key] = 1;
  });
  return normalized;
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
  if (typeof collectible.itemId !== 'string' || !ITEMS.some((item) => item.id === collectible.itemId)) return null;
  if (!variant || !COLLECTIBLE_VARIANTS.includes(variant)) return null;
  if (!Number.isSafeInteger(collectible.amount) || collectible.amount <= 0) return null;
  return { itemId: collectible.itemId, variant, amount: collectible.amount };
}

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
  { itemIndex: 1, left: 18, top: 94, size: 117, fromY: 8, toY: -8, fromRotate: '-8deg', toRotate: '5deg', layer: 2 },
  { itemIndex: 6, left: 323, top: 88, size: 117, fromY: -7, toY: 8, fromRotate: '7deg', toRotate: '-5deg', layer: 2 },
  { itemIndex: 2, left: 58, top: 7, size: 96, fromY: 5, toY: -9, fromRotate: '-5deg', toRotate: '7deg', layer: 2 },
  { itemIndex: 7, left: 318, top: 12, size: 96, fromY: -8, toY: 5, fromRotate: '6deg', toRotate: '-6deg', layer: 2 },
  { itemIndex: 3, left: 0, top: 219, size: 108, fromY: 7, toY: -6, fromRotate: '-10deg', toRotate: '4deg', layer: 5 },
  { itemIndex: 8, left: 332, top: 222, size: 108, fromY: -6, toY: 8, fromRotate: '8deg', toRotate: '-4deg', layer: 5 },
  { itemIndex: 4, left: 42, top: 302, size: 99, fromY: 9, toY: -5, fromRotate: '-6deg', toRotate: '8deg', layer: 5 },
  { itemIndex: 5, left: 314, top: 296, size: 99, fromY: -7, toY: 7, fromRotate: '7deg', toRotate: '-7deg', layer: 5 },
] as const;


function Header({ onBell, onInvestigation, hasUnresolvedIncident, soundEnabled, onToggleSound }: { onBell: () => void; onInvestigation: () => void; hasUnresolvedIncident: boolean; soundEnabled: boolean; onToggleSound: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.brandWrap}><Image source={MOBBY_LOGO_RAINBOW} resizeMode="contain" style={styles.headerLogoImage} /></View>
      <View style={styles.headerSpacer} />
      <View style={styles.headerActions}>
        <Pressable accessibilityRole="button" accessibilityLabel={soundEnabled ? 'サウンドをオフ' : 'サウンドをオン'} onPress={onToggleSound} style={[styles.soundButton, !soundEnabled && styles.soundButtonMuted]}>
          <Text style={[styles.soundButtonText, !soundEnabled && styles.soundButtonTextMuted]}>{soundEnabled ? '♪' : '♪'}</Text>
          {!soundEnabled ? <View pointerEvents="none" style={styles.soundMutedSlash} /> : null}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={hasUnresolvedIncident ? '未解決事件を開く' : '事件通知を確認する'} onPress={onInvestigation} style={[styles.caseHeaderButton, styles.pressableFocusReset]}>
          <Image source={require('../../assets/home-ui/icons/notice.png')} resizeMode="contain" style={styles.caseHeaderIcon} />
          <View style={[styles.caseHeaderBadge, !hasUnresolvedIncident && styles.caseHeaderBadgeWaiting]}><Text style={styles.caseHeaderBadgeText}>{hasUnresolvedIncident ? '!' : '·'}</Text></View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="お知らせ" onPress={onBell} style={[styles.bellButton, styles.pressableFocusReset]}>
          <Image source={BELL} resizeMode="contain" style={styles.bellIcon} />
          <View style={styles.bellBadge}><Text style={styles.bellBadgeText}>4</Text></View>
        </Pressable>
      </View>
    </View>
  );
}

function NotificationPopup({
  onClose,
  onOpenMobbyTime,
  onOpenCollection,
  onOpenInvestigation,
  hasUnresolvedIncident,
  incidentNotificationPending,
  incidentTitle,
}: {
  onClose: () => void;
  onOpenMobbyTime: () => void;
  onOpenCollection: () => void;
  onOpenInvestigation: () => void;
  hasUnresolvedIncident: boolean;
  incidentNotificationPending: boolean;
  incidentTitle?: string;
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
            <Text style={styles.notificationSubtitle}>{hasUnresolvedIncident ? '未解決の事件通知が届いています' : '新しい事件の通知を待っています'}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="閉じる" onPress={onClose} style={styles.notificationCloseButton}>
            <Text style={styles.notificationCloseText}>×</Text>
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="MOBBY TIMEのお知らせを開く" onPress={onOpenMobbyTime} style={({ pressed }) => [styles.notificationItem, pressed && styles.notificationItemPressed]}><ImageBackground source={UI_WIDE_PAPER} resizeMode="stretch" style={styles.notificationItemPaper}>
          <View style={[styles.notificationIcon, styles.notificationIconTime]}><Text style={styles.notificationIconText}>✦</Text></View>
          <View style={styles.notificationCopy}>
            <View style={styles.notificationItemHeading}><Text style={styles.notificationKicker}>MOBBY TIME</Text><View style={styles.notificationLiveBadge}><Text style={styles.notificationLiveText}>いま</Text></View></View>
            <Text style={styles.notificationItemTitle}>モビーが届いてる…！</Text>
            <Text style={styles.notificationItemBody}>30分以内に箱を開けてね</Text>
          </View>
          <Text style={styles.notificationChevron}>›</Text>
        </ImageBackground></Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="コレクションのお知らせを開く" onPress={onOpenCollection} style={({ pressed }) => [styles.notificationItem, pressed && styles.notificationItemPressed]}><ImageBackground source={UI_WIDE_PAPER} resizeMode="stretch" style={styles.notificationItemPaper}>
          <View style={[styles.notificationIcon, styles.notificationIconCollection]}><Text style={styles.notificationIconText}>♡</Text></View>
          <View style={styles.notificationCopy}>
            <Text style={styles.notificationKicker}>コレクション</Text>
            <Text style={styles.notificationItemTitle}>新しい飾り方ができるよ</Text>
            <Text style={styles.notificationItemBody}>壁と棚の配置を見てみよう</Text>
          </View>
          <Text style={styles.notificationChevron}>›</Text>
        </ImageBackground></Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel={hasUnresolvedIncident ? '未解決事件のお知らせを開く' : '事件通知を確認する'} onPress={onOpenInvestigation} style={({ pressed }) => [styles.notificationItem, pressed && styles.notificationItemPressed]}><ImageBackground source={UI_WIDE_PAPER} resizeMode="stretch" style={styles.notificationItemPaper}>
          <View style={[styles.notificationIcon, styles.notificationIconCase]}><Text style={styles.notificationIconText}>!</Text></View>
          <View style={styles.notificationCopy}>
            <View style={styles.notificationItemHeading}><Text style={styles.notificationKicker}>事件簿</Text><View style={styles.notificationNewBadge}><Text style={styles.notificationLiveText}>{incidentNotificationPending ? '新着' : hasUnresolvedIncident ? '未解決' : '待機中'}</Text></View></View>
            <Text style={styles.notificationItemTitle}>{hasUnresolvedIncident ? incidentTitle ?? '怪盗がモビーを連れ去った！' : '次の事件を待っています'}</Text>
            <Text style={styles.notificationItemBody}>{incidentNotificationPending ? 'タップして犯行シーンを確認' : hasUnresolvedIncident ? '続きから短編エピソードを再生できます' : '事件ボタンから第1話を始められます'}</Text>
          </View>
          <Text style={styles.notificationChevron}>›</Text>
        </ImageBackground></Pressable>
      </Animated.View>
    </View>
  );
}

function LoadingMascot({ compact = false }: { compact?: boolean }) {
  const motion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 520, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: 520, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
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
    Animated.spring(entrance, { toValue: 1, speed: 18, bounciness: 7, useNativeDriver: true }).start();
  }, [entrance]);

  return (
    <View style={styles.onboardingOverlay}>
      <View style={styles.onboardingBackdrop} />
      <Animated.View style={[styles.favoriteCard, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
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
        <Pressable accessibilityRole="button" accessibilityLabel={`${itemCharacterName(selectedItem)}と始める`} onPress={onConfirm} style={({ pressed }) => [styles.onboardingPrimaryButton, pressed && styles.onboardingPrimaryButtonPressed]}>
          <Text style={styles.onboardingPrimaryText}>この子と始める</Text>
        </Pressable>
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
  home: { step: '1 / 3', title: 'ホーム：モビーと部屋で遊ぶ', body: 'メインモビーを引っ張ると表情・セリフ・リアクションが変化。壁のぬいキーはなぞって揺らせて、「編集」から並べ替えできます。', action: 'コレクションへ', navIndex: 0 },
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
        {copy.action ? <Pressable accessibilityRole="button" onPress={onNext} style={({ pressed }) => [styles.guideButton, styles.pressableFocusReset, pressed && styles.onboardingPrimaryButtonPressed]}><ImageBackground source={UI_CORAL_BUTTON} resizeMode="stretch" style={styles.assetButtonInner}><Text style={styles.guideButtonText}>{copy.action}</Text></ImageBackground></Pressable> : null}
      </ImageBackground>
    </View>
  );
}

function OpeningScreen({ onBegin, onStart }: { onBegin: () => void; onStart: () => void }) {
  const { height: appHeight } = useAppLayout();
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
    Asset.loadAsync([HOME_WALL_BACKGROUND, HOME_GARLAND, PLUSH_SHELF_BASE, WOODEN_HOOK, MOBBY_TIME_OPENED_BOX, MOBBY_TIME_PACKAGE, ...itemAssets])
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
    const pulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(startPulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(startPulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
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
    Animated.timing(exit, { toValue: 1, duration: 430, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
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
  return (
    <Animated.View
      accessibilityLabel="MOBBY COLLECTION 起動画面"
      accessibilityViewIsModal
      style={[styles.openingScreen, { opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.055] }) }] }]}
    >
      <Image source={ROOM_BACKGROUND} resizeMode="cover" style={styles.openingBackdrop} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={assetsReady ? '画面をタップしてスタート' : '読み込み中'}
        disabled={leaving || !assetsReady}
        onPress={startGame}
        style={styles.openingTapSurface}
      />
      <Animated.View pointerEvents="none" style={[styles.openingTitleWrap, { opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }] }]}>
        <ImageBackground source={MOBBY_TIME_TIMER_PLAQUE} resizeMode="contain" style={styles.openingTitlePlaque}>
          <Image source={MOBBY_LOGO_RAINBOW} resizeMode="contain" style={styles.openingLogoImage} />
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
                  left: decoration.left,
                  top: decoration.top + (compactOpeningGroup && index >= 6 ? -70 : 0),
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
  );
}

function BottomNav({ screen, onNavigate, onOpenIncident, hasUnresolvedIncident }: { screen: Screen; onNavigate: (screen: 'home' | 'collection' | 'time' | 'touch') => void; onOpenIncident: () => void; hasUnresolvedIncident: boolean }) {
  type NavTabId = 'home' | 'collection' | 'time' | 'incident';
  const tabs: { id: NavTabId; label: string; icon: number }[] = [
    { id: 'home', label: 'ホーム', icon: HOUSE },
    { id: 'collection', label: 'コレクション', icon: MOBBY_ICON },
    { id: 'time', label: 'MOBBY TIME', icon: SPARKLES },
    { id: 'incident', label: '事件', icon: require('../../assets/home-ui/icons/notice.png') },
  ];
  const handleTabPress = (tabId: NavTabId) => {
    if (tabId === 'incident') onOpenIncident();
    else onNavigate(tabId);
  };
  const selectedTabId: NavTabId | null = screen === 'casebook' ? 'incident' : screen === 'episode' || screen === 'touch' ? null : screen;
  return <View style={styles.bottomNav}>
    <Image source={UI_BOTTOM_STRIP} resizeMode="stretch" style={styles.bottomNavAsset} />
    <View pointerEvents="none" style={styles.bottomNavSlotLayer}>{tabs.map((tab) => <View key={`nav-slot-${tab.id}`} style={styles.bottomNavSlot} />)}</View>
    <View style={styles.bottomNavTabLayer}>{tabs.map((tab) => <Pressable key={tab.id} accessibilityRole="button" accessibilityLabel={tab.label} accessibilityState={{ selected: selectedTabId === tab.id }} onPress={() => handleTabPress(tab.id)} style={({ pressed }) => [styles.navTab, pressed && styles.navTabPressed]}><Image source={tab.icon} resizeMode="contain" style={[styles.navIcon, selectedTabId === tab.id && styles.navIconActive, tab.id === 'incident' && styles.navCaseIcon]} /><Text style={[styles.navLabel, selectedTabId === tab.id && styles.navLabelActive]}>{tab.label}</Text>{selectedTabId === tab.id ? <View style={styles.navDot} /> : null}{tab.id === 'incident' && hasUnresolvedIncident ? <View pointerEvents="none" style={styles.navIncidentBadge}><Text style={styles.navIncidentBadgeText}>!</Text></View> : null}</Pressable>)}</View>
  </View>;
}

export default function IndexScreen() {
  const daily = useDailyLoop();
  const safeAreaInsets = useSafeAreaInsets();
  const [fontsLoaded, fontError] = useFonts({
    MPLUSRounded1c_700Bold,
    MPLUSRounded1c_800ExtraBold,
    MochiyPopOne_400Regular,
  });
  const [viewportSize, setViewportSize] = useState({ width: DESIGN_WIDTH, height: DESIGN_MIN_HEIGHT });
  const [appStarted, setAppStarted] = useState(false);
  const [screen, setScreen] = useState<Screen>('home');
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
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [wallPlacement, setWallPlacement] = useState<CollectibleReward | null>(null);
  const [homeWallItemIds, setHomeWallItemIds] = useState(() => ITEMS.map((item) => item.id));
  const [homeWallVariants, setHomeWallVariants] = useState<Record<string, Exclude<CollectibleVariant, 'plush'>>>(() => Object.fromEntries(ITEMS.map((item) => [item.id, 'key-normal'])));
  const [homePlushItemIds, setHomePlushItemIds] = useState(() => ITEMS.map((item) => item.id));
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
  const persistedMobbyTimeReward = daily.state.mobbyTimeReward;
  const onboardingRewardActive = Boolean(
    !tutorialComplete && onboardingReward && ['mobbyTime', 'opening', 'place', 'wallFlight'].includes(onboardingStep),
  );
  const today = ITEMS.find((item) => item.id === (
    onboardingRewardActive ? onboardingReward?.itemId : persistedMobbyTimeReward?.itemId ?? todayId
  )) ?? ITEMS[0];
  const activeIncident = incidentStorage.activeEpisode;
  const pendingIncidentReward = incidentStorage.pendingResolution;
  const activeIncidentId = activeIncident?.runId ?? null;
  const incidentTargetItemId = activeIncident?.targetItemId ?? null;
  const incidentNotificationPending = activeIncident?.notification.pending ?? false;
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
  const appBaseIsolated = !appStarted || incidentExperienceActive;
  const bgmMode = incidentResolutionPhase === 'returning'
    ? 'silent' as const
    : hasUnresolvedIncident ? 'incident' as const : 'normal' as const;
  const { engageBgm, playSfx } = useMobbyAudio({ bgmEnabled: appStarted && soundEnabled, sfxEnabled: soundEnabled, bgmMode });
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const navigateTo = useCallback((nextScreen: Screen, cue: 'transition' | 'tab' | 'silent' = 'transition') => {
    if (nextScreen === screenRef.current) return;
    if (cue !== 'silent') playSfx(cue);
    screenRef.current = nextScreen;
    setScreen(nextScreen);
  }, [playSfx]);
  const haptics = useMobbyHaptics(soundEnabled);
  const tutorialRewardActive = onboardingRewardActive;
  const effectiveTodayVariant: CollectibleVariant = onboardingRewardActive
    ? 'key-normal'
    : persistedMobbyTimeReward?.variant ?? todayVariant;
  const effectiveMobbyTimeStage: MobbyTimeStage = onboardingRewardActive
    ? onboardingReward?.phase ?? 'arrived'
    : persistedMobbyTimeReward?.phase ?? mobbyTimeStage;
  const viewportWidth = Math.max(1, viewportSize.width - safeAreaInsets.left - safeAreaInsets.right);
  const viewportHeight = Math.max(1, viewportSize.height - safeAreaInsets.top - safeAreaInsets.bottom);
  const appScale = Math.max(0.01, Math.min(1, viewportWidth / DESIGN_WIDTH, viewportHeight / DESIGN_MIN_HEIGHT));
  const appHeight = Math.max(DESIGN_MIN_HEIGHT, viewportHeight / appScale);
  const appViewportWidth = DESIGN_WIDTH * appScale;
  const layoutMetrics = useMemo(() => ({ width: DESIGN_WIDTH, height: appHeight, scale: appScale }), [appHeight, appScale]);

  ownedRef.current = owned;
  onboardingRewardRef.current = onboardingReward;

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
    AsyncStorage.multiGet([STORAGE_TUTORIAL_COMPLETE, STORAGE_FAVORITE, STORAGE_OWNED, STORAGE_OWNED_LEGACY, STORAGE_ONBOARDING_REWARD, STORAGE_CASES])
      .then((entries) => {
        if (!mounted) return;
        const values = Object.fromEntries(entries);
        const completed = values[STORAGE_TUTORIAL_COMPLETE] === 'true';
        const favoriteValue = values[STORAGE_FAVORITE] ?? ITEMS[0].id;
        const storedFavorite = ITEMS.some((item) => item.id === favoriteValue) ? favoriteValue : ITEMS[0].id;
        let storedOwned = completed ? INITIAL_OWNED : EMPTY_OWNED;
        const storedInventory = values[STORAGE_OWNED] ?? values[STORAGE_OWNED_LEGACY];
        if (storedInventory) {
          try {
            const parsed = JSON.parse(storedInventory) as Record<string, unknown>;
            storedOwned = normalizeOwnedInventory(parsed);
          } catch {
            storedOwned = completed ? INITIAL_OWNED : EMPTY_OWNED;
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
        setHomeWallVariants(Object.fromEntries(ITEMS.map((item) => [item.id, ownedCollectibleCount(storedOwned, item.id, 'key-small') > 0 && ownedCollectibleCount(storedOwned, item.id, 'key-normal') === 0 ? 'key-small' : 'key-normal'])));
      })
      .catch(() => {
        if (!mounted) return;
        setOwned(EMPTY_OWNED);
      })
      .finally(() => { if (mounted) setStorageReady(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    const entries: [string, string][] = [[STORAGE_CASES, JSON.stringify(incidentStorage)]];
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
  }, [incidentStorage, owned, selectedId, storageReady, tutorialComplete]);

  const enqueueStorageWrite = useCallback(async (operation: () => Promise<void>) => {
    const write = storageWriteChainRef.current
      .catch(() => undefined)
      .then(operation);
    storageWriteChainRef.current = write.catch(() => undefined);
    await write;
  }, []);

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
      if (mobbyTimeReward && !mobbyTimeReward.inventoryGranted) {
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
  const finalizePlacement = useCallback((item: Item, variant: CollectibleVariant) => {
    setMobbyTimeStage('placed');
    setSelectedId(item.id);
    const placement = variant === 'plush' ? '棚' : '壁';
    if (variant === 'plush') {
      setHomePlushItemIds((current) => [item.id, ...current.filter((id) => id !== item.id)]);
    } else {
      setHomeWallVariants((current) => ({ ...current, [item.id]: variant }));
    }
    setNotice(`NEW! ${collectibleName(item, variant)}を${placement}に追加しました`);
    if (['place', 'opening', 'mobbyTime', 'wallFlight'].includes(onboardingStep)) {
      navigateTo('home');
      setOnboardingStep('home');
    }
  }, [navigateTo, onboardingStep]);
  const placeToday = useCallback(() => {
    const rewardKey = collectibleInventoryKey(today.id, effectiveTodayVariant);
    if (placementHandledIdRef.current === rewardKey) return;
    placementHandledIdRef.current = rewardKey;
    setSelectedId(today.id);
    if (effectiveTodayVariant !== 'plush') {
      setNotice('');
      setWallPlacement({ item: today, variant: effectiveTodayVariant });
      navigateTo('home');
      if (onboardingStep === 'place') setOnboardingStep('wallFlight');
      return;
    }
    playSfx('place');
    finalizePlacement(today, effectiveTodayVariant);
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
  const completeWallPlacement = useCallback(async () => {
    if (!wallPlacement) return;
    try {
      if (onboardingRewardActive) {
        if (!await persistOnboardingRewardPhase('placed')) return;
      } else if (persistedMobbyTimeReward) {
        await daily.completeMobbyTimeReward(persistedMobbyTimeReward.eventId);
      }
    } catch {
      return;
    }
    playSfx('place');
    finalizePlacement(wallPlacement.item, wallPlacement.variant);
    setWallPlacement(null);
  }, [daily, finalizePlacement, onboardingRewardActive, persistedMobbyTimeReward, persistOnboardingRewardPhase, playSfx, wallPlacement]);
  const swapHomeWallItems = useCallback((fromId: string, toId: string) => {
    setHomeWallItemIds((current) => {
      const next = [...current];
      const fromIndex = next.indexOf(fromId);
      const toIndex = next.indexOf(toId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current;
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return next;
    });
  }, []);
  const swapHomePlushItems = useCallback((fromId: string, toId: string) => {
    setHomePlushItemIds((current) => {
      const next = [...current];
      const fromIndex = next.indexOf(fromId);
      const toIndex = next.indexOf(toId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current;
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return next;
    });
  }, []);

  const visibleHomeWallItemIds = useMemo(() => {
    // Keep every wall slot in the layout. HomeWallKeychain renders only the
    // wooden hook for items the user does not own, so empty positions stay
    // anchored to their intended locations without showing placeholder art.
    return homeWallItemIds;
  }, [homeWallItemIds]);
  const visibleHomePlushItemIds = useMemo(
    () => homePlushItemIds.filter((id) => ownedCollectibleCount(owned, id, 'plush') > 0).slice(0, 4),
    [homePlushItemIds, owned],
  );
  const incidentWallState: 'none' | 'stolen' | 'returning' = incidentResolutionPhase === 'returning'
    ? 'returning'
    : hasUnresolvedIncident ? 'stolen' : 'none';

  const episodeOne = getEpisode(FEATURED_EPISODE_ID);
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
    const relationship = episode.credits.find((credit) => credit.startsWith('関係：'))?.replace('関係：', '') ?? (episode.id === FEATURED_EPISODE_ID ? relationshipLabel : '因縁の相手');
    return [{ episodeId: episode.id, chapter: episode.chapter, title: episode.title, synopsis: episode.synopsis, enemyName: enemy.name, targetName: getMobby(episode.featuredMobbyId).name, keyVisual: require('../../assets/incidents/midnight-mansion-corridor-v2.png'), memorableLine: entry?.memorableLine ?? '未再生', relationship, endingLabel, unseenEndingLabel: unseen, playCount: entry?.playCount ?? 0, unlocked }];
  }), [incidentStorage.archive.episodes]);
  const casebookRelationships = useMemo<readonly IncidentCasebookRelationshipEntry[]>(() => incidentStorage.archive.relationships.map((entry) => ({ id: `${entry.enemyId}:${entry.mobbyId}`, enemyName: getEnemy(entry.enemyId).name, mobbyName: getMobby(entry.mobbyId).name, label: entry.label, image: getEnemy(entry.enemyId).image })), [incidentStorage.archive.relationships]);
  const resolutionEpisode = pendingIncidentReward ? getEpisode(pendingIncidentReward.episodeId) : undefined;
  const resolutionEnemy = resolutionEpisode ? getEnemy(resolutionEpisode.enemyId) : null;
  const resolutionEndingLabel = resolutionEpisode?.scenes.flatMap((scene) => scene.interaction?.kind === 'choice' ? scene.interaction.options : []).find((option) => option.id === pendingIncidentReward?.endingId)?.label ?? pendingIncidentReward?.endingId ?? '';
  const resolutionRelationshipLabel = pendingIncidentReward ? incidentStorage.archive.relationships.find((entry) => entry.enemyId === pendingIncidentReward.enemyId && entry.mobbyId === pendingIncidentReward.targetMobbyId)?.label ?? '因縁の相手' : '';

  const openMobbyTimeNotification = useCallback(() => {
    playSfx('tap');
    placementHandledIdRef.current = null;
    const next = ITEMS[Math.floor(Math.random() * ITEMS.length)];
    setTodayId(next.id);
    setTodayVariant(COLLECTIBLE_VARIANTS[Math.floor(Math.random() * COLLECTIBLE_VARIANTS.length)]);
    setSecondsLeft(1800);
    setMobbyTimeStage('arrived');
    navigateTo('time');
    setNotice('MOBBY TIME！中身は開けるまでのお楽しみ');
    setNotificationOpen(false);
  }, [navigateTo, playSfx]);

  const startEpisodeById = useCallback((episodeId: EpisodeId, mode: 'automatic' | 'demo' | 'direct' = 'direct') => {
    const episode = getEpisode(episodeId);
    if (incidentResolutionPhase !== 'none' || !tutorialComplete || !episode) return;
    const episodeIndex = EPISODES.findIndex((candidate) => candidate.id === episode.id);
    const unlocked = episodeIndex === 0 || incidentStorage.archive.episodes.some((entry) => entry.episodeId === EPISODES[episodeIndex - 1]?.id);
    if (!unlocked) return;
    const target = ITEMS.find((item) => ITEM_MOBBY_IDS[item.id] === episode.featuredMobbyId);
    if (!target) return;
    const runId = `${episode.id}:${target.id}:${Date.now()}`;
    const nextActive = { runId, episodeId: episode.id, targetItemId: target.id, targetMobbyId: episode.featuredMobbyId, enemyId: episode.enemyId, notification: { pending: mode === 'demo', cutInSeen: mode === 'direct' }, playback: createInitialPlaybackState(episode) };
    setIncidentStorage((current) => current.pendingResolution ? current : current.activeEpisode ? { ...current, activeEpisode: nextActive } : startEpisode(current, nextActive));
    setIncidentCutInVisible(false);
    if (mode === 'direct') {
      setNotificationOpen(false); navigateTo('episode');
    } else if (mode === 'demo') {
      setNotificationOpen(true); navigateTo('home'); setNotice(`事件通知：${getEnemy(episode.enemyId).name}が、${getMobby(episode.featuredMobbyId).name}を連れ去った！`);
    } else {
      setNotificationOpen(false); navigateTo('home'); setTimeout(() => setIncidentCutInVisible(true), 80); setNotice(`${getEnemy(episode.enemyId).name}が、${getMobby(episode.featuredMobbyId).name}を連れ去った！`);
    }
    playSfx('incidentSting');
  }, [incidentResolutionPhase, incidentStorage.archive.episodes, navigateTo, playSfx, tutorialComplete]);

  const triggerIncident = useCallback((mode: 'automatic' | 'demo' | 'direct' = 'automatic') => startEpisodeById(FEATURED_EPISODE_ID, mode), [startEpisodeById]);

  const openIncident = useCallback(() => {
    playSfx('tap');
    setNotificationOpen(false);
    setIncidentCutInVisible(false);
    setCasebookInitialTab('active');
    navigateTo('casebook');
  }, [navigateTo, playSfx]);

  const openIncidentNotification = useCallback(() => {
    if (activeIncident) {
      playSfx('tap');
      setNotificationOpen(false);
      setIncidentStorage((current) => acknowledgeEpisode(current, activeIncident.runId));
      navigateTo('home'); setIncidentCutInVisible(false); setTimeout(() => setIncidentCutInVisible(true), 80);
      return;
    }
    playSfx('tap');
    setNotificationOpen(false);
    triggerIncident('automatic');
  }, [activeIncident, navigateTo, playSfx, triggerIncident]);

  const resumeIncident = useCallback(() => {
    if (!activeIncident) return;
    playSfx('tap');
    setNotificationOpen(false);
    setIncidentStorage((current) => acknowledgeEpisode(current, activeIncident.runId, true));
    setIncidentCutInVisible(false); navigateTo('episode');
  }, [activeIncident, navigateTo, playSfx]);

  const restartIncident = useCallback(() => {
    if (!episodeOne) return;
    if (!activeIncident) { triggerIncident('direct'); return; }
    playSfx('tap');
    setIncidentStorage((current) => current.activeEpisode?.runId === activeIncident.runId ? { ...current, activeEpisode: { ...current.activeEpisode, playback: createInitialPlaybackState(episodeOne), notification: { pending: false, cutInSeen: true } } } : current);
    setIncidentCutInVisible(false); navigateTo('episode');
  }, [activeIncident, episodeOne, navigateTo, playSfx, triggerIncident]);

  const dismissIncidentCutIn = useCallback(() => {
    playSfx('tap');
    setIncidentCutInVisible(false);
    if (activeIncident) setIncidentStorage((current) => acknowledgeEpisode(current, activeIncident.runId, true));
    navigateTo('home');
    setNotice('第1話を事件タブに保存しました');
  }, [activeIncident, navigateTo, playSfx]);

  const startIncidentInvestigation = useCallback(() => {
    playSfx('tap');
    setIncidentCutInVisible(false);
    setNotificationOpen(false);
    if (!activeIncident) return;
    setIncidentStorage((current) => acknowledgeEpisode(current, activeIncident.runId, true));
    navigateTo('episode');
  }, [activeIncident, navigateTo, playSfx]);

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

  const flushEpisodeProgress = useCallback(() => {
    if (episodeProgressTimerRef.current) clearTimeout(episodeProgressTimerRef.current);
    episodeProgressTimerRef.current = null;
    const pending = pendingEpisodeProgressRef.current;
    pendingEpisodeProgressRef.current = null;
    if (pending) setIncidentStorage((current) => saveEpisodePlayback(current, pending.runId, pending.playback));
  }, []);

  const handleEpisodeProgress = useCallback((playback: PlaybackState) => {
    if (!activeIncident || playback.episodeId !== activeIncident.episodeId) return;
    const choiceChanged = Object.keys(playback.choices).length > Object.keys(activeIncident.playback.choices).length;
    pendingEpisodeProgressRef.current = { runId: activeIncident.runId, playback };
    if (choiceChanged) { flushEpisodeProgress(); return; }
    if (episodeProgressTimerRef.current) clearTimeout(episodeProgressTimerRef.current);
    episodeProgressTimerRef.current = setTimeout(flushEpisodeProgress, EPISODE_PROGRESS_DEBOUNCE_MS);
  }, [activeIncident, flushEpisodeProgress]);

  const handleEpisodeInterrupt = useCallback((playback: PlaybackState) => {
    if (!activeIncident) return;
    if (episodeProgressTimerRef.current) clearTimeout(episodeProgressTimerRef.current);
    pendingEpisodeProgressRef.current = null;
    setIncidentStorage((current) => saveEpisodePlayback(current, activeIncident.runId, playback));
    setCasebookInitialTab('active'); navigateTo('casebook');
  }, [activeIncident, navigateTo]);

  const handleEpisodeComplete = useCallback((result: { completedAt: string; finalState: PlaybackState }) => {
    if (!activeIncident || completedEpisodeRunIdsRef.current.has(activeIncident.runId)) return;
    completedEpisodeRunIdsRef.current.add(activeIncident.runId);
    if (episodeProgressTimerRef.current) clearTimeout(episodeProgressTimerRef.current);
    pendingEpisodeProgressRef.current = null;
    setIncidentStorage((current) => completeEpisode(current, activeIncident.runId, result.finalState, Date.parse(result.completedAt) || Date.now()));
    playSfx('caseSolved'); haptics.success(); navigateTo('home'); setNotice('エピソード完走！ モビーが帰ってきます');
  }, [activeIncident, haptics, navigateTo, playSfx]);

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

  const openNotificationScreen = useCallback((nextScreen: Screen) => {
    playSfx('tap');
    navigateTo(nextScreen);
    setNotificationOpen(false);
  }, [navigateTo, playSfx]);

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
    setNotice('事件解決！ モビーが壁に戻りました');
  }, [pendingIncidentReward, playSfx]);

  const openResolutionCasebook = useCallback(() => {
    if (!pendingIncidentReward || pendingIncidentReward.step !== 'aftermath') return;
    playSfx('tap');
    setCasebookInitialTab('relationships');
    setIncidentStorage((current) => dismissEpisodeResolution(current, pendingIncidentReward.runId));
    navigateTo('casebook');
  }, [navigateTo, pendingIncidentReward, playSfx]);

  const playEpisodeFromCasebook = useCallback((episodeId: string) => startEpisodeById(episodeId as EpisodeId, 'direct'), [startEpisodeById]);

  const handleTransitioningChange = useCallback((_transitioning: boolean) => undefined, []);

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

  const startApp = useCallback(() => {
    setAppStarted(true);
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
  }, [navigateTo, onboardingReward, tutorialComplete]);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outer}>
        <View style={[styles.appViewport, { width: appViewportWidth, height: viewportHeight }]}>
          <AppLayoutContext.Provider value={layoutMetrics}>
            <View style={[styles.appShell, { height: appHeight, transform: [{ scale: appScale }] }]}>
              <View
                style={styles.appBaseLayer}
                pointerEvents={appBaseIsolated ? 'none' : 'auto'}
                accessibilityElementsHidden={appBaseIsolated}
                importantForAccessibility={appBaseIsolated ? 'no-hide-descendants' : 'auto'}
              >
              {screen === 'collection' ? <>
                <Image source={ROOM_BACKGROUND} resizeMode="cover" style={styles.appShellBackground} />
                <Image source={COLLECTION_WALL_BACKGROUND} resizeMode="cover" style={styles.collectionReferenceBackground} />
              </> : <Image source={screen === 'home' ? HOME_WALL_BACKGROUND : ROOM_BACKGROUND} resizeMode="cover" style={styles.appShellBackground} />}
              {incidentExperienceActive ? <View pointerEvents="none" style={styles.globalHeaderPlaceholder} /> : <Header
                soundEnabled={soundEnabled}
                onToggleSound={toggleSound}
                onInvestigation={openIncident}
                hasUnresolvedIncident={hasUnresolvedIncident}
                onBell={() => {
                  playSfx('notification');
                  setNotificationOpen(true);
                }}
              />}
              {notice && !tutorialRewardActive ? <Pressable accessibilityRole="button" accessibilityLabel={`${notice}。閉じる`} accessibilityLiveRegion="polite" onPress={() => { playSfx('tap'); setNotice(''); }} style={styles.noticeToast}><Text style={styles.noticeToastText}>{notice}</Text><Text style={styles.noticeToastClose}>×</Text></Pressable> : null}
              {notificationOpen ? (
                <NotificationPopup
                  onClose={() => { playSfx('tap'); setNotificationOpen(false); }}
                  onOpenMobbyTime={openMobbyTimeNotification}
                  onOpenCollection={() => openNotificationScreen('collection')}
                  onOpenInvestigation={openIncidentNotification}
                  hasUnresolvedIncident={hasUnresolvedIncident}
                  incidentNotificationPending={incidentNotificationPending}
                  incidentTitle={activeEpisodeData ? `${getEnemy(activeEpisodeData.enemyId).name}が、${getMobby(activeEpisodeData.featuredMobbyId).name}を連れ去った！` : undefined}
                />
              ) : null}
              <View style={styles.screenBody}>
                <ScreenTransition screenKey={screen} loadingImage={selected.image} reduceMotion={reduceMotion} onTransitioningChange={handleTransitioningChange}>
                {screen === 'home' ? <HomeScreen selected={selected} owned={owned} onSelect={selectHomeMobby} incidentWallItemId={incidentTargetItemId ?? resolutionTargetItemId ?? undefined} incidentWallState={incidentWallState} placementHiddenWallItemId={wallPlacement?.item.id} onIncidentPress={openIncident} wallItemIds={visibleHomeWallItemIds} wallVariants={homeWallVariants} plushItemIds={visibleHomePlushItemIds} onSwapWallItems={swapHomeWallItems} onSwapPlushItems={swapHomePlushItems} onUiTap={() => playSfx('tap')} onInteract={interact} onKeychainSwing={playKeychainJingle} reaction={reaction} onOpenMobbyTime={() => navigateTo('time')} /> : null}
                {screen === 'collection' ? <CollectionScreen items={ITEMS} owned={owned} selectedId={selectedId} onSelect={selectItem} onKeychainSwing={playKeychainJingle} /> : null}
                {screen === 'time' ? <MobbyTimeScreen flow={onboardingRewardActive ? 'onboarding' : 'daily'} today={today} todayVariant={effectiveTodayVariant} stage={effectiveMobbyTimeStage} reduceMotion={reduceMotion} onOpen={handleRewardOpen} onReveal={handleRewardReveal} onPlace={handleRewardPlace} onPlaced={handleRewardPlaced} secondsLeft={secondsLeft} /> : null}
                {screen === 'touch' ? <TouchScreen selected={selected} onInteract={interact} reaction={reaction} /> : null}
                {screen === 'casebook' ? <IncidentCasebookScreen activeEpisode={casebookActiveCase} episodes={casebookEpisodes} relationships={casebookRelationships} initialTab={casebookInitialTab} onResume={resumeIncident} onRestart={restartIncident} onStart={() => triggerIncident('direct')} onPlayEpisode={playEpisodeFromCasebook} onClose={() => navigateTo('home')} /> : null}
                </ScreenTransition>
              </View>
              {!['favorite', 'mobbyTime', 'opening', 'place', 'wallFlight'].includes(onboardingStep) && !incidentExperienceActive ? <BottomNav screen={screen} hasUnresolvedIncident={hasUnresolvedIncident} onOpenIncident={() => { playSfx('tab'); openIncident(); }} onNavigate={(nextScreen) => navigateTo(nextScreen, 'tab')} /> : null}
              {wallPlacement && wallPlacement.variant !== 'plush' ? <WallPlacementFlight item={wallPlacement.item} variant={wallPlacement.variant} onComplete={completeWallPlacement} /> : null}
              {onboardingStep !== 'none' && onboardingStep !== 'favorite' ? <OnboardingGuide step={onboardingStep} onNext={advanceOnboarding} onSkip={finishOnboarding} /> : null}
              {onboardingStep === 'favorite' ? <FavoriteMobbyPicker selectedId={favoriteDraftId} onSelect={(id) => { playSfx('tap'); setFavoriteDraftId(id); }} onConfirm={confirmFavorite} /> : null}
              </View>
              {!appStarted ? <OpeningScreen onBegin={() => { engageBgm(); playSfx('reward'); }} onStart={startApp} /> : null}
              {!storageReady || (!fontsLoaded && !fontError) ? <LoadingOverlay /> : null}
              {incidentEpisodeActive && activeIncident && activeEpisodeData ? <View style={styles.incidentScreenLayer} accessibilityViewIsModal><EpisodeScreen episode={activeEpisodeData} initialState={activeIncident.playback} reduceMotion={reduceMotion} onCue={handleEpisodeCue} onProgress={handleEpisodeProgress} onInterrupt={handleEpisodeInterrupt} onComplete={handleEpisodeComplete} /></View> : null}
              {incidentCutInActive && activeEpisodeEnemy && activeEpisodeData && cutInTargetItem ? <IncidentCutIn enemyName={activeEpisodeEnemy.name} enemyImage={activeEpisodeEnemy.image} targetName={getMobby(activeEpisodeData.featuredMobbyId).name} targetImage={cutInTargetItem.image} onPlay={startIncidentInvestigation} onLater={dismissIncidentCutIn} /> : null}
              {incidentResolutionActive && pendingIncidentReward && resolutionEpisode && resolutionEnemy && resolutionTargetItem ? <IncidentResolutionOverlay phase={incidentResolutionPhase === 'returning' ? 'returning' : 'aftermath'} targetName={getMobby(resolutionEpisode.featuredMobbyId).name} targetImage={resolutionTargetItem.image} enemyName={resolutionEnemy.name} endingLabel={resolutionEndingLabel} relationshipLabel={resolutionRelationshipLabel} onReturnComplete={completeIncidentReturn} onDismiss={dismissResolution} onOpenCasebook={openResolutionCasebook} /> : null}
            </View>
          </AppLayoutContext.Provider>
        </View>
      </View>
    </SafeAreaView>
  );
}
