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
  ScrollView,
  StyleSheet,
  Text as NativeText,
  View,
  type LayoutChangeEvent,
  type TextProps,
} from 'react-native';

import { MobbyPullMesh, type MobbyPullMeshHandle } from '@/components/MobbyPullMesh';
import { MobbyCarousel } from '@/components/MobbyCarousel';
import { ParticleBurst } from '@/components/effects';
import { MobbyIdleMotion } from '@/components/mobby';
import { getMobby, type MobbyId } from '@/data/mobies';
import { REACTION_MILESTONES, type ReactionMilestone } from '@/data/dailyRewards';
import type { DailyLoopState } from '@/game/dailyLoopStorage';
import {
  ENEMIES_IN_REVEAL_ORDER,
  getEnemyPublicDescriptor,
  isPlayableEnemyCase,
  type EnemyCase,
  type EnemyCaseId,
} from '@/data/enemyCases';
import { getIncidentComic } from '@/data/incidentComics';
import { PULL_ASSETS, type MobbyPullAsset, type PullFrame } from '@/data/mobbyPullAssets';
import { useMobbyAudio } from '@/hooks/useMobbyAudio';
import { useMobbyHaptics } from '@/hooks/useMobbyHaptics';
import { IncidentCutIn } from '@/components/IncidentCutIn';
import { IncidentResolutionOverlay } from '@/components/IncidentResolutionOverlay';
import {
  IncidentCasebookScreen,
  type IncidentCasebookActiveCase,
  type IncidentCasebookComicEntry,
  type IncidentCasebookEnemyEntry,
  type IncidentCasebookTab,
} from '@/components/IncidentCasebookScreen';
import { styles } from '@/ui/layout/appStyles';

type Screen = 'home' | 'collection' | 'time' | 'touch' | 'casebook';
type ItemKind = 'ぬいキー' | 'ぬいぐるみ';
type CollectibleVariant = 'key-normal' | 'key-small' | 'plush';
type KeychainImageSize = 'normal' | 'small';
type CollectibleReward = { item: Item; variant: CollectibleVariant };
type MobbyTimeStage = 'arrived' | 'opening' | 'revealed' | 'placing' | 'placed';
type DailyMobbyTimeStatus = 'available' | 'carryover' | 'opened' | 'expired' | 'unavailable';
type HomePlacementKind = 'wall' | 'shelf';
type OnboardingStep = 'none' | 'favorite' | 'mobbyTime' | 'opening' | 'place' | 'wallFlight' | 'home' | 'collection' | 'time';

function ReadableDailyStampCard({ stampCount, cycle }: { stampCount: number; cycle: number }) {
  const completed = Math.max(0, Math.min(7, stampCount));
  return (
    <View style={styles.dailyStampCard} accessible accessibilityRole="summary" accessibilityLabel={`7日ログインスタンプ、サイクル${cycle}、${completed}個獲得済み`}>
      <View style={styles.dailyReadableHeading}><Text accessibilityRole="header" style={styles.dailyReadableTitle}>7日スタンプ</Text><Text style={styles.dailyReadableCaption}>CYCLE {cycle}</Text></View>
      <View style={styles.dailyStampRow}>{Array.from({ length: 7 }, (_, index) => {
        const done = index < completed;
        return <View key={index} style={styles.dailyStampCell} accessible accessibilityRole="checkbox" accessibilityLabel={`${index + 1}日目`} accessibilityState={{ checked: done }}><View style={[styles.dailyStampCircle, done && styles.dailyStampCircleDone]}><Text style={[styles.dailyStampDay, done && styles.dailyStampDayDone]}>{done ? '✓' : index + 1}</Text></View><Text numberOfLines={1} style={styles.dailyReadableCaption}>{index === 6 ? 'TIME' : '1'}</Text></View>;
      })}</View>
    </View>
  );
}

function ReadableDailyMissionPanel({ missions }: { missions: DailyLoopState['missions'] }) {
  const rows = [
    { done: missions.pullReleases >= 3, title: 'ちょっかいを3回離す', progress: `${Math.min(3, missions.pullReleases)} / 3` },
    { done: missions.mobbyTimeOpened, title: 'MOBBY TIMEを開く', progress: '未達成' },
  ];
  const allDone = rows.every((row) => row.done);
  return (
    <View style={styles.dailyMissionPanel} accessible accessibilityRole="summary" accessibilityLabel={`きょうのミッション、${rows.filter((row) => row.done).length} / 2達成`}>
      <View style={styles.dailyReadableHeading}><Text accessibilityRole="header" style={styles.dailyReadableTitle}>きょうのミッション</Text><Text style={styles.dailyReadableCaption}>2 MISSIONS</Text></View>
      {rows.map((row) => <View key={row.title} style={styles.dailyMissionRow} accessible accessibilityRole="checkbox" accessibilityLabel={`${row.title}、${row.done ? '達成' : row.progress}`} accessibilityState={{ checked: row.done }}><View style={[styles.dailyMissionCheck, row.done && styles.dailyMissionCheckDone]}><Text style={styles.dailyMissionCheckText}>{row.done ? '✓' : ''}</Text></View><View style={styles.dailyMissionCopy}><Text style={styles.dailyMissionLabel}>{row.title}</Text><Text style={styles.dailyMissionCaption}>{row.done ? '達成！' : row.progress}</Text></View></View>)}
      <View style={[styles.dailyMissionBonus, allDone && styles.dailyMissionBonusDone]}><Text style={[styles.dailyMissionBonusText, allDone && styles.dailyMissionBonusTextDone]}>{allDone ? 'コンプリートボーナス達成' : '2つ達成でボーナス'}</Text></View>
    </View>
  );
}
type IncidentResolutionPhase = 'none' | 'returning' | 'resolved';

const DESIGN_WIDTH = 440;
const DESIGN_MIN_HEIGHT = 720;
const BOTTOM_NAV_CELLS = [
  { left: 19, width: 72 },
  { left: 116, width: 72 },
  { left: 214, width: 72 },
  { left: 313, width: 72 },
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
const STORAGE_CASES = '@mobby/case-files-v2';
const STORAGE_DAILY_BONUS_CELEBRATIONS = '@mobby/daily-bonus-celebrations-v1';
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
    return normalized;
  }
  ITEMS.forEach((item) => {
    normalized[collectibleInventoryKey(item.id, legacyVariantForItem(item))] = Math.max(0, Number(raw[item.id]) || 0);
  });
  return normalized;
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
}: {
  onClose: () => void;
  onOpenMobbyTime: () => void;
  onOpenCollection: () => void;
  onOpenInvestigation: () => void;
  hasUnresolvedIncident: boolean;
  incidentNotificationPending: boolean;
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
            <Text style={styles.notificationItemTitle}>{incidentNotificationPending ? 'モビーの部屋に異変を検知' : hasUnresolvedIncident ? 'モビーの部屋に異変が…' : '次の事件を待っています'}</Text>
            <Text style={styles.notificationItemBody}>{incidentNotificationPending ? 'タップして事件通知を確認してください' : hasUnresolvedIncident ? '証拠を集めて、犯人を推理しよう' : '事件ボタンからデモ通知を受け取れます'}</Text>
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

function HomeWallKeychain({
  item,
  variant,
  index,
  selectedId,
  ownedCount,
  incidentState,
  isEditing,
  isEditSelected,
  isEditTarget,
  onPress,
  onSwing,
  gestureManaged = false,
  onSwingReady,
  onLayout,
}: {
  item: Item;
  variant: Exclude<CollectibleVariant, 'plush'>;
  index: number;
  selectedId: string;
  ownedCount: number;
  incidentState: 'normal' | 'stolen' | 'returning' | 'placement-hidden';
  isEditing: boolean;
  isEditSelected: boolean;
  isEditTarget: boolean;
  onPress: () => void;
  onSwing: () => void;
  gestureManaged?: boolean;
  onSwingReady?: (id: string, swing: KeychainSwing | null) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const isOwned = ownedCount > 0;
  const rotation = useRef(new Animated.Value(0)).current;
  const alarmPulse = useRef(new Animated.Value(0)).current;
  const isStolen = incidentState === 'stolen';
  const isReturning = incidentState === 'returning';
  const interactionsDisabled = isStolen || isReturning;
  useEffect(() => {
    if (!isStolen) {
      alarmPulse.stopAnimation();
      alarmPulse.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(alarmPulse, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.timing(alarmPulse, { toValue: 0, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [alarmPulse, isStolen]);
  const settle = useCallback((direction: number) => {
    Animated.sequence([
      Animated.timing(rotation, { toValue: -direction * 0.72, duration: 125, useNativeDriver: true }),
      Animated.timing(rotation, { toValue: direction * 0.5, duration: 105, useNativeDriver: true }),
      Animated.timing(rotation, { toValue: -direction * 0.28, duration: 95, useNativeDriver: true }),
      Animated.spring(rotation, { toValue: 0, speed: 17, bounciness: 5, useNativeDriver: true }),
    ]).start();
  }, [rotation]);
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => isOwned && !isEditing && !interactionsDisabled && (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 5),
    onMoveShouldSetPanResponderCapture: (_event, gesture) => isOwned && !isEditing && !interactionsDisabled && (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 5),
    onPanResponderGrant: () => {
      rotation.stopAnimation();
      onSwing();
    },
    onPanResponderMove: (_event, gesture) => rotation.setValue(Math.max(-1, Math.min(1, gesture.dx / 42))),
    onPanResponderRelease: (_event, gesture) => settle(gesture.dx < 0 ? -1 : 1),
    onPanResponderTerminate: (_event, gesture) => settle(gesture.dx < 0 ? -1 : 1),
  }), [interactionsDisabled, isEditing, isOwned, onSwing, rotation, settle]);
  const swing = useCallback((direction: number) => {
    onSwing();
    settle(direction);
  }, [onSwing, settle]);
  useEffect(() => {
    if (!onSwingReady) return undefined;
    if (!isOwned || interactionsDisabled) {
      onSwingReady(item.id, null);
      return undefined;
    }
    onSwingReady(item.id, swing);
    return () => onSwingReady(item.id, null);
  }, [interactionsDisabled, isOwned, item.id, onSwingReady, swing]);
  const sway = rotation.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-20deg', '0deg', '20deg'] });
  const name = item.name.replace(' ぬいキー', '').replace(' ぬい', '');
  const localPanHandlers = !gestureManaged && !isEditing && isOwned && !interactionsDisabled ? panResponder.panHandlers : {};
  const canPress = isStolen || isOwned || isEditing;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isStolen ? `${name}が連れ去られた。タップして追跡` : isEditing ? `${name}、壁フック${index + 1}` : isOwned ? `${name}を揺らす` : `未所持の壁フック${index + 1}`}
      accessibilityHint={isStolen ? '未解決事件の捜査を再開します' : undefined}
      onPress={() => {
        if (!canPress) return;
        onPress();
        if (!isEditing && isOwned && !interactionsDisabled) {
          rotation.stopAnimation();
          settle(1);
          onSwing();
        }
      }}
      style={({ pressed }) => [
        styles.homeWallKey,
        !isEditing && isOwned && item.id === selectedId && styles.homeWallKeySelected,
        isEditing && styles.homeDecorationEditable,
        isEditTarget && styles.homeDecorationTarget,
        isEditSelected && styles.homeDecorationEditSelected,
        incidentState === 'placement-hidden' && styles.homeWallKeyHidden,
        isStolen && styles.homeWallKeyStolen,
        isReturning && styles.homeWallKeyReturning,
        pressed && styles.homeSelectablePressed,
      ]}
      onLayout={onLayout}
    >
      <Image source={WOODEN_HOOK} resizeMode="contain" style={styles.homeWallHook} />
      {isStolen ? (
        <Animated.View pointerEvents="none" style={[styles.homeWallStolenMarker, {
          borderColor: alarmPulse.interpolate({ inputRange: [0, 1], outputRange: ['rgba(190,42,58,0.55)', '#FF4358'] }),
          backgroundColor: alarmPulse.interpolate({ inputRange: [0, 1], outputRange: ['rgba(80,17,31,0.18)', 'rgba(137,22,42,0.34)'] }),
          transform: [{ scale: alarmPulse.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.035] }) }],
        }] }>
          <Image source={collectibleImage(item, variant)} resizeMode="contain" style={[styles.homeWallStolenGhost, variant === 'key-small' && styles.homeWallStolenGhostSmall]} />
          <View style={styles.homeWallBrokenCord}><View style={styles.homeWallBrokenCordLeft} /><View style={styles.homeWallBrokenCordRight} /></View>
          <View style={styles.homeWallCaseTag}><Text style={styles.homeWallCaseTagText}>CASE 04</Text></View>
          <View style={styles.homeWallStolenBand}><Text style={styles.homeWallStolenBandText}>連れ去られた</Text></View>
          <Text numberOfLines={1} style={styles.homeWallStolenName}>{name}</Text>
          <Text style={styles.homeWallResume}>タップして追跡</Text>
        </Animated.View>
      ) : isOwned ? (
        <Animated.View {...localPanHandlers} style={[styles.homeWallKeySwing, { transform: [{ rotate: sway }] }]}>
          <Image source={collectibleImage(item, variant)} resizeMode="contain" style={[styles.homeWallKeyImage, variant === 'key-small' && styles.homeWallSmallKeyImage, isReturning && styles.homeWallReturningImage]} />
        </Animated.View>
      ) : null}
      {isEditing ? <View style={styles.homeSlotBadge}><Text style={styles.homeSlotBadgeText}>{index + 1}</Text></View> : null}
    </Pressable>
  );
}

function HomeShelfPlush({
  item,
  index,
  selectedId,
  isEditing,
  isEditSelected,
  isEditTarget,
  plushImageSize,
  canvasPixelsBelowFeet,
  onPress,
  onSwing,
}: {
  item: Item;
  index: number;
  selectedId: string;
  isEditing: boolean;
  isEditSelected: boolean;
  isEditTarget: boolean;
  plushImageSize: { width: number; height: number };
  canvasPixelsBelowFeet: number;
  onPress: () => void;
  onSwing: () => void;
}) {
  const rotation = useRef(new Animated.Value(0)).current;
  const settle = useCallback((direction: number) => {
    Animated.sequence([
      Animated.timing(rotation, { toValue: -direction * 0.34, duration: 95, useNativeDriver: true }),
      Animated.timing(rotation, { toValue: direction * 0.22, duration: 105, useNativeDriver: true }),
      Animated.timing(rotation, { toValue: -direction * 0.12, duration: 90, useNativeDriver: true }),
      Animated.spring(rotation, { toValue: 0, speed: 18, bounciness: 6, useNativeDriver: true }),
    ]).start();
  }, [rotation]);
  const sway = rotation.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-8deg', '0deg', '8deg'] });
  const name = item.name.replace(' ぬい', '');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isEditing ? `${name}、土台${index + 1}` : `${name}を揺らす`}
      onPress={() => {
        onPress();
        if (!isEditing) {
          rotation.stopAnimation();
          settle(1);
          onSwing();
        }
      }}
      style={({ pressed }) => [
        styles.homePlushItem,
        !isEditing && item.id === selectedId && styles.homePlushItemSelected,
        isEditing && styles.homeDecorationEditable,
        isEditTarget && styles.homeDecorationTarget,
        isEditSelected && styles.homeDecorationEditSelected,
        pressed && styles.homeSelectablePressed,
      ]}
    >
      <Animated.View style={[styles.homePlushSwing, { transform: [{ rotate: sway }] }]}>
        <Image
          source={item.image}
          resizeMode="contain"
          style={[
            styles.homePlushImage,
            plushImageSize,
            {
              bottom: -canvasPixelsBelowFeet,
            },
          ]}
        />
      </Animated.View>
      {isEditing ? <View style={[styles.homeSlotBadge, styles.homePlushSlotBadge]}><Text style={styles.homeSlotBadgeText}>{index + 1}</Text></View> : null}
    </Pressable>
  );
}

export function HomeScreen({
  selected,
  owned = EMPTY_OWNED,
  onSelect,
  incidentWallItemId,
  incidentWallState,
  placementHiddenWallItemId,
  onIncidentPress,
  wallItemIds,
  wallVariants,
  plushItemIds,
  onSwapWallItems,
  onSwapPlushItems,
  onUiTap,
  onInteract,
  onKeychainSwing,
  reaction,
  dailyState,
  dailyHydrated = true,
  onDailyPullRelease,
  onDailyReaction,
  onOpenMobbyTime,
}: {
  selected: Item;
  owned?: Record<string, number>;
  onSelect: (id: string) => void;
  incidentWallItemId?: string;
  incidentWallState: 'none' | 'stolen' | 'returning';
  placementHiddenWallItemId?: string;
  onIncidentPress: () => void;
  wallItemIds: string[];
  wallVariants: Record<string, Exclude<CollectibleVariant, 'plush'>>;
  plushItemIds: string[];
  onSwapWallItems: (fromId: string, toId: string) => void;
  onSwapPlushItems: (fromId: string, toId: string) => void;
  onUiTap: () => void;
  onInteract: (kind: string) => number;
  onKeychainSwing: () => void;
  reaction: string;
  dailyState?: DailyLoopState;
  dailyHydrated?: boolean;
  onDailyPullRelease?: () => Promise<void>;
  onDailyReaction?: (reactionId: string) => void;
  onOpenMobbyTime?: () => void;
}) {
  const { height: appHeight, scale: appScale } = useAppLayout();
  const compactViewport = appHeight < 780;
  const [roomSize, setRoomSize] = useState({ width: 0, height: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editSelection, setEditSelection] = useState<{ kind: HomePlacementKind; index: number; itemId: string } | null>(null);
  const [editFeedback, setEditFeedback] = useState('');
  const [mainMobbyBusy, setMainMobbyBusy] = useState(false);
  const [showHomeHint, setShowHomeHint] = useState(true);
  const [dailyPanelOpen, setDailyPanelOpen] = useState(false);
  const [stampBurstKey, setStampBurstKey] = useState(0);
  const celebratedRewardIdsRef = useRef(new Set<string>());
  const homeMountedRef = useRef(true);
  const { stamp: playStampHaptic } = useMobbyHaptics();
  const hintPulse = useRef(new Animated.Value(0)).current;
  const wallTileFrames = useRef<Record<string, TileFrame>>({});
  const wallTileSwings = useRef<Record<string, KeychainSwing>>({});
  const wallTouchedTiles = useRef(new Set<string>());
  const wallPreviousPoint = useRef<Point | null>(null);
  const wallPointerActive = useRef(false);
  const wallMouseActive = useRef(false);
  const wallGridOrigin = useRef<Point>({ x: 0, y: 0 });
  const wallGridRef = useRef<View>(null);
  useEffect(() => {
    homeMountedRef.current = true;
    return () => { homeMountedRef.current = false; };
  }, []);
  const registerWallSwing = useCallback((id: string, swing: KeychainSwing | null) => {
    if (swing) wallTileSwings.current[id] = swing;
    else delete wallTileSwings.current[id];
  }, []);
  const registerWallFrame = useCallback((id: string, event: LayoutChangeEvent) => {
    wallTileFrames.current[id] = event.nativeEvent.layout;
  }, []);
  const updateWallGridOrigin = useCallback(() => {
    wallGridRef.current?.measureInWindow((x, y) => {
      wallGridOrigin.current = { x, y };
    });
  }, []);
  useEffect(() => {
    updateWallGridOrigin();
  }, [updateWallGridOrigin]);
  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(hintPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(hintPulse, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]), { iterations: 2 });
    pulse.start();
    const timer = setTimeout(() => setShowHomeHint(false), 4200);
    return () => { clearTimeout(timer); pulse.stop(); };
  }, [hintPulse]);
  useEffect(() => {
    if (!dailyHydrated || !dailyState) return;
    const newlyQueuedBonuses = dailyState.pendingRewards.filter((reward) =>
      reward.sourceDate === dailyState.logicalDate &&
      (reward.eventId.startsWith('stamp:') || reward.eventId.startsWith('mission:')) &&
      !celebratedRewardIdsRef.current.has(reward.eventId));
    if (newlyQueuedBonuses.length === 0) return;
    newlyQueuedBonuses.forEach((reward) => celebratedRewardIdsRef.current.add(reward.eventId));
    void AsyncStorage.getItem(STORAGE_DAILY_BONUS_CELEBRATIONS).then((raw) => {
      let storedIds: string[] = [];
      if (raw) {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) storedIds = parsed.filter((value): value is string => typeof value === 'string');
        } catch {
          storedIds = [];
        }
      }
      const storedSet = new Set(storedIds);
      const freshBonuses = newlyQueuedBonuses.filter((reward) => !storedSet.has(reward.eventId));
      if (freshBonuses.length === 0) return;
      if (!homeMountedRef.current) return;
      freshBonuses.forEach((reward) => storedSet.add(reward.eventId));
      void AsyncStorage.setItem(STORAGE_DAILY_BONUS_CELEBRATIONS, JSON.stringify([...storedSet].slice(-64))).catch(() => undefined);
      setStampBurstKey((value) => value + 1);
      playStampHaptic();
    }).catch(() => {
      if (!homeMountedRef.current) return;
      setStampBurstKey((value) => value + 1);
      playStampHaptic();
    });
  }, [dailyHydrated, dailyState, playStampHaptic]);
  const wallPointFromEvent = useCallback((event: KeychainPanEvent): Point => {
    const nativeEvent = event.nativeEvent ?? event;
    const pageX = nativeEvent.pageX ?? event.pageX ?? event.clientX;
    const pageY = nativeEvent.pageY ?? event.pageY ?? event.clientY;
    const locationX = event.nativeEvent?.locationX;
    const locationY = event.nativeEvent?.locationY;
    if (typeof pageX === 'number' && Number.isFinite(pageX) && typeof pageY === 'number' && Number.isFinite(pageY)) {
      return { x: (pageX - wallGridOrigin.current.x) / appScale, y: (pageY - wallGridOrigin.current.y) / appScale };
    }
    return { x: (locationX ?? 0) / appScale, y: (locationY ?? 0) / appScale };
  }, [appScale]);
  const wallFrameContains = useCallback((point: Point, frame: TileFrame) => {
    const padding = 18;
    return point.x >= frame.x - padding && point.x <= frame.x + frame.width + padding && point.y >= frame.y - padding && point.y <= frame.y + frame.height + padding;
  }, []);
  const wallSegmentTouchesFrame = useCallback((from: Point, to: Point, frame: TileFrame) => {
    const padding = 18;
    const left = frame.x - padding;
    const right = frame.x + frame.width + padding;
    const top = frame.y - padding;
    const bottom = frame.y + frame.height + padding;
    return Math.max(from.x, to.x) >= left && Math.min(from.x, to.x) <= right && Math.max(from.y, to.y) >= top && Math.min(from.y, to.y) <= bottom;
  }, []);
  const animateWallTouched = useCallback((from: Point | null, to: Point, direction: number) => {
    Object.entries(wallTileFrames.current).forEach(([id, frame]) => {
      if (wallTouchedTiles.current.has(id)) return;
      const touched = wallFrameContains(to, frame) || (from ? wallSegmentTouchesFrame(from, to, frame) : false);
      if (!touched) return;
      wallTouchedTiles.current.add(id);
      wallTileSwings.current[id]?.(direction);
    });
  }, [wallFrameContains, wallSegmentTouchesFrame]);
  const resetWallGesture = useCallback(() => {
    wallTouchedTiles.current.clear();
    wallPreviousPoint.current = null;
  }, []);
  const beginWallGesture = useCallback((event: KeychainPanEvent) => {
    if (isEditing) return;
    wallTouchedTiles.current.clear();
    updateWallGridOrigin();
    wallPreviousPoint.current = wallPointFromEvent(event);
  }, [isEditing, updateWallGridOrigin, wallPointFromEvent]);
  const moveWallGesture = useCallback((event: KeychainPanEvent) => {
    if (isEditing) return;
    const point = wallPointFromEvent(event);
    const previous = wallPreviousPoint.current;
    if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) > 2) {
      animateWallTouched(previous, point, point.x < previous.x ? -1 : 1);
    }
    wallPreviousPoint.current = point;
  }, [animateWallTouched, isEditing, wallPointFromEvent]);
  const handleWallPointerDown = useCallback((event: KeychainPanEvent) => {
    if (isEditing) return;
    wallPointerActive.current = true;
    beginWallGesture(event);
  }, [beginWallGesture, isEditing]);
  const handleWallPointerMove = useCallback((event: KeychainPanEvent) => {
    if (!wallPointerActive.current) return;
    moveWallGesture(event);
  }, [moveWallGesture]);
  const handleWallPointerEnd = useCallback(() => {
    wallPointerActive.current = false;
    resetWallGesture();
  }, [resetWallGesture]);
  const handleWallMouseDown = useCallback((event: KeychainPanEvent) => {
    if (isEditing) return;
    wallMouseActive.current = true;
    beginWallGesture(event);
  }, [beginWallGesture, isEditing]);
  const handleWallMouseMove = useCallback((event: KeychainPanEvent) => {
    if (!wallMouseActive.current) return;
    moveWallGesture(event);
  }, [moveWallGesture]);
  const handleWallMouseEnd = useCallback(() => {
    wallMouseActive.current = false;
    resetWallGesture();
  }, [resetWallGesture]);
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
    const width = Math.min(itemWidth * 1.16, shelfHeight * 1.0);
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
  const [characterPickerOpen, setCharacterPickerOpen] = useState(false);
  const selectedMobby = getMobby(ITEM_MOBBY_IDS[selected.id] ?? 'mobichi');
  const toggleCharacterPicker = () => {
    onUiTap();
    setCharacterPickerOpen((current) => !current);
  };
  const chooseCharacter = (item: Item) => {
    setCharacterPickerOpen(false);
    onSelect(item.id);
  };
  const toggleEditing = () => {
    onUiTap();
    if (incidentWallState !== 'none') {
      setIsEditing(false);
      setEditSelection(null);
      setEditFeedback('事件中は壁の配置を変更できません');
      return;
    }
    setIsEditing((current) => !current);
    setEditSelection(null);
    setEditFeedback('');
  };
  const handleDecorationPress = (kind: HomePlacementKind, index: number, item: Item) => {
    onUiTap();
    if (!isEditing) return;
    if (!editSelection || editSelection.kind !== kind) {
      setEditSelection({ kind, index, itemId: item.id });
      setEditFeedback('');
      return;
    }
    if (editSelection.index === index) {
      setEditSelection(null);
      return;
    }
    if (kind === 'wall') onSwapWallItems(editSelection.itemId, item.id);
    else onSwapPlushItems(editSelection.itemId, item.id);
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
        <View pointerEvents="none" style={styles.homeGarland}><Image source={HOME_GARLAND} resizeMode="contain" style={styles.homeDecorAsset} /></View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isEditing ? 'ホーム編集を完了' : 'ホームを編集'}
          onPress={toggleEditing}
          style={({ pressed }) => [styles.homeEditButton, styles.pressableFocusReset, isEditing && styles.homeEditButtonActive, pressed && styles.homeSelectablePressed]}
        >
          <ImageBackground source={isEditing ? UI_CORAL_BUTTON : UI_CREAM_BUTTON} resizeMode="stretch" style={styles.homeEditButtonAsset}><Text style={[styles.homeEditButtonText, isEditing && styles.homeEditButtonTextActive]}>{isEditing ? 'おわり' : 'お部屋'}</Text></ImageBackground>
        </Pressable>
        <View
          ref={wallGridRef}
          onLayout={updateWallGridOrigin}
          onPointerDown={handleWallPointerDown}
          onPointerMove={handleWallPointerMove}
          onPointerUp={handleWallPointerEnd}
          onPointerCancel={handleWallPointerEnd}
          onPointerLeave={handleWallPointerEnd}
          {...(Platform.OS !== 'web' ? { onTouchStart: handleWallPointerDown, onTouchMove: handleWallPointerMove, onTouchEnd: handleWallPointerEnd, onTouchCancel: handleWallPointerEnd } as any : {})}
          {...(Platform.OS === 'web' ? { onMouseDown: handleWallMouseDown, onMouseMove: handleWallMouseMove, onMouseUp: handleWallMouseEnd, onMouseLeave: handleWallMouseEnd } as any : {})}
          style={styles.homeWallKeys}
        >
          {wallItems.map((item, index) => {
            const isEditSelected = editSelection?.kind === 'wall' && editSelection.index === index;
            const isEditTarget = editSelection?.kind === 'wall' && editSelection.index !== index;
            return (
              <HomeWallKeychain
                key={item.id}
                item={item}
                variant={wallVariants[item.id] ?? 'key-normal'}
                index={index}
                selectedId={selected.id}
                ownedCount={ownedCollectibleCount(owned, item.id, 'key-normal') + ownedCollectibleCount(owned, item.id, 'key-small')}
                incidentState={item.id === incidentWallItemId && incidentWallState !== 'none'
                  ? incidentWallState
                  : item.id === placementHiddenWallItemId ? 'placement-hidden' : 'normal'}
                isEditing={isEditing}
                isEditSelected={isEditSelected}
                isEditTarget={isEditTarget}
                onPress={() => item.id === incidentWallItemId && incidentWallState === 'stolen'
                  ? onIncidentPress()
                  : handleDecorationPress('wall', index, item)}
                onSwing={onKeychainSwing}
                gestureManaged={!isEditing}
                onSwingReady={registerWallSwing}
                onLayout={(event) => registerWallFrame(item.id, event)}
              />
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
              <HomeShelfPlush
                key={item.id}
                item={item}
                index={index}
                selectedId={selected.id}
                isEditing={isEditing}
                isEditSelected={isEditSelected}
                isEditTarget={isEditTarget}
                plushImageSize={plushImageSize}
                canvasPixelsBelowFeet={canvasPixelsBelowFeet}
                onPress={() => handleDecorationPress('shelf', index, item)}
                onSwing={onKeychainSwing}
              />
            );
          })}
        </View>
        {!isEditing ? <>
          {characterPickerOpen ? (
            <View pointerEvents="box-none" style={styles.homeCharacterPickerOverlay}>
              <Pressable accessibilityRole="button" accessibilityLabel="メインモビー選択を閉じる" onPress={() => setCharacterPickerOpen(false)} style={styles.homeCharacterPickerBackdrop} />
              <ImageBackground source={UI_WIDE_PAPER} resizeMode="stretch" style={[styles.homeCharacterPickerMenu, compactViewport && styles.homeCharacterPickerMenuCompact]} imageStyle={styles.panelStretchImage}>
                <View style={styles.homeCharacterPickerMenuHeader}>
                  <Text style={styles.homeCharacterPickerTitle}>メインモビーを選ぶ</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="メインモビー選択を閉じる" onPress={() => setCharacterPickerOpen(false)} style={styles.homeCharacterPickerClose}><Text style={styles.homeCharacterPickerCloseText}>×</Text></Pressable>
                </View>
                <View style={styles.homeCharacterOptions}>
                  {ITEMS.map((item) => {
                    const mobby = getMobby(ITEM_MOBBY_IDS[item.id] ?? 'mobichi');
                    const isSelected = item.id === selected.id;
                    return (
                      <Pressable key={`main-mobby-${item.id}`} accessibilityRole="radio" accessibilityState={{ checked: isSelected }} accessibilityLabel={`${mobby.name}をメインモビーにする`} onPress={() => chooseCharacter(item)} style={({ pressed }) => [styles.homeCharacterOption, isSelected && styles.homeCharacterOptionSelected, pressed && styles.homeSelectablePressed]}>
                        <Image source={item.image} resizeMode="contain" style={styles.homeCharacterOptionImage} />
                        <Text style={styles.homeCharacterOptionName} numberOfLines={1}>{mobby.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ImageBackground>
            </View>
          ) : null}
        </> : null}
        {isEditing ? (
          <Image source={selected.image} resizeMode="contain" style={[styles.homeMainCharacter, compactViewport && styles.homeMainCharacterCompact, styles.homeMainCharacterEditing]} />
        ) : (
          <View style={[styles.homeMainCharacter, styles.homeMainCharacterPullable, compactViewport && styles.homeMainCharacterCompact]}>
            <MobbyIdleMotion enabled={!mainMobbyBusy}>
              <PullableMobby selected={selected} selectedMobbyName={selectedMobby.name} onCharacterPickerPress={toggleCharacterPicker} specialCentering size={compactViewport ? 178 : 220} onPull={() => onInteract('ほっぺ')} onInteractionStateChange={setMainMobbyBusy} enabled={dailyHydrated} onValidRelease={onDailyPullRelease} onReaction={onDailyReaction} />
            </MobbyIdleMotion>
            <View pointerEvents="none" style={styles.homeMoodBadge}><Text style={styles.homeMoodBadgeText}>ごきげん</Text></View>
            {showHomeHint ? <Animated.View pointerEvents="none" style={[styles.homeContextHint, { opacity: hintPulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }), transform: [{ scale: hintPulse.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.02] }) }] }]}><Text style={styles.homeContextHintText}>ほっぺを引っぱってみて</Text></Animated.View> : null}
          </View>
        )}
        {!isEditing && reaction ? <View pointerEvents="none" style={[styles.homeReactionBubble, { top: shelfSurfaceY + 4 }]}><View style={styles.homeReactionTailBorder} /><View style={styles.homeReactionTail} /><Text style={styles.homeReactionBubbleText}>{reaction}</Text></View> : null}
        {isEditing ? <View style={styles.homeEditGuide}><Text style={styles.homeEditGuideTitle}>お部屋を編集</Text><Text style={styles.homeEditGuideText}>{editInstruction}</Text></View> : null}
        {!isEditing && dailyState ? <>
          <Pressable accessibilityRole="button" accessibilityLabel="デイリー情報を表示" disabled={!dailyHydrated} onPress={() => setDailyPanelOpen((value) => !value)} style={({ pressed }) => [styles.dailyHomeToggle, !dailyHydrated && styles.dailyDisabled, pressed && styles.homeSelectablePressed]}><Text style={styles.dailyHomeToggleText}>{dailyHydrated ? `DAILY ${dailyState.missions.pullReleases}/3` : '読込中…'}</Text></Pressable>
          <ParticleBurst type="stamp-ink" active={stampBurstKey > 0} burstKey={stampBurstKey} seed={`${dailyState.logicalDate}:${stampBurstKey}`} style={styles.dailyHomeToggleBurst} />
          {dailyPanelOpen ? <View style={styles.dailyHomePanel}><ScrollView contentContainerStyle={styles.dailyHomePanelContent} showsVerticalScrollIndicator={false}>
            <View style={styles.dailyStampWrap}><ReadableDailyStampCard stampCount={dailyState.stampCount} cycle={dailyState.stampCycle} /></View>
            <ReadableDailyMissionPanel missions={dailyState.missions} />
            <Pressable accessibilityRole={onOpenMobbyTime ? 'button' : undefined} accessibilityLabel="MOBBY TIMEを開く" disabled={!onOpenMobbyTime} onPress={onOpenMobbyTime} style={({ pressed }) => [styles.dailyMobbyTimeCard, !dailyHydrated && styles.dailyDisabled, pressed && styles.pressed]}><Text style={styles.dailyMobbyTimeTitle}>MOBBY TIME</Text><Text style={styles.dailyMobbyTimeText}>{dailyState.mobbyTime?.state === 'available' ? (dailyState.mobbyTime.carriedFrom ? '昨日の未開封分あり ↓ タップしてMOBBY TIMEへ' : '未開封の箱あり ↓ タップしてMOBBY TIMEへ') : dailyState.mobbyTime?.state === 'expired' ? '期限切れ。翌日の持ち越しを確認してね' : dailyState.mobbyTime?.state === 'opened' ? '今日は開封済み' : 'タップしてMOBBY TIMEで確認'}</Text></Pressable>
            {dailyState.pendingRewards.length > 0 ? <View style={styles.dailyPending}><Text style={styles.dailyPendingTitle}>受取待ち {dailyState.pendingRewards.length}件</Text><Text style={styles.dailyPendingText}>所持品連携後に受け取れます</Text></View> : null}
          </ScrollView></View> : null}
        </> : null}
      </View>
    </View>
  );
}

export function WallPlacementFlight({ item, variant, onComplete }: { item: Item; variant: Exclude<CollectibleVariant, 'plush'>; onComplete: () => void }) {
  const { width, height } = useAppLayout();
  const progress = useRef(new Animated.Value(0)).current;
  const onCompleteRef = useRef(onComplete);
  const appWidth = width;
  const roomHeight = Math.max(520, height - 74);
  const itemIndex = Math.max(0, ITEMS.findIndex((candidate) => candidate.id === item.id));
  const row = Math.floor(itemIndex / 5);
  const column = itemIndex % 5;
  const targetCenterX = appWidth * (0.07 + (column + 0.5) * 0.86 / 5);
  const targetCenterY = 74 + roomHeight * 0.07 + row * roomHeight * 0.1849 + 53;
  const startCenterX = appWidth / 2;
  const startCenterY = height * 0.55;

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.timing(progress, { toValue: 0.18, duration: 360, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: 1550, useNativeDriver: true }),
      Animated.delay(650),
    ]);
    let completed = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    const completeFlight = () => {
      if (completed) return;
      completed = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      onCompleteRef.current();
    };
    // Keep the flight animation, but never leave the transparent overlay
    // blocking the home screen if an animation completion callback is lost.
    fallbackTimer = setTimeout(completeFlight, 3200);
    animation.start(({ finished }) => { if (finished) completeFlight(); });
    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      animation.stop();
    };
  }, [progress]);

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
        <Image source={collectibleImage(item, variant)} resizeMode="contain" style={[styles.wallFlightImage, variant === 'key-small' && styles.wallFlightSmallImage]} />
      </Animated.View>
      <Animated.View style={[styles.wallLandingBurst, { left: targetCenterX - 38, top: targetCenterY - 38, opacity: progress.interpolate({ inputRange: [0, 0.82, 1], outputRange: [0, 0, 1] }), transform: [{ scale: progress.interpolate({ inputRange: [0, 0.82, 1], outputRange: [0.3, 0.3, 1.35] }) }] }]}><Text style={styles.wallLandingBurstText}>✦</Text></Animated.View>
    </View>
  );
}

type KeychainSwing = (direction: number) => void;
type KeychainPanEvent = { nativeEvent?: { pageX?: number; pageY?: number; locationX?: number; locationY?: number }; pageX?: number; pageY?: number; clientX?: number; clientY?: number };
type KeychainGesture = { dx: number; dy: number };

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
  onSwing?: () => void;
};

function KeychainTile({ item, owned, selectedId, onSelect, imageSize = 'normal', placement, gestureManaged = false, onSwingReady, onLayout, onGestureStart, onGestureMove, onGestureEnd, onSwing }: KeychainTileProps) {
  const keyVariant = collectibleVariantFromKeySize(imageSize);
  const ownedCount = item ? ownedCollectibleCount(owned, item.id, keyVariant) : 0;
  const rotation = useRef(new Animated.Value(0)).current;
  const swing = useCallback((direction: number) => {
    onSwing?.();
    Animated.sequence([
      Animated.timing(rotation, { toValue: direction, duration: 70, useNativeDriver: true }),
      Animated.timing(rotation, { toValue: -direction * 0.82, duration: 130, useNativeDriver: true }),
      Animated.timing(rotation, { toValue: direction * 0.58, duration: 110, useNativeDriver: true }),
      Animated.spring(rotation, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 8 }),
    ]).start();
  }, [onSwing, rotation]);
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
  const name = item ? itemCharacterName(item) : '未発見';
  const keyImage = item ? collectibleImage(item, keyVariant) : undefined;
  const localPanHandlers = !gestureManaged && item && ownedCount > 0 ? panResponder.panHandlers : {};
  return (
    <Animated.View {...localPanHandlers} onLayout={onLayout} style={[styles.collectionKeyItem, placement && styles.collectionKeyItemAnchored, placement]}>
      <Pressable focusable={false} onPress={() => { if (item && ownedCount > 0) { onSelect(item.id); swing(1); } }} style={styles.collectionKeyPressable} accessibilityRole="button" accessibilityLabel={`${name}${imageSize === 'small' ? ' Sサイズ' : ' 通常サイズ'}を揺らす`} accessibilityState={{ disabled: ownedCount === 0 }}>
        <Animated.View style={[styles.collectionKeySwing, { transform: [{ rotate: sway }] }]}>
          {item && ownedCount > 0 ? <View style={styles.collectionKeyHookOwned} /> : null}
          <View style={[styles.collectionKeyBody, item && ownedCount > 0 && styles.collectionKeyBodyOwned, item && ownedCount > 0 && selectedId === item.id && styles.collectionKeySelected]}>{item && ownedCount > 0 ? <Image source={keyImage} resizeMode="contain" style={[styles.collectionKeyImage, imageSize === 'small' && styles.collectionSmallKeyImage]} /> : <View style={styles.collectionLocked}><Text style={styles.collectionLockedText}>?</Text></View>}</View>
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
  onSwing: () => void;
};

type TileFrame = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

function KeychainGrid({ items, owned, selectedId, onSelect, imageSize, boardHeight, onSwing }: KeychainGridProps) {
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
            left: COLLECTION_COLUMN_X[index % 3] - 52,
            top: COLLECTION_BOARD_TOP + COLLECTION_KEY_ROW_RATIOS[Math.floor(index / 3)] * boardHeight,
          }}
          onSwingReady={registerSwing}
          onLayout={item ? (event) => registerFrame(item.id, event) : undefined}
          onGestureStart={beginGesture}
          onGestureMove={moveGesture}
          onGestureEnd={resetGesture}
          onSwing={onSwing}
        />
      ))}
    </View>
  );
}

function getPlushCollectionPlacement(index: number, boardHeight: number) {
  const columnX = COLLECTION_COLUMN_X[index % 3];
  const shelfRatio = COLLECTION_PLUSH_SHELF_RATIOS[Math.floor(index / 3)] ?? COLLECTION_PLUSH_SHELF_RATIOS[2];
  const shelfY = COLLECTION_BOARD_TOP + shelfRatio * boardHeight;
  return { left: columnX - 55, top: shelfY - 120 };
}

function getPlushCollectionImageBottom(item: Item) {
  const imageWidth = 110;
  const imageHeight = 120;
  const renderedImageHeight = Math.min(imageWidth, imageHeight);
  const containTopInset = (imageHeight - renderedImageHeight) / 2;
  const visibleBottomRatio = PLUSH_VISIBLE_BOTTOM_RATIO[item.id] ?? PLUSH_CONTACT_REFERENCE;
  const visibleFootBottom = containTopInset + renderedImageHeight * visibleBottomRatio;
  return -(imageHeight - visibleFootBottom);
}

export function CollectionScreen({
  items, owned, selectedId, onSelect, onKeychainSwing,
  reactionCount = 0, claimedReactionMilestones = [], dailyHydrated = true,
  onClaimReactionMilestone,
}: {
  items: Item[];
  owned: Record<string, number>;
  selectedId: string;
  onSelect: (id: string) => void;
  onKeychainSwing: () => void;
  reactionCount?: number;
  claimedReactionMilestones?: ReactionMilestone[];
  dailyHydrated?: boolean;
  onClaimReactionMilestone?: (milestone: ReactionMilestone) => Promise<unknown>;
}) {
  const { height: appHeight } = useAppLayout();
  const [mode, setMode] = useState<ItemKind>('ぬいキー');
  const [keyImageSize, setKeyImageSize] = useState<KeychainImageSize>('normal');
  const visibleItems = items;
  const slotCount = 9;
  const displayItems: (Item | null)[] = [...visibleItems, ...Array.from({ length: Math.max(0, slotCount - visibleItems.length) }, () => null)];
  const boardHeight = Math.min(640, Math.max(420, appHeight - 302));
  const discoveredCount = items.filter((item) => ownedCollectibleCount(owned, item.id, mode === 'ぬいぐるみ' ? 'plush' : keyImageSize === 'small' ? 'key-small' : 'key-normal') > 0).length;
  const collectionComplete = items.length > 0 && discoveredCount === items.length;
  const completedReactionCount = Math.min(100, reactionCount);
  const reactionCompletion = Math.round(completedReactionCount / 100 * 100);
  const nextMilestone = REACTION_MILESTONES.find((milestone) => reactionCount < milestone);
  return (
    <View style={styles.collectionScreenBackground}>
      <ScrollView style={styles.collectionScrollContent} contentContainerStyle={[styles.collectionScrollInner, { minHeight: COLLECTION_BOARD_TOP + boardHeight + 220 }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.reactionCollectionCard, { top: COLLECTION_BOARD_TOP + boardHeight + 12 }]}>
        <View style={styles.reactionCollectionHeading} accessible accessibilityRole="summary" accessibilityLabel={`ちょっかい図鑑、完成率${reactionCompletion}パーセント`}>
          <View><Text style={styles.reactionCollectionTitle}>ちょっかい図鑑</Text><Text style={styles.reactionCollectionText}>完成率 {reactionCompletion}% ・ {completedReactionCount} / 100種</Text></View>
          <Text style={styles.reactionCollectionNext}>{nextMilestone ? `次の報酬まであと${nextMilestone - reactionCount}種` : '100種コンプリート！'}</Text>
        </View>
        <View style={styles.reactionMilestoneRow}>
          {REACTION_MILESTONES.map((milestone) => {
            const claimed = claimedReactionMilestones.includes(milestone);
            const claimable = reactionCount >= milestone && !claimed;
            return (
              <Pressable
                key={milestone}
                accessibilityRole="button"
                accessibilityLabel={`${milestone}種報酬、${claimed ? '受取済み' : claimable ? '受取可能' : `あと${milestone - reactionCount}種`}`}
                accessibilityState={{ disabled: !dailyHydrated || !claimable || !onClaimReactionMilestone }}
                disabled={!dailyHydrated || !claimable || !onClaimReactionMilestone}
                onPress={() => void onClaimReactionMilestone?.(milestone)}
                style={({ pressed }) => [styles.reactionMilestone, claimable && styles.reactionMilestoneClaimable, claimed && styles.reactionMilestoneClaimed, pressed && styles.gamePressed]}
              >
                <Text style={[styles.reactionMilestoneText, claimable && styles.reactionMilestoneTextActive]}>{milestone}</Text>
                <Text style={[styles.reactionMilestoneState, claimable && styles.reactionMilestoneTextActive]}>{claimed ? '受取済' : claimable ? '受取' : 'LOCK'}</Text>
              </Pressable>
            );
          })}
        </View>
        {!dailyHydrated ? <Text style={styles.dailyLoadingText}>デイリー情報を読み込み中…</Text> : null}
      </View>
      <View pointerEvents="none" style={[styles.collectionBoardShadow, { height: boardHeight - 10 }]} />
      <Image source={COLLECTION_DISPLAY_BOARD} resizeMode="stretch" style={[styles.collectionDisplayBoard, { height: boardHeight }]} />
      <View style={styles.collectionHeaderBar}>
        <ImageBackground source={UI_WIDE_PAPER} resizeMode="stretch" style={styles.collectionHeaderCopy}><Text style={styles.collectionHeaderTitle}>集めたモビー</Text><View style={[styles.collectionProgressBadge, collectionComplete && styles.collectionProgressBadgeComplete]}><Text style={styles.collectionProgressBadgeText}>{collectionComplete ? '✓ COMPLETE' : `${discoveredCount}/${items.length}`}</Text><ParticleBurst type="sparkle" count={7} active={collectionComplete} burstKey={`${mode}-${keyImageSize}`} seed={`${mode}-${discoveredCount}`} /></View></ImageBackground>
        <ImageBackground source={UI_WIDE_PAPER} resizeMode="stretch" style={styles.collectionModeTabs} imageStyle={styles.panelStretchImage}><Pressable onPress={() => setMode('ぬいキー')} style={({ pressed }) => [styles.collectionModeTab, styles.pressableFocusReset, mode === 'ぬいキー' && styles.collectionModeTabActive, pressed && styles.gamePressed]}><Text style={[styles.collectionModeText, mode === 'ぬいキー' && styles.collectionModeTextActive]}>ぬいキー</Text></Pressable><Pressable onPress={() => setMode('ぬいぐるみ')} style={({ pressed }) => [styles.collectionModeTab, styles.pressableFocusReset, mode === 'ぬいぐるみ' && styles.collectionModeTabActive, pressed && styles.gamePressed]}><Text style={[styles.collectionModeText, mode === 'ぬいぐるみ' && styles.collectionModeTextActive]}>ぬいぐるみ</Text></Pressable></ImageBackground>
      </View>
      {mode === 'ぬいキー' ? <View style={styles.collectionKeySizeTabs}><Text style={styles.collectionKeySizeLabel}>サイズ</Text><Pressable onPress={() => setKeyImageSize('normal')} style={[styles.collectionKeySizeTab, styles.pressableFocusReset, keyImageSize === 'normal' && styles.collectionKeySizeTabActive]} accessibilityRole="tab" accessibilityState={{ selected: keyImageSize === 'normal' }}><Text style={[styles.collectionKeySizeText, keyImageSize === 'normal' && styles.collectionKeySizeTextActive]}>ノーマル</Text></Pressable><Pressable onPress={() => setKeyImageSize('small')} style={[styles.collectionKeySizeTab, styles.pressableFocusReset, keyImageSize === 'small' && styles.collectionKeySizeTabActive]} accessibilityRole="tab" accessibilityState={{ selected: keyImageSize === 'small' }}><Text style={[styles.collectionKeySizeText, keyImageSize === 'small' && styles.collectionKeySizeTextActive]}>S</Text></Pressable></View> : null}
      <View style={[styles.collectionDisplay, { height: COLLECTION_BOARD_TOP + boardHeight }, mode === 'ぬいぐるみ' && styles.collectionDisplayPlush]}>
        {mode === 'ぬいキー' ? (
          <KeychainGrid items={displayItems} owned={owned} selectedId={selectedId} onSelect={onSelect} imageSize={keyImageSize} boardHeight={boardHeight} onSwing={onKeychainSwing} />
        ) : (
          <View style={styles.plushCollectionShelf}>
            {displayItems.map((item, index) => (
              <Pressable
                key={`${mode}-${item?.id ?? 'locked'}-${index}`}
                onPress={() => item && ownedCollectibleCount(owned, item.id, 'plush') > 0 ? onSelect(item.id) : undefined}
                accessibilityRole="button"
                accessibilityLabel={item ? `${itemCharacterName(item)}のぬいぐるみ` : '未発見のぬいぐるみ'}
                accessibilityState={{ disabled: !item || ownedCollectibleCount(owned, item.id, 'plush') === 0 }}
                style={({ pressed }) => [styles.plushCollectionItem, getPlushCollectionPlacement(index, boardHeight), pressed && styles.gamePressed]}
              >
                <View style={[styles.plushCollectionBody, item && ownedCollectibleCount(owned, item.id, 'plush') > 0 && styles.plushCollectionBodyOwned, item && ownedCollectibleCount(owned, item.id, 'plush') > 0 && selectedId === item.id && styles.plushCollectionSelected]}>
                  {item && ownedCollectibleCount(owned, item.id, 'plush') > 0 ? (
                    <Image source={item.image} resizeMode="contain" style={[styles.plushCollectionImage, { bottom: getPlushCollectionImageBottom(item) }]} />
                  ) : (
                    <View style={styles.collectionLocked}><Text style={styles.collectionLockedText}>?</Text></View>
                  )}
                </View>
                <Text style={styles.collectionPlushName} numberOfLines={1}>{item ? itemCharacterName(item) : '未発見'}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      </ScrollView>
    </View>
  );
}

export function MobbyTimeScreen({
  today, todayVariant, stage, onOpen, onReveal, onPlace, onPlaced, secondsLeft,
  dailyStatus = 'available', dailyHydrated = true, rewardInProgress = false, reduceMotion = false,
  flow = 'daily',
}: {
  today: Item;
  todayVariant: CollectibleVariant;
  stage: MobbyTimeStage;
  onOpen: () => void;
  onReveal: () => void;
  onPlace: () => void;
  onPlaced: () => void;
  secondsLeft: number;
  dailyStatus?: DailyMobbyTimeStatus;
  dailyHydrated?: boolean;
  rewardInProgress?: boolean;
  reduceMotion?: boolean;
  flow?: 'daily' | 'onboarding';
}) {
  const { width: appWidth, height: appHeight } = useAppLayout();
  const [headerHeight, setHeaderHeight] = useState(110);
  const onboardingFlow = flow === 'onboarding';
  const canOpen = dailyHydrated && secondsLeft > 0 && (dailyStatus === 'available' || dailyStatus === 'carryover');
  const active = canOpen || rewardInProgress;
  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');
  const opening = stage === 'opening';
  const placing = stage === 'placing';
  const revealed = stage === 'revealed' || placing || stage === 'placed';
  const placed = stage === 'placed';
  const packageMotion = useRef(new Animated.Value(0)).current;
  const revealMotion = useRef(new Animated.Value(0)).current;
  const magicGlow = useRef(new Animated.Value(0)).current;
  const placementMotion = useRef(new Animated.Value(0)).current;
  const placementBurst = useRef(new Animated.Value(0)).current;
  const onRevealRef = useRef(onReveal);
  const onPlacedRef = useRef(onPlaced);
  const openingRunRef = useRef(0);
  const placementRunRef = useRef(0);
  const haptics = useMobbyHaptics();
  const previousStageRef = useRef(stage);

  useEffect(() => {
    onRevealRef.current = onReveal;
  }, [onReveal]);

  useEffect(() => {
    onPlacedRef.current = onPlaced;
  }, [onPlaced]);

  useEffect(() => {
    const previous = previousStageRef.current;
    previousStageRef.current = stage;
    if (stage === 'opening' && previous !== 'opening') haptics.success();
    if (stage === 'revealed' && previous !== 'revealed') haptics.success();
  }, [haptics, stage]);

  useEffect(() => {
    if (!opening) {
      openingRunRef.current += 1;
      packageMotion.setValue(0);
      magicGlow.setValue(0);
      return;
    }
    const runId = ++openingRunRef.current;
    const shake = reduceMotion
      ? Animated.timing(packageMotion, { toValue: 0, duration: 800, useNativeDriver: true })
      : Animated.sequence([
          Animated.timing(packageMotion, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(packageMotion, { toValue: -1, duration: 120, useNativeDriver: true }),
          Animated.timing(packageMotion, { toValue: 1, duration: 110, useNativeDriver: true }),
          Animated.timing(packageMotion, { toValue: -1, duration: 110, useNativeDriver: true }),
          Animated.timing(packageMotion, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(packageMotion, { toValue: -1, duration: 100, useNativeDriver: true }),
          Animated.timing(packageMotion, { toValue: 0, duration: 80, useNativeDriver: true }),
        ]);
    const anticipationDuration = reduceMotion ? 800 : 1120;
    const animation = Animated.sequence([
      Animated.parallel([
        shake,
        Animated.timing(magicGlow, { toValue: 1, duration: anticipationDuration, useNativeDriver: true }),
      ]),
      Animated.delay(80),
    ]);
    animation.start(({ finished }) => {
      if (finished && openingRunRef.current === runId) onRevealRef.current();
    });
    return () => {
      if (openingRunRef.current === runId) openingRunRef.current += 1;
      animation.stop();
    };
  }, [magicGlow, opening, packageMotion, reduceMotion]);

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
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let completed = false;
    const completePlacement = () => {
      if (completed || placementRunRef.current !== runId) return;
      completed = true;
      placementRunRef.current += 1;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      onPlacedRef.current();
    };
    // Animated callbacks can be skipped when the web/native animation driver
    // is interrupted. Keep a bounded fallback so the placement action always
    // reaches the parent and can navigate to the home screen.
    fallbackTimer = setTimeout(completePlacement, 1800);
    animation.start(({ finished }) => {
      if (finished) completePlacement();
    });
    return () => {
      if (placementRunRef.current === runId) placementRunRef.current += 1;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      animation.stop();
    };
  }, [placementBurst, placementMotion, placing]);

  useEffect(() => {
    if (!revealed) {
      revealMotion.setValue(0);
      return;
    }
    revealMotion.setValue(0.35);
    const animation = Animated.spring(revealMotion, {
      toValue: 1,
      speed: 10,
      bounciness: 15,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [revealMotion, revealed]);

  const startOpening = () => {
    if (!canOpen || opening) return;
    onOpen();
  };
  const placement = todayVariant === 'plush' ? '棚' : '壁';
  const placementDistance = todayVariant === 'plush' ? 34 : -68;
  const rewardImage = collectibleImage(today, todayVariant);
  const rewardName = collectibleName(today, todayVariant);
  const encounterBoardBaseWidth = 370;
  const encounterBoardBaseHeight = 520;
  const encounterBoardScale = Math.min(
    1,
    (appWidth - 28) / encounterBoardBaseWidth,
    Math.max(390, appHeight - 74 - headerHeight - 105) / encounterBoardBaseHeight,
  );
  const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);
    setHeaderHeight((current) => current === nextHeight ? current : nextHeight);
  }, []);
  const packageTransform = {
    transform: [
      { translateX: packageMotion.interpolate({ inputRange: [-1, 0, 1], outputRange: [-7, 0, 7] }) },
      { rotate: packageMotion.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-3deg', '0deg', '3deg'] }) },
      { scale: magicGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
    ],
  };
  const openingLightOpacity = magicGlow.interpolate({
    inputRange: [0, 0.22, 0.62, 1],
    outputRange: [0, 0.2, 0.72, 0.96],
  });
  const openingLightLift = magicGlow.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
  const openingLightScale = magicGlow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const openingLightBeamStyle = {
    opacity: openingLightOpacity,
    transform: [{ translateY: openingLightLift }, { scaleY: openingLightScale }],
  };
  const openingLightLeftRayStyle = {
    opacity: openingLightOpacity,
    transform: [{ translateY: openingLightLift }, { scaleY: openingLightScale }, { rotate: '-17deg' }],
  };
  const openingLightRightRayStyle = {
    opacity: openingLightOpacity,
    transform: [{ translateY: openingLightLift }, { scaleY: openingLightScale }, { rotate: '17deg' }],
  };
  const openButtonLabel = !canOpen
    ? onboardingFlow ? 'グッズを準備中' : 'また明日会おう'
    : opening ? '開封中…' : '箱をタップして開封しよう';
  const statusTitle = onboardingFlow
    ? !dailyHydrated ? '最初のグッズを準備中' : opening ? '開封演出中' : rewardInProgress ? '最初のグッズ' : 'はじめてのBOX'
    : !dailyHydrated ? '読み込み中' : opening ? '開封演出中' : rewardInProgress ? '今日のグッズ' : dailyStatus === 'opened' ? '今日は開封済み' : dailyStatus === 'expired' ? '受付終了' : dailyStatus === 'carryover' ? '持ち越しBOX' : dailyStatus === 'available' ? '開封できます' : '次のBOXを待っています';
  const statusMessage = onboardingFlow
    ? !dailyHydrated ? '最初のグッズを安全に保存しています' : opening ? '光が集まっています…' : rewardInProgress ? (placed ? '受け取りが完了しました' : '最初のグッズを安全に受け取れます') : '箱を開けて、最初の子に会おう'
    : !dailyHydrated ? 'デイリー情報を確認しています' : opening ? '光が集まっています…' : rewardInProgress ? (placed ? '受け取りが完了しました' : '同じグッズを安全に受け取れます') : dailyStatus === 'opened' ? '同じ日はもう一度開封できません' : dailyStatus === 'expired' ? '未開封分は翌日に1回だけ持ち越されます' : dailyStatus === 'carryover' ? '昨日の未開封分を開けられます' : dailyStatus === 'available' ? '箱を開けて、今日の子に会おう' : 'MOBBY TIMEが届くとここに表示されます';
  const packageArtwork = <Image source={MOBBY_TIME_PACKAGE} resizeMode="contain" style={styles.mobbyTimePackageAsset} />;
  return (
    <View style={styles.timeScrollContent}>
        <View onLayout={handleHeaderLayout} style={styles.timeHeader}><Text style={styles.timeTitle}>{onboardingFlow ? 'はじめてのBOX' : 'MOBBY TIME'}</Text><Text style={styles.timeHeaderSub}>{statusTitle}</Text><ImageBackground source={MOBBY_TIME_TIMER_PLAQUE} resizeMode="contain" style={styles.bigTimer}><Text style={styles.bigTimerLabel}>{onboardingFlow ? 'WELCOME' : canOpen ? 'あと' : '状態'}</Text><Text style={styles.bigTimerValue}>{onboardingFlow ? !dailyHydrated ? '準備中' : opening ? '開封中' : rewardInProgress ? '受取中' : 'BOX' : canOpen ? `${minutes}:${seconds}` : opening ? '開封中' : rewardInProgress ? '受取中' : !dailyHydrated ? '読込中' : dailyStatus === 'opened' ? '開封済' : dailyStatus === 'expired' ? '期限切れ' : '待機中'}</Text></ImageBackground></View>
      <View style={{ width: encounterBoardBaseWidth * encounterBoardScale, height: encounterBoardBaseHeight * encounterBoardScale }}>
      <ImageBackground source={MOBBY_TIME_BOARD} resizeMode="stretch" style={[styles.encounterCard, { width: encounterBoardBaseWidth, height: encounterBoardBaseHeight, transform: [{ scale: encounterBoardScale }], transformOrigin: 'top left' }]} imageStyle={styles.encounterCardImage}>
        <View style={styles.arrivalNotice}><Text style={styles.arrivalNoticeText}>{statusMessage}</Text></View>
        <View style={styles.encounterScene}>
          {opening ? (
            <View pointerEvents="none" style={styles.openingLightLayer}>
              <Animated.View style={[styles.openingLightBeam, openingLightBeamStyle]} />
              <Animated.View style={[styles.openingLightRay, styles.openingLightRayLeft, openingLightLeftRayStyle]} />
              <Animated.View style={[styles.openingLightRay, styles.openingLightRayRight, openingLightRightRayStyle]} />
            </View>
          ) : null}
          {opening ? (
            <Animated.View style={[styles.packageAnimationWrap, packageTransform]}>
              <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.revealPackageTouch}>
                {packageArtwork}
              </View>
            </Animated.View>
          ) : !revealed ? (
            <Animated.View style={[styles.packageAnimationWrap, packageTransform]}>
            <Pressable accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onPress={startOpening} disabled={!canOpen || opening} style={({ pressed }) => [styles.revealPackageTouch, pressed && styles.packagePressed]}>
              {packageArtwork}
            </Pressable>
            </Animated.View>
          ) : <>
            <Animated.View style={[styles.encounterRewardWrap, { transform: placing ? [{ translateY: placementMotion.interpolate({ inputRange: [0, 1], outputRange: [-20, placementDistance] }) }, { scale: placementMotion.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 1.16, 0.86] }) }, { rotate: placementMotion.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '-5deg', '0deg'] }) }] : placed ? [{ scale: revealMotion }] : [{ translateY: -20 }, { scale: revealMotion }] }]}><Image source={rewardImage} resizeMode="contain" style={[styles.encounterKeyImage, todayVariant === 'key-small' && styles.encounterSmallKeyImage, todayVariant === 'plush' && styles.encounterPlushImage]} /></Animated.View>
          </>}
          {opening ? <View pointerEvents="none" style={styles.magicParticles}><Text style={styles.magicParticle}>✦</Text><Text style={styles.magicParticle}>✧</Text><Text style={styles.magicParticle}>✦</Text><Text style={styles.magicParticle}>✧</Text></View> : null}
          <ParticleBurst type="sparkle" count={opening ? 8 : 12} large={revealed} active={opening || (revealed && !placing && !placed)} burstKey={stage} seed={`${today.id}-${stage}`} style={styles.timeParticleBurst} />
          {placing ? <Animated.View pointerEvents="none" style={[styles.placementSparkles, { opacity: placementBurst }]}><Text style={styles.placementSparkle}>✦</Text><Text style={styles.placementSparkle}>✧</Text><Text style={styles.placementSparkle}>★</Text><Text style={styles.placementSparkle}>✦</Text><Text style={styles.placementSparkle}>✧</Text></Animated.View> : null}
          <ImageBackground source={MOBBY_TIME_MESSAGE_PLAQUE} resizeMode="contain" style={styles.encounterBubble}><Text style={styles.encounterBubbleTitle}>{!active ? onboardingFlow ? '準備中' : 'また明日' : placed ? '飾ったよ' : placing ? `${placement}へ移動中` : revealed ? rewardName : opening ? 'もうすぐ会えるよ' : '箱をタップ'}</Text><Text style={styles.encounterBubbleText}>{!active ? onboardingFlow ? 'グッズを安全に保存しています' : '次のMOBBY TIMEを待ってね' : placed ? `${collectibleVariantLabel(todayVariant)}が${placement}に仲間入り` : placing ? '大切に飾っています' : revealed ? `${onboardingFlow ? '最初' : '今日'}の${collectibleVariantLabel(todayVariant)}` : opening ? 'なにが入っているかな' : '開封しよう'}</Text></ImageBackground>
          {revealed && !placed && !placing ? <ImageBackground source={MOBBY_TIME_REWARD_SEAL} resizeMode="contain" style={styles.newBadge}><Text style={styles.newBadgeText}>NEW!</Text></ImageBackground> : null}
        </View>
        {!revealed ? <Pressable accessibilityRole="button" accessibilityLabel={openButtonLabel} accessibilityState={{ disabled: !canOpen || opening }} disabled={!canOpen || opening} onPress={startOpening} style={({ pressed }) => [styles.encounterOpenButton, (!canOpen || opening) && styles.encounterOpenButtonDisabled, pressed && styles.encounterOpenButtonPressed]}><ImageBackground source={UI_CORAL_BUTTON} resizeMode="stretch" style={styles.encounterOpenButtonAsset}><Text style={styles.encounterOpenButtonText}>{openButtonLabel}</Text></ImageBackground></Pressable> : null}
        {revealed ? <Pressable accessibilityRole="button" accessibilityLabel={placed ? '配置完了' : `${placement}に追加する`} accessibilityState={{ disabled: placed || !active || placing }} onPress={onPlace} disabled={placed || !active || placing} style={({ pressed }) => [styles.timePrimaryButton, (placed || !active || placing) && styles.timePrimaryButtonInactive, pressed && styles.pressed]}><ImageBackground source={UI_CREAM_BUTTON} resizeMode="stretch" style={styles.assetButtonInner}><Image source={MOBBY_ICON} resizeMode="contain" style={styles.primaryButtonIcon} /><Text style={[styles.primaryButtonText, styles.timePrimaryButtonText]}>{placed ? '配置完了' : placing ? `${placement}へ飾り付け中…` : `${placement}に追加する`}</Text></ImageBackground></Pressable> : <View style={styles.packageCaptionSpacer} />}
      </ImageBackground>
      </View>
    </View>
  );
}

function PullableMobby({ selected, onPull, size = 320, onCharacterPickerPress, selectedMobbyName, specialCentering = false, onInteractionStateChange, enabled = true, onValidRelease, onReaction }: { selected: Item; onPull: () => number; size?: number; onCharacterPickerPress?: () => void; selectedMobbyName?: string; specialCentering?: boolean; onInteractionStateChange?: (busy: boolean) => void; enabled?: boolean; onValidRelease?: () => Promise<void>; onReaction?: (reactionId: string) => void }) {
  const { scale: appScale } = useAppLayout();
  const mobbyId = itemMobbyId(selected.id);
  const pullAsset = PULL_ASSETS[mobbyId];
  const reactionFrames = PULL_REACTION_FRAMES[mobbyId];
  const [status, setStatus] = useState<'idle' | 'pulling' | 'released' | 'reacting'>('idle');
  const [reactionFrame, setReactionFrame] = useState<number | null>(null);
  const [isSpecialReaction, setIsSpecialReaction] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [largeBurst, setLargeBurst] = useState(false);
  const [eyeIndex, setEyeIndex] = useState(-1);
  const [mouthIndex, setMouthIndex] = useState(-1);
  const scaleX = useRef(new Animated.Value(1)).current;
  const scaleY = useRef(new Animated.Value(1)).current;
  const reactionMotion = useRef(new Animated.Value(0)).current;
  const specialMotion = useRef(new Animated.Value(0)).current;
  const reactionAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const lastSingleReactionRef = useRef(-1);
  const meshRef = useRef<MobbyPullMeshHandle>(null);
  const sectorRef = useRef(0);
  const strongRef = useRef(false);
  const mediumThresholdRef = useRef(false);
  const strongHapticRef = useRef(false);
  const haptics = useMobbyHaptics();
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
    setIsSpecialReaction(false);
    setStatus('idle');
    specialMotion.setValue(0);
    resetExpression();
  }, [clearReactionTimers, mobbyId, resetExpression, specialMotion]);

  const release = useCallback((dx: number, dy: number) => {
    if (!enabled) return;
    if (Math.hypot(dx, dy) < 4) {
      setStatus('idle');
      onInteractionStateChange?.(false);
      return;
    }
    meshRef.current?.release();
    const pullCount = onPull();
    void onValidRelease?.();
    const special = pullCount > 0 && pullCount % 10 === 0;
    setLargeBurst(special);
    setBurstKey((value) => value + 1);
    if (special) haptics.success();
    else haptics.medium();
    Animated.parallel([
      Animated.spring(scaleX, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 13 }),
      Animated.spring(scaleY, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 13 }),
    ]).start();

    if (reactionFrames) {
      clearReactionTimers();
      resetExpression();
      setStatus('reacting');
      reactionMotion.setValue(0);
      specialMotion.setValue(0);

      if (special) {
        const specialFrame = reactionFrames.length >= 20 ? 19 : reactionFrames.length - 1;
        onReaction?.(`${mobbyId}:pull:${specialFrame + 1}`);
        setIsSpecialReaction(true);
        setReactionFrame(null);
        reactionTimersRef.current.push(setTimeout(() => setReactionFrame(specialFrame), 300));
        reactionAnimationRef.current = Animated.parallel([
          Animated.sequence([
            Animated.timing(specialMotion, { toValue: 0.16, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(specialMotion, { toValue: 0.48, duration: 300, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
            Animated.timing(specialMotion, { toValue: 0.62, duration: 170, easing: Easing.out(Easing.back(1.8)), useNativeDriver: true }),
            Animated.timing(specialMotion, { toValue: 0.82, duration: 1150, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.delay(650),
            Animated.timing(specialMotion, { toValue: 1, duration: 460, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(300),
            Animated.timing(reactionMotion, { toValue: 1, duration: 2550, easing: Easing.linear, useNativeDriver: true }),
          ]),
        ]);
        reactionAnimationRef.current.start(({ finished }) => {
          if (!finished) return;
          setReactionFrame(null);
          setIsSpecialReaction(false);
          setStatus('idle');
          onInteractionStateChange?.(false);
          reactionMotion.setValue(0);
          specialMotion.setValue(0);
          reactionTimersRef.current = [];
          reactionAnimationRef.current = null;
        });
        return;
      }

      setIsSpecialReaction(false);

      const previous = lastSingleReactionRef.current;
      const nextFrame = previous < 0
        ? Math.floor(Math.random() * reactionFrames.length)
        : (previous + 1 + Math.floor(Math.random() * (reactionFrames.length - 1))) % reactionFrames.length;
      lastSingleReactionRef.current = nextFrame;
      onReaction?.(`${mobbyId}:pull:${nextFrame + 1}`);
      setReactionFrame(nextFrame);
      reactionAnimationRef.current = Animated.timing(reactionMotion, {
        toValue: 1,
        duration: [760, 900, 920, 1500][nextFrame] ?? 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      reactionAnimationRef.current.start(({ finished }) => {
        if (!finished) return;
        setReactionFrame(null);
        setIsSpecialReaction(false);
        setStatus('idle');
        onInteractionStateChange?.(false);
        reactionMotion.setValue(0);
        reactionTimersRef.current = [];
        reactionAnimationRef.current = null;
      });
      return;
    }

    setStatus('released');
    reactionTimersRef.current.push(setTimeout(() => {
      setStatus('idle');
      onInteractionStateChange?.(false);
      resetExpression();
      reactionTimersRef.current = [];
    }, 550));
  }, [clearReactionTimers, enabled, haptics, mobbyId, onInteractionStateChange, onPull, onReaction, onValidRelease, reactionFrames, reactionMotion, resetExpression, scaleX, scaleY, specialMotion]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => enabled,
    onMoveShouldSetPanResponder: () => enabled,
    onPanResponderGrant: (event) => {
      clearReactionTimers();
      setReactionFrame(null);
      setIsSpecialReaction(false);
      specialMotion.setValue(0);
      scaleX.stopAnimation();
      scaleY.stopAnimation();
      setStatus('pulling');
      onInteractionStateChange?.(true);
      mediumThresholdRef.current = false;
      strongHapticRef.current = false;
      meshRef.current?.begin(event.nativeEvent.locationX / appScale, event.nativeEvent.locationY / appScale);
    },
    onPanResponderMove: (_event, gesture) => {
      const dx = Math.max(-64, Math.min(64, gesture.dx / appScale));
      const dy = Math.max(-50, Math.min(50, gesture.dy / appScale));
      scaleX.setValue(1 + Math.min(0.16, Math.abs(dx) / 430));
      scaleY.setValue(1 - Math.min(0.06, Math.abs(dx) / 1100));
      meshRef.current?.update(dx, dy);
      const magnitude = Math.hypot(dx, dy);
      if (magnitude >= 4) {
        haptics.threshold();
        if (!mediumThresholdRef.current) { mediumThresholdRef.current = true; haptics.medium(); }
      }
      if (magnitude >= Math.max(70, size * 0.16) && !strongHapticRef.current) { strongHapticRef.current = true; haptics.heavy(); }
      if (Math.hypot(dx, dy) >= 4) {
        const expression = selectPullExpression(pullAsset, dx, dy, size, sectorRef, strongRef);
        setEyeIndex(expression.eyeIndex);
        setMouthIndex(expression.mouthIndex);
      }
    },
    onPanResponderRelease: (_event, gesture) => release(gesture.dx / appScale, gesture.dy / appScale),
    onPanResponderTerminate: () => { meshRef.current?.release(); setStatus('idle'); onInteractionStateChange?.(false); resetExpression(); },
  }), [appScale, clearReactionTimers, enabled, haptics, onInteractionStateChange, pullAsset, release, resetExpression, scaleX, scaleY, size, specialMotion]);

  const triggerAccessibleReaction = useCallback(() => {
    const distance = Math.max(12, size * 0.08);
    release(distance, 0);
  }, [release, size]);

  const meshVisible = Platform.OS === 'web' && (status === 'pulling' || status === 'released');
  const isPullReaction = Boolean(reactionFrames && reactionFrame !== null);
  const defaultEye = pullAsset.defaultEye ?? pullAsset.eyes[0];
  const activeEye = eyeIndex >= 0 ? pullAsset.eyes[eyeIndex] ?? defaultEye : defaultEye;
  const activeMouth = mouthIndex >= 0 ? pullAsset.mouths[mouthIndex] : null;
  const eyeFrame = eyeIndex >= 0 ? pullAsset.eyeFrame : pullAsset.defaultEyeFrame ?? pullAsset.eyeFrame;
  const burstOpacity = reactionMotion.interpolate({ inputRange: [0, 0.03, 0.2, 0.21], outputRange: [0, 0.9, 0, 0] });
  const burstScale = reactionMotion.interpolate({ inputRange: [0, 0.2], outputRange: [0.45, 1.45], extrapolate: 'clamp' });
  const cheekEffectShift = reactionMotion.interpolate({ inputRange: [0.1, 0.17, 0.24, 0.3], outputRange: [0, -4, 3, 0], extrapolate: 'clamp' });
  const protestEffectShift = reactionMotion.interpolate({ inputRange: [0.29, 0.37, 0.45, 0.53], outputRange: [0, 8, -6, 0], extrapolate: 'clamp' });
  const sulkEffectDrop = reactionMotion.interpolate({ inputRange: [0.52, 0.68, 1], outputRange: [-5, 2, 5], extrapolate: 'clamp' });
  const singleEffectOpacity = reactionMotion.interpolate({ inputRange: [0, 0.08, 0.72, 1], outputRange: [0, 0.78, 0.62, 0], extrapolate: 'clamp' });
  const singleTranslateX = reactionMotion.interpolate({ inputRange: [0, 0.16, 0.32, 0.48, 0.68, 1], outputRange: [0, -4, 4, -3, 1, 0] });
  const singleTranslateY = reactionMotion.interpolate({ inputRange: [0, 0.14, 0.32, 0.72, 1], outputRange: [4, -4, 0, 2, 0] });
  const singleScaleX = reactionMotion.interpolate({ inputRange: [0, 0.12, 0.28, 1], outputRange: [0.95, 1.035, 1, 1] });
  const singleScaleY = reactionMotion.interpolate({ inputRange: [0, 0.12, 0.28, 1], outputRange: [0.91, 1.045, 1, 1] });
  const singleRotate = reactionMotion.interpolate({ inputRange: [0, 0.18, 0.36, 0.58, 1], outputRange: ['0deg', '-1.5deg', '1.5deg', '-0.7deg', '0deg'] });
  const activeReactionTranslateX = singleTranslateX;
  const activeReactionTranslateY = singleTranslateY;
  const activeReactionScaleX = singleScaleX;
  const activeReactionScaleY = singleScaleY;
  const activeReactionRotate = singleRotate;
  const pullableExtraHeight = size >= 300 ? 45 : 12;
  const specialPeakScale = size >= 300 ? 1.72 : 1.9;
  const specialHoldScale = size >= 300 ? 1.58 : 1.72;
  // The home character starts low in the room. During the large special
  // reaction, carry it toward the visual center instead of scaling in place.
  const specialLift = specialCentering ? -150 : (size >= 300 ? -38 : -30);
  const specialScale = specialMotion.interpolate({
    inputRange: [0, 0.16, 0.48, 0.62, 0.82, 0.9, 1],
    outputRange: [1, 0.9, specialPeakScale, specialPeakScale * 0.96, specialHoldScale, specialHoldScale, 1],
  });
  const specialTranslateX = specialMotion.interpolate({
    inputRange: [0, 0.42, 0.48, 0.54, 0.62, 0.7, 0.82, 1],
    outputRange: [0, 0, -10, 10, -7, 5, 0, 0],
  });
  const specialTranslateY = specialMotion.interpolate({
    inputRange: [0, 0.16, 0.48, 0.62, 0.82, 0.9, 1],
    outputRange: [0, 6, specialLift - 8, specialLift, specialLift, specialLift, 0],
  });
  const reactionEffectKind = !isSpecialReaction && reactionFrame !== null && reactionFrame < 4 ? reactionFrame : -1;
  return (
    <View style={[styles.pullableWrap, { width: size, height: size + pullableExtraHeight }]}>
      <Animated.View style={[styles.pullableStage, { width: size, height: size, transform: [{ translateX: specialTranslateX }, { translateY: specialTranslateY }, { scale: specialScale }] }]}>
        {onCharacterPickerPress ? <Pressable accessibilityRole="button" accessibilityLabel={`メインモビーを選ぶ（現在：${selectedMobbyName ?? selected.name}）`} onPress={onCharacterPickerPress} style={({ pressed }) => [styles.characterPickerButton, size >= 300 ? styles.characterPickerButtonLarge : styles.characterPickerButtonCompact, pressed && styles.characterPickerButtonPressed]}><ImageBackground source={UI_CREAM_BUTTON} resizeMode="stretch" style={styles.characterPickerButtonAsset}><Text style={styles.characterPickerCaption}>キャラ</Text><Text style={styles.characterPickerValue}>選択</Text></ImageBackground></Pressable> : null}
        <Animated.View {...panResponder.panHandlers} accessibilityRole="button" accessibilityLabel="モビーのほっぺを引っ張る" accessibilityHint="タップすると引っ張った時のリアクションをします" onAccessibilityTap={triggerAccessibleReaction} style={[styles.pullableSlot, { width: size, height: size, opacity: meshVisible || isPullReaction ? 0 : 1, transform: [{ scaleX }, { scaleY }] }]}>
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
        {reactionEffectKind === 0 ? <Animated.View pointerEvents="none" style={[styles.pullableReactionBurst, { opacity: burstOpacity, transform: [{ scale: burstScale }] }]} /> : null}
        {reactionEffectKind === 0 ? <View pointerEvents="none" style={styles.animeEffectLayer}>{Array.from({ length: 8 }, (_, index) => <Animated.View key={index} style={[styles.animeBurstRayWrap, { opacity: burstOpacity, transform: [{ rotate: `${index * 45}deg` }, { scale: burstScale }] }]}><View style={[styles.animeBurstRay, { height: size * 0.11, left: size / 2 - 1.5, top: size * 0.025 }]} /></Animated.View>)}</View> : null}
        {reactionEffectKind === 1 ? <Animated.View pointerEvents="none" style={[styles.animeEffectLayer, { opacity: singleEffectOpacity, transform: [{ translateX: cheekEffectShift }] }]}><View style={[styles.animeCheekTrail, styles.animeCheekTrailLeft]}><View style={[styles.animeCheekStroke, { width: size * 0.13 }]} /><View style={[styles.animeCheekStroke, { width: size * 0.09 }]} /><View style={[styles.animeCheekStroke, { width: size * 0.055 }]} /></View><View style={[styles.animeCheekTrail, styles.animeCheekTrailRight]}><View style={[styles.animeCheekStroke, { width: size * 0.13 }]} /><View style={[styles.animeCheekStroke, { width: size * 0.09 }]} /><View style={[styles.animeCheekStroke, { width: size * 0.055 }]} /></View></Animated.View> : null}
        {reactionEffectKind === 2 ? <Animated.View pointerEvents="none" style={[styles.animeEffectLayer, { opacity: singleEffectOpacity, transform: [{ translateX: protestEffectShift }] }]}><View style={[styles.animeSpeedGroup, styles.animeSpeedGroupLeft]}><View style={[styles.animeSpeedLine, { width: size * 0.16 }]} /><View style={[styles.animeSpeedLine, { width: size * 0.11 }]} /><View style={[styles.animeSpeedLine, { width: size * 0.07 }]} /></View><View style={[styles.animeSpeedGroup, styles.animeSpeedGroupRight]}><View style={[styles.animeSpeedLine, { width: size * 0.16 }]} /><View style={[styles.animeSpeedLine, { width: size * 0.11 }]} /><View style={[styles.animeSpeedLine, { width: size * 0.07 }]} /></View></Animated.View> : null}
        {reactionEffectKind === 3 ? <Animated.View pointerEvents="none" style={[styles.animeEffectLayer, { opacity: singleEffectOpacity, transform: [{ translateY: sulkEffectDrop }] }]}><View style={styles.animeGloomLines}><View style={styles.animeGloomLine} /><View style={[styles.animeGloomLine, styles.animeGloomLineShort]} /><View style={styles.animeGloomLine} /></View></Animated.View> : null}
        <ParticleBurst type={largeBurst ? 'star' : 'heart'} count={largeBurst ? 12 : 8} large={largeBurst} active={burstKey > 0} burstKey={burstKey} seed={`${selected.id}-${burstKey}`} style={styles.pullParticleBurst} />
      </Animated.View>
      {status !== 'idle' ? <View pointerEvents="none" style={styles.pullStatus}><Text style={styles.pullStatusText}>{status === 'pulling' ? 'のびてる……' : isSpecialReaction ? '10回目のスペシャル反応！' : 'びよーん！'}</Text></View> : null}
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

export function TouchScreen({ selected, onInteract, reaction, dailyHydrated = true, onDailyPullRelease, onDailyReaction }: { selected: Item; onInteract: (kind: string) => number; reaction: string; dailyHydrated?: boolean; onDailyPullRelease?: () => Promise<void>; onDailyReaction?: (reactionId: string) => void }) {
  return (
    <View style={styles.touchScreenBackground}>
      <View style={styles.touchScrollContent}>
      <View style={styles.touchTop}><View style={styles.touchTitleRow}><Text style={styles.bigTitle}>{selected.name}</Text><View style={[styles.rarityBadge, { backgroundColor: selected.accent }]}><Text style={styles.rarityBadgeText}>{selected.rarity}</Text></View></View></View>
      <View style={styles.touchStage}><PullableMobby selected={selected} onPull={() => onInteract('ほっぺ')} enabled={dailyHydrated} onValidRelease={onDailyPullRelease} onReaction={onDailyReaction} />{reaction ? <View style={styles.touchBubble}><Text style={styles.touchBubbleText}>{reaction}</Text></View> : null}<Text style={styles.touchHand}>☝</Text><View style={styles.touchHearts}><Text style={styles.touchHeart}>♥</Text><Text style={styles.touchHeart}>♥</Text><Text style={styles.touchHeart}>♥</Text></View></View>
      </View>
    </View>
  );
}


export type { Item, CollectibleVariant, MobbyTimeStage };
