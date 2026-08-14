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
import {
  ENEMIES,
  ENEMIES_IN_REVEAL_ORDER,
  ENEMY_CASE_BY_ID,
  ENEMY_CASES,
  PLAYABLE_ENEMY_CASES,
  getEnemyPublicDescriptor,
  isPlayableEnemyCase,
  type EnemyCase,
  type EnemyCaseId,
} from '@/data/enemyCases';
import { getIncidentComic, incidentComicId } from '@/data/incidentComics';
import { PULL_ASSETS, type MobbyPullAsset, type PullFrame } from '@/data/mobbyPullAssets';
import { useMobbyAudio } from '@/hooks/useMobbyAudio';
import { InvestigationScreen, type IncidentAllyActor, type InvestigationProgress } from '@/components/InvestigationScreen';
import { IncidentCutIn } from '@/components/IncidentCutIn';
import { IncidentResolutionOverlay } from '@/components/IncidentResolutionOverlay';
import {
  IncidentCasebookScreen,
  type IncidentCasebookActiveCase,
  type IncidentCasebookComicEntry,
  type IncidentCasebookEnemyEntry,
  type IncidentCasebookTab,
} from '@/components/IncidentCasebookScreen';
import { MIDNIGHT_DOUBLE_INCIDENT } from '@/data/incidentStory';
import {
  incidentAllyIds,
  restoreIncidentAllies,
  sanitizeIncidentHintLevels,
  selectIncidentAllies,
  type IncidentAllyCandidate,
  type IncidentAllySelection,
} from '@/domain/incidents/cast';
import {
  acknowledgeIncidentNotification,
  completeIncidentReturn as advanceIncidentReturn,
  createIncidentRunId,
  decodeIncidentStorage,
  dismissIncidentReward,
  freshIncidentStorage,
  markIncidentCaseIntroSeen,
  markOrganizationIntroSeen,
  selectIdentifiedEnemyIds,
  selectSolvedCaseIds,
  solveIncidentRun,
  startIncidentRun,
  updateIncidentProgress,
  type IncidentRewardResolver,
  type IncidentStorageCodec,
  type IncidentStorageV4,
} from '@/domain/incidents/archive';

type Screen = 'home' | 'collection' | 'time' | 'touch' | 'trade' | 'casebook' | 'investigation';
type ItemKind = 'ぬいキー' | 'ぬいぐるみ';
type CollectibleVariant = 'key-normal' | 'key-small' | 'plush';
type KeychainImageSize = 'normal' | 'small';
type CollectibleReward = { item: Item; variant: CollectibleVariant };
type MobbyTimeStage = 'arrived' | 'opening' | 'revealed' | 'placing' | 'placed';
type HomePlacementKind = 'wall' | 'shelf';
type OnboardingStep = 'none' | 'favorite' | 'mobbyTime' | 'opening' | 'place' | 'wallFlight' | 'home' | 'collection' | 'time' | 'trade';
type IncidentResolutionPhase = 'none' | 'returning' | 'resolved';

const DESIGN_WIDTH = 440;
const DESIGN_MIN_HEIGHT = 720;
const BOTTOM_NAV_CELLS = [
  { left: 4, width: 78 },
  { left: 90, width: 78 },
  { left: 176, width: 78 },
  { left: 262, width: 78 },
  { left: 348, width: 78 },
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
const TRADE_EXCHANGE_BOARD = require('../../assets/backgrounds/trade-exchange-board.png');
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
const EXCHANGE = require('../../assets/home-ui/icons/exchange.png');
const MOBBY_ICON = require('../../assets/home-ui/icons/mobby.png');
const FRIEND = require('../../assets/home-ui/icons/friend.png');
const MOBIYAN_LOADING = require('../../assets/loading/mobiyan-loading.webp');
const HOME_DECOR_PLANT = require('../../assets/furniture/plant-sage.png');
const HOME_DECOR_CUSHIONS = require('../../assets/furniture/cushion-pile.png');
const STORAGE_TUTORIAL_COMPLETE = '@mobby/tutorial-complete-v2';
const STORAGE_FAVORITE = '@mobby/favorite-v1';
const STORAGE_OWNED = '@mobby/owned-v2';
const STORAGE_OWNED_LEGACY = '@mobby/owned-v1';
const STORAGE_CASES = '@mobby/case-files-v2';
const FEATURED_INCIDENT_CASE_ID = 'case-04-magician';
const PLAYABLE_INCIDENT_CASE_IDS: ReadonlySet<string> = new Set(PLAYABLE_ENEMY_CASES.map((caseData) => caseData.id));
const INCIDENT_REWARD_RESOLVER: IncidentRewardResolver = {
  enemyIdForCase: (caseId) => ENEMY_CASE_BY_ID[caseId]?.revealEnemyId ?? null,
  comicIdForMobby: (mobbyId) => incidentComicId(mobbyId),
};
const INVESTIGATION_SCENES = ['arrival', 'evidence', 'link', 'deduction', 'contradiction', 'accuse', 'rebuttal', 'confession'] as const;
const DEFAULT_INVESTIGATION_PROGRESS: InvestigationProgress = {
  scene: 'arrival',
  storySceneId: MIDNIGHT_DOUBLE_INCIDENT.sceneIds[0] ?? 'alert',
  evidenceIndex: 0,
  completedInteractionIds: [],
  discoveredFactIds: [],
  accusationAnswers: {},
  accusationIndex: 0,
  attempts: 0,
};

function freshDefaultInvestigationProgress(): InvestigationProgress {
  return {
    ...DEFAULT_INVESTIGATION_PROGRESS,
    completedInteractionIds: [],
    discoveredFactIds: [],
    accusationAnswers: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function uniqueAllowedStrings(value: unknown, allowed: ReadonlySet<string>): string[] | null {
  if (!Array.isArray(value)) return null;
  const result: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || !allowed.has(entry)) return null;
    if (!result.includes(entry)) result.push(entry);
  }
  return result;
}

function sameOrderedValues(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function sanitizeInvestigationProgress(value: unknown, migrateV2Hints = false): InvestigationProgress | null {
  if (!isRecord(value)) return null;
  const scene = typeof value.scene === 'string' && (INVESTIGATION_SCENES as readonly string[]).includes(value.scene)
    ? value.scene as InvestigationProgress['scene']
    : null;
  const evidenceIndex = Number.isInteger(value.evidenceIndex) && Number(value.evidenceIndex) >= 0 && Number(value.evidenceIndex) <= 2 ? Number(value.evidenceIndex) : null;
  const accusationIndex = Number.isInteger(value.accusationIndex) && Number(value.accusationIndex) >= 0 && Number(value.accusationIndex) <= 2
    ? Number(value.accusationIndex)
    : null;
  const attempts = Number.isInteger(value.attempts) && Number(value.attempts) >= 0 ? Number(value.attempts) : null;
  if (!scene || evidenceIndex === null || accusationIndex === null || attempts === null) return null;
  const story = MIDNIGHT_DOUBLE_INCIDENT;
  const storyScene = typeof value.storySceneId === 'string' ? story.scenes.find((candidate) => candidate.id === value.storySceneId) : undefined;
  if (!storyScene) return null;
  const interactionOrder = story.interactions.map((interaction) => interaction.id);
  const factOrder = story.interactions.map((interaction) => interaction.successFactId);
  const interactionIds = uniqueAllowedStrings(value.completedInteractionIds, new Set(interactionOrder));
  const factIds = uniqueAllowedStrings(value.discoveredFactIds, new Set(Object.keys(story.facts)));
  if (!interactionIds || !factIds) return null;
  if (!sameOrderedValues(interactionIds, interactionOrder.slice(0, interactionIds.length))) return null;
  if (!sameOrderedValues(factIds, factOrder.slice(0, factIds.length)) || factIds.length !== interactionIds.length) return null;
  const contradictionChoices = new Set(story.contradiction.choices.map((choice) => choice.id));
  const contradictionChoiceId = value.contradictionChoiceId === undefined
    ? undefined
    : typeof value.contradictionChoiceId === 'string' && contradictionChoices.has(value.contradictionChoiceId)
      ? value.contradictionChoiceId
      : null;
  if (contradictionChoiceId === null) return null;

  if (!isRecord(value.accusationAnswers)) return null;
  const questionIds = new Set<string>(story.accusation.map((question) => question.id));
  if (Object.keys(value.accusationAnswers).some((key) => !questionIds.has(key))) return null;
  const accusationAnswers: InvestigationProgress['accusationAnswers'] = {};
  for (const question of story.accusation) {
    const answer = value.accusationAnswers[question.id];
    if (answer === undefined) continue;
    const correctOption = question.options.find((option) => option.correct);
    if (typeof answer !== 'string' || answer !== correctOption?.id) return null;
    accusationAnswers[question.id] = answer;
  }
  const answeredCount = story.accusation.filter((question) => accusationAnswers[question.id] !== undefined).length;
  const answeredPrefix = story.accusation.slice(0, answeredCount).every((question) => accusationAnswers[question.id] !== undefined);
  if (!answeredPrefix) return null;
  const progressKeys = new Set<string>([...interactionOrder, 'contradiction', ...story.accusation.map((question) => question.id)]);
  const sanitizeCounters = (raw: unknown) => {
    if (raw === undefined) return {};
    if (!isRecord(raw) || Object.keys(raw).some((key) => !progressKeys.has(key))) return null;
    const result: Record<string, number> = {};
    for (const [key, entry] of Object.entries(raw)) {
      if (!Number.isInteger(entry) || Number(entry) < 0) return null;
      result[key] = Number(entry);
    }
    return result;
  };
  const hintLevels = sanitizeIncidentHintLevels(value.hintLevels, progressKeys, migrateV2Hints);
  const interactionAttempts = sanitizeCounters(value.interactionAttempts);
  if (!hintLevels || !interactionAttempts) return null;
  const inspectableTargets: Record<string, ReadonlySet<string>> = {
    'clock-inspection': new Set(['hands', 'back']),
    'projection-comparison': new Set(),
    'corridor-search': new Set(['window', 'footprints', 'service-box']),
  };
  const inspectedTargetIds: Record<string, string[]> = {};
  if (value.inspectedTargetIds !== undefined) {
    const interactionIdSet = new Set<string>(interactionOrder);
    if (!isRecord(value.inspectedTargetIds) || Object.keys(value.inspectedTargetIds).some((key) => !interactionIdSet.has(key))) return null;
    for (const [key, entry] of Object.entries(value.inspectedTargetIds)) {
      const ids = uniqueAllowedStrings(entry, inspectableTargets[key] ?? new Set());
      if (!ids) return null;
      inspectedTargetIds[key] = ids;
    }
  }
  const expectedScene: InvestigationProgress['scene'] = storyScene.kind === 'inspection' ? 'evidence'
    : storyScene.id === 'contradiction' ? 'contradiction'
      : storyScene.kind === 'deduction' ? 'deduction'
        : storyScene.kind === 'accusation' ? 'accuse'
          : storyScene.kind === 'rescue' ? 'confession'
            : storyScene.id === 'confrontation' ? 'link' : 'arrival';
  if (scene !== expectedScene && !(storyScene.kind === 'accusation' && scene === 'rebuttal')) return null;
  const requiredEvidenceCount: Record<string, number> = { alert: 0, briefing: 0, clock: 0, projection: 1, sabotage: 2, corridor: 2, memo: 3, contradiction: 3, confrontation: 3, accusation: 3, proof: 3, rescue: 3 };
  const requiredCount = requiredEvidenceCount[storyScene.id];
  if (requiredCount === undefined || interactionIds.length < requiredCount) return null;
  if (storyScene.kind !== 'inspection' && interactionIds.length !== requiredCount) return null;
  if (storyScene.id === 'clock' && interactionIds.length > 1) return null;
  if (storyScene.id === 'projection' && interactionIds.length > 2) return null;
  if (storyScene.id === 'corridor' && interactionIds.length > 3) return null;
  const expectedEvidenceIndex = storyScene.interactionId ? story.interactions.findIndex((item) => item.id === storyScene.interactionId) : 0;
  if (evidenceIndex !== expectedEvidenceIndex) return null;
  const contradictionSolved = contradictionChoiceId === story.contradiction.correctChoiceId;
  if (storyScene.order < 7 && contradictionChoiceId !== undefined) return null;
  if (storyScene.order < 9 && answeredCount !== 0) return null;
  if (['confrontation', 'accusation', 'proof', 'rescue'].includes(storyScene.id) && !contradictionSolved) return null;
  if (storyScene.id === 'accusation' && answeredCount !== accusationIndex) return null;
  if (['proof', 'rescue'].includes(storyScene.id) && (answeredCount !== story.accusation.length || accusationIndex !== story.accusation.length - 1)) return null;

  return {
    scene: scene === 'rebuttal' ? 'accuse' : scene,
    storySceneId: storyScene.id,
    evidenceIndex,
    completedInteractionIds: interactionIds as InvestigationProgress['completedInteractionIds'],
    discoveredFactIds: factIds as InvestigationProgress['discoveredFactIds'],
    contradictionChoiceId,
    accusationAnswers,
    accusationIndex,
    attempts,
    hintLevels,
    interactionAttempts,
    inspectedTargetIds,
  };
}
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

function preferredOwnedVariant(owned: Record<string, number>, item: Item): CollectibleVariant {
  const legacyVariant = legacyVariantForItem(item);
  if (ownedCollectibleCount(owned, item.id, legacyVariant) > 0) return legacyVariant;
  return COLLECTIBLE_VARIANTS.find((variant) => ownedCollectibleCount(owned, item.id, variant) > 0) ?? legacyVariant;
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

function ownsAnyCollectible(owned: Record<string, number>, itemId: string) {
  return COLLECTIBLE_VARIANTS.some((variant) => ownedCollectibleCount(owned, itemId, variant) > 0);
}

function isValidIncidentTarget(owned: Record<string, number>, itemId: string) {
  return ITEMS.some((item) => item.id === itemId)
    && ownedCollectibleCount(owned, itemId, 'key-normal') + ownedCollectibleCount(owned, itemId, 'key-small') > 0;
}

function buildIncidentAllyCandidates(
  owned: Record<string, number>,
  wallItemIds: readonly string[],
  plushItemIds: readonly string[],
): IncidentAllyCandidate[] {
  const visiblePlushIds = plushItemIds.filter((id) => ownedCollectibleCount(owned, id, 'plush') > 0).slice(0, 4);
  const visibleIds = new Set([
    ...wallItemIds.filter((id) => ownedCollectibleCount(owned, id, 'key-normal') + ownedCollectibleCount(owned, id, 'key-small') > 0),
    ...visiblePlushIds,
  ]);
  const orderedItemIds = [...visibleIds, ...ITEMS.map((item) => item.id).filter((id) => !visibleIds.has(id))];
  return orderedItemIds.flatMap((itemId) => {
    const item = ITEMS.find((candidate) => candidate.id === itemId);
    const mobbyId = ITEM_MOBBY_IDS[itemId];
    if (!item || !mobbyId) return [];
    return [{
      itemId,
      mobbyId,
      name: itemCharacterName(item),
      image: item.image,
      owned: ownsAnyCollectible(owned, itemId),
      homeVisible: visibleIds.has(itemId),
    }];
  });
}

function createIncidentStorageCodec(
  owned: Record<string, number>,
  wallItemIds: readonly string[],
  plushItemIds: readonly string[],
): IncidentStorageCodec<InvestigationProgress> {
  const candidates = buildIncidentAllyCandidates(owned, wallItemIds, plushItemIds);
  return {
    caseIds: new Set(ENEMY_CASES.map((caseData) => caseData.id)),
    playableCaseIds: PLAYABLE_INCIDENT_CASE_IDS,
    enemyIds: new Set(ENEMIES.map((enemy) => enemy.id)),
    mobbyIds: new Set(Object.values(ITEM_MOBBY_IDS)),
    enemyIdForCase: (caseId) => ENEMY_CASE_BY_ID[caseId]?.revealEnemyId ?? null,
    comicIdForMobby: (mobbyId) => incidentComicId(mobbyId),
    mobbyIdForTargetItem: (itemId) => ITEM_MOBBY_IDS[itemId] ?? null,
    isValidTargetItem: (itemId) => isValidIncidentTarget(owned, itemId),
    sanitizeAllies: (value, targetItemId) => {
      const restored = restoreIncidentAllies(value, candidates, targetItemId);
      return restored ? incidentAllyIds(restored) : null;
    },
    sanitizeProgress: (value) => sanitizeInvestigationProgress(value),
  };
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
  onOpenTrade,
  onOpenInvestigation,
  hasUnresolvedIncident,
  incidentNotificationPending,
}: {
  onClose: () => void;
  onOpenMobbyTime: () => void;
  onOpenCollection: () => void;
  onOpenTrade: () => void;
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

        <Pressable accessibilityRole="button" accessibilityLabel="トレードのお知らせを開く" onPress={onOpenTrade} style={({ pressed }) => [styles.notificationItem, pressed && styles.notificationItemPressed]}><ImageBackground source={UI_WIDE_PAPER} resizeMode="stretch" style={styles.notificationItemPaper}>
          <View style={[styles.notificationIcon, styles.notificationIconTrade]}><Text style={styles.notificationIconText}>♧</Text></View>
          <View style={styles.notificationCopy}>
            <Text style={styles.notificationKicker}>交換</Text>
            <Text style={styles.notificationItemTitle}>フレンドと交換しよう</Text>
            <Text style={styles.notificationItemBody}>MOBBY TIME中は交換チャンス！</Text>
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
  home: { step: '1 / 4', title: 'ホーム：モビーと部屋で遊ぶ', body: 'メインモビーを引っ張ると表情・セリフ・リアクションが変化。壁のぬいキーはなぞって揺らせて、「編集」から並べ替えできます。', action: 'コレクションへ', navIndex: 0 },
  collection: { step: '2 / 4', title: 'コレクション：集めたグッズを見る', body: 'ぬいキー／ぬいぐるみを切り替えて一覧を確認。ぬいキーは通常・Sサイズを選べ、指で触れると揺れて音が鳴ります。', action: 'MOBBY TIMEへ', navIndex: 1 },
  time: { step: '3 / 4', title: 'MOBBY TIME：新しいグッズと出会う', body: '届いた箱を開けてグッズを獲得し、ホームへ飾る場所。開催中は残り時間もここで確認できます。', action: 'TRADEへ', navIndex: 2 },
  trade: { step: '4 / 4', title: 'TRADE：友達とグッズを交換', body: '交換したいグッズを選び、QRを見せ合って交換します。ホームではモビーを引っ張って遊べます。', action: '遊び始める', navIndex: 3 },
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

function HomeScreen({
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
}) {
  const { height: appHeight, scale: appScale } = useAppLayout();
  const compactViewport = appHeight < 780;
  const [roomSize, setRoomSize] = useState({ width: 0, height: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editSelection, setEditSelection] = useState<{ kind: HomePlacementKind; index: number; itemId: string } | null>(null);
  const [editFeedback, setEditFeedback] = useState('');
  const wallTileFrames = useRef<Record<string, TileFrame>>({});
  const wallTileSwings = useRef<Record<string, KeychainSwing>>({});
  const wallTouchedTiles = useRef(new Set<string>());
  const wallPreviousPoint = useRef<Point | null>(null);
  const wallPointerActive = useRef(false);
  const wallMouseActive = useRef(false);
  const wallGridOrigin = useRef<Point>({ x: 0, y: 0 });
  const wallGridRef = useRef<View>(null);
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
        <View pointerEvents="none" style={styles.homeDecorPlant}><Image source={HOME_DECOR_PLANT} resizeMode="contain" style={styles.homeDecorAsset} /></View>
        <View pointerEvents="none" style={styles.homeDecorCushions}><Image source={HOME_DECOR_CUSHIONS} resizeMode="contain" style={styles.homeDecorAsset} /></View>
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
            <PullableMobby selected={selected} selectedMobbyName={selectedMobby.name} onCharacterPickerPress={toggleCharacterPicker} specialCentering size={compactViewport ? 178 : 220} onPull={() => onInteract('ほっぺ')} />
          </View>
        )}
        {!isEditing && reaction ? <View pointerEvents="none" style={[styles.homeReactionBubble, { top: shelfSurfaceY + 4 }]}><View style={styles.homeReactionTailBorder} /><View style={styles.homeReactionTail} /><Text style={styles.homeReactionBubbleText}>{reaction}</Text></View> : null}
        {isEditing ? <View style={styles.homeEditGuide}><Text style={styles.homeEditGuideTitle}>お部屋を編集</Text><Text style={styles.homeEditGuideText}>{editInstruction}</Text></View> : null}
      </View>
    </View>
  );
}

function WallPlacementFlight({ item, variant, onComplete }: { item: Item; variant: Exclude<CollectibleVariant, 'plush'>; onComplete: () => void }) {
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

function CollectionScreen({ items, owned, selectedId, onSelect, onKeychainSwing }: { items: Item[]; owned: Record<string, number>; selectedId: string; onSelect: (id: string) => void; onKeychainSwing: () => void }) {
  const { height: appHeight } = useAppLayout();
  const [mode, setMode] = useState<ItemKind>('ぬいキー');
  const [keyImageSize, setKeyImageSize] = useState<KeychainImageSize>('normal');
  const visibleItems = items;
  const slotCount = 9;
  const displayItems: (Item | null)[] = [...visibleItems, ...Array.from({ length: Math.max(0, slotCount - visibleItems.length) }, () => null)];
  const boardHeight = Math.min(640, Math.max(420, appHeight - 302));
  return (
    <View style={styles.collectionScreenBackground}>
      <View style={styles.collectionScrollContent}>
      <View pointerEvents="none" style={[styles.collectionBoardShadow, { height: boardHeight - 10 }]} />
      <Image source={COLLECTION_DISPLAY_BOARD} resizeMode="stretch" style={[styles.collectionDisplayBoard, { height: boardHeight }]} />
      <View style={styles.collectionHeaderBar}>
        <ImageBackground source={UI_WIDE_PAPER} resizeMode="stretch" style={styles.collectionHeaderCopy}><Text style={styles.collectionHeaderTitle}>集めたモビー</Text></ImageBackground>
        <ImageBackground source={UI_WIDE_PAPER} resizeMode="stretch" style={styles.collectionModeTabs} imageStyle={styles.panelStretchImage}><Pressable onPress={() => setMode('ぬいキー')} style={[styles.collectionModeTab, styles.pressableFocusReset, mode === 'ぬいキー' && styles.collectionModeTabActive]}><Text style={[styles.collectionModeText, mode === 'ぬいキー' && styles.collectionModeTextActive]}>ぬいキー</Text></Pressable><Pressable onPress={() => setMode('ぬいぐるみ')} style={[styles.collectionModeTab, styles.pressableFocusReset, mode === 'ぬいぐるみ' && styles.collectionModeTabActive]}><Text style={[styles.collectionModeText, mode === 'ぬいぐるみ' && styles.collectionModeTextActive]}>ぬいぐるみ</Text></Pressable></ImageBackground>
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
                style={[styles.plushCollectionItem, getPlushCollectionPlacement(index, boardHeight)]}
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
      </View>
    </View>
  );
}

function MobbyTimeScreen({ today, todayVariant, stage, onOpen, onReveal, onPlace, onPlaced, onTrade, secondsLeft }: { today: Item; todayVariant: CollectibleVariant; stage: MobbyTimeStage; onOpen: () => void; onReveal: () => void; onPlace: () => void; onPlaced: () => void; onTrade: () => void; secondsLeft: number }) {
  const { width: appWidth, height: appHeight } = useAppLayout();
  const [headerHeight, setHeaderHeight] = useState(110);
  const active = secondsLeft > 0;
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
      return;
    }
    const runId = ++openingRunRef.current;
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.sequence([
          // Keep the package closed for three full left/right shakes before
          // the reveal callback swaps in the opened box and reward.
          Animated.timing(packageMotion, { toValue: 1, duration: 180, useNativeDriver: true }),
          Animated.timing(packageMotion, { toValue: -1, duration: 180, useNativeDriver: true }),
          Animated.timing(packageMotion, { toValue: 1, duration: 160, useNativeDriver: true }),
          Animated.timing(packageMotion, { toValue: -1, duration: 160, useNativeDriver: true }),
          Animated.timing(packageMotion, { toValue: 1, duration: 140, useNativeDriver: true }),
          Animated.timing(packageMotion, { toValue: -1, duration: 140, useNativeDriver: true }),
          Animated.timing(packageMotion, { toValue: 0, duration: 140, useNativeDriver: true }),
        ]),
        Animated.timing(magicGlow, { toValue: 1, duration: 1050, useNativeDriver: true }),
      ]),
      Animated.delay(950),
    ]);
    animation.start(({ finished }) => {
      if (finished && openingRunRef.current === runId) onRevealRef.current();
    });
    return () => {
      if (openingRunRef.current === runId) openingRunRef.current += 1;
      animation.stop();
    };
  }, [magicGlow, opening, packageMotion]);

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
    if (!active || opening) return;
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
  const openButtonLabel = !active ? 'また明日会おう' : opening ? '開封中…' : '箱をタップして開封しよう';
  return (
    <View style={styles.timeScrollContent}>
      <View onLayout={handleHeaderLayout} style={styles.timeHeader}><Text style={styles.timeTitle}>{active ? 'MOBBY TIME' : 'また明日'}</Text><Text style={styles.timeHeaderSub}>今日のモビーが会いにきたよ</Text><ImageBackground source={MOBBY_TIME_TIMER_PLAQUE} resizeMode="contain" style={styles.bigTimer}><Text style={styles.bigTimerLabel}>{active ? 'あと' : '次回まで'}</Text><Text style={styles.bigTimerValue}>{active ? `${minutes}:${seconds}` : '明日'}</Text></ImageBackground></View>
      <View style={{ width: encounterBoardBaseWidth * encounterBoardScale, height: encounterBoardBaseHeight * encounterBoardScale }}>
      <ImageBackground source={MOBBY_TIME_BOARD} resizeMode="stretch" style={[styles.encounterCard, { width: encounterBoardBaseWidth, height: encounterBoardBaseHeight, transform: [{ scale: encounterBoardScale }], transformOrigin: 'top left' }]} imageStyle={styles.encounterCardImage}>
        <View style={styles.arrivalNotice}><Text style={styles.arrivalNoticeText}>{active ? '箱を開けて、今日の子に会おう' : '今日のMOBBY TIMEはおしまい'}</Text></View>
        <View style={styles.encounterScene}>
          {!revealed ? (
            <Animated.View style={[styles.packageAnimationWrap, packageTransform]}>
            <Pressable accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onPress={startOpening} disabled={!active || opening} style={({ pressed }) => [styles.mobbyPackage, pressed && styles.packagePressed]}>
              <Image source={MOBBY_TIME_PACKAGE} resizeMode="contain" style={styles.packageAsset} />
              {!opening ? <View pointerEvents="none" style={styles.packageBrandOverlay}><Text style={styles.packageLogo}>MOBBY</Text><Text style={styles.packageHint}>TAP TO OPEN</Text></View> : null}
            </Pressable>
            </Animated.View>
          ) : <>
            {!placing && !placed ? <Image source={MOBBY_TIME_OPENED_BOX} resizeMode="contain" style={styles.encounterOpenedBox} /> : null}
            <Animated.View style={[styles.encounterRewardWrap, { transform: placing ? [{ translateY: placementMotion.interpolate({ inputRange: [0, 1], outputRange: [-20, placementDistance] }) }, { scale: placementMotion.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 1.16, 0.86] }) }, { rotate: placementMotion.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '-5deg', '0deg'] }) }] : placed ? [{ scale: revealMotion }] : [{ translateY: -20 }, { scale: revealMotion }] }]}><Image source={rewardImage} resizeMode="contain" style={[styles.encounterKeyImage, todayVariant === 'key-small' && styles.encounterSmallKeyImage, todayVariant === 'plush' && styles.encounterPlushImage]} /></Animated.View>
          </>}
          {opening ? <View pointerEvents="none" style={styles.magicParticles}><Text style={styles.magicParticle}>✦</Text><Text style={styles.magicParticle}>✧</Text><Text style={styles.magicParticle}>✦</Text><Text style={styles.magicParticle}>✧</Text></View> : null}
          {placing ? <Animated.View pointerEvents="none" style={[styles.placementSparkles, { opacity: placementBurst }]}><Text style={styles.placementSparkle}>✦</Text><Text style={styles.placementSparkle}>✧</Text><Text style={styles.placementSparkle}>★</Text><Text style={styles.placementSparkle}>✦</Text><Text style={styles.placementSparkle}>✧</Text></Animated.View> : null}
          <ImageBackground source={MOBBY_TIME_MESSAGE_PLAQUE} resizeMode="contain" style={styles.encounterBubble}><Text style={styles.encounterBubbleTitle}>{!active ? 'また明日' : placed ? '飾ったよ' : placing ? `${placement}へ移動中` : revealed ? rewardName : opening ? 'もうすぐ会えるよ' : '箱をタップ'}</Text><Text style={styles.encounterBubbleText}>{!active ? '次のMOBBY TIMEを待ってね' : placed ? `${collectibleVariantLabel(todayVariant)}が${placement}に仲間入り` : placing ? '大切に飾っています' : revealed ? `今日の${collectibleVariantLabel(todayVariant)}` : opening ? 'なにが入っているかな' : '開封しよう'}</Text></ImageBackground>
          {revealed && !placed && !placing ? <ImageBackground source={MOBBY_TIME_REWARD_SEAL} resizeMode="contain" style={styles.newBadge}><Text style={styles.newBadgeText}>NEW!</Text></ImageBackground> : null}
        </View>
        {!revealed ? <Pressable accessibilityRole="button" accessibilityLabel={openButtonLabel} accessibilityState={{ disabled: !active || opening }} disabled={!active || opening} onPress={startOpening} style={({ pressed }) => [styles.encounterOpenButton, (!active || opening) && styles.encounterOpenButtonDisabled, pressed && styles.encounterOpenButtonPressed]}><ImageBackground source={UI_CORAL_BUTTON} resizeMode="stretch" style={styles.encounterOpenButtonAsset}><Text style={styles.encounterOpenButtonText}>{openButtonLabel}</Text></ImageBackground></Pressable> : null}
        {revealed ? <Pressable accessibilityRole="button" accessibilityLabel={placed ? '残り時間で友達と交換' : `${placement}に追加する`} onPress={placed ? onTrade : onPlace} disabled={!active || placing} style={({ pressed }) => [styles.timePrimaryButton, (!active || placing) && styles.timePrimaryButtonInactive, pressed && styles.pressed]}><ImageBackground source={UI_CREAM_BUTTON} resizeMode="stretch" style={styles.assetButtonInner}><Image source={placed ? EXCHANGE : MOBBY_ICON} resizeMode="contain" style={styles.primaryButtonIcon} /><Text style={[styles.primaryButtonText, styles.timePrimaryButtonText]}>{placed ? '残り時間で友達と交換' : placing ? `${placement}へ飾り付け中…` : `${placement}に追加する`}</Text></ImageBackground></Pressable> : <View style={styles.packageCaptionSpacer} />}
      </ImageBackground>
      </View>
    </View>
  );
}

function PullableMobby({ selected, onPull, size = 320, onCharacterPickerPress, selectedMobbyName, specialCentering = false }: { selected: Item; onPull: () => number; size?: number; onCharacterPickerPress?: () => void; selectedMobbyName?: string; specialCentering?: boolean }) {
  const { scale: appScale } = useAppLayout();
  const mobbyId = itemMobbyId(selected.id);
  const pullAsset = PULL_ASSETS[mobbyId];
  const reactionFrames = PULL_REACTION_FRAMES[mobbyId];
  const [status, setStatus] = useState<'idle' | 'pulling' | 'released' | 'reacting'>('idle');
  const [reactionFrame, setReactionFrame] = useState<number | null>(null);
  const [isSpecialReaction, setIsSpecialReaction] = useState(false);
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
    if (Math.hypot(dx, dy) < 4) {
      setStatus('idle');
      return;
    }
    meshRef.current?.release();
    const pullCount = onPull();
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

      if (pullCount > 0 && pullCount % 10 === 0) {
        const specialFrame = reactionFrames.length >= 20 ? 19 : reactionFrames.length - 1;
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
  }, [clearReactionTimers, onPull, reactionFrames, reactionMotion, resetExpression, scaleX, scaleY, specialMotion]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      clearReactionTimers();
      setReactionFrame(null);
      setIsSpecialReaction(false);
      specialMotion.setValue(0);
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
  }), [appScale, clearReactionTimers, pullAsset, release, scaleX, scaleY, size, specialMotion]);

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

function TouchScreen({ selected, onInteract, reaction }: { selected: Item; onInteract: (kind: string) => number; reaction: string }) {
  return (
    <View style={styles.touchScreenBackground}>
      <View style={styles.touchScrollContent}>
      <View style={styles.touchTop}><View style={styles.touchTitleRow}><Text style={styles.bigTitle}>{selected.name}</Text><View style={[styles.rarityBadge, { backgroundColor: selected.accent }]}><Text style={styles.rarityBadgeText}>{selected.rarity}</Text></View></View></View>
      <View style={styles.touchStage}><PullableMobby selected={selected} onPull={() => onInteract('ほっぺ')} />{reaction ? <View style={styles.touchBubble}><Text style={styles.touchBubbleText}>{reaction}</Text></View> : null}<Text style={styles.touchHand}>☝</Text><View style={styles.touchHearts}><Text style={styles.touchHeart}>♥</Text><Text style={styles.touchHeart}>♥</Text><Text style={styles.touchHeart}>♥</Text></View></View>
      </View>
    </View>
  );
}

function TradeCharacterPicker({
  items,
  owned,
  selectedId,
  variant,
  onVariantChange,
  onSelect,
  onCancel,
  onConfirm,
}: {
  items: Item[];
  owned: Record<string, number>;
  selectedId: string;
  variant: CollectibleVariant;
  onVariantChange: (variant: CollectibleVariant) => void;
  onSelect: (id: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { height: appHeight } = useAppLayout();
  const boardHeight = Math.min(640, Math.max(420, appHeight - 302));
  const displayItems: (Item | null)[] = [...items, ...Array.from({ length: Math.max(0, 9 - items.length) }, () => null)];
  const selected = items.find((item) => item.id === selectedId);
  const canConfirm = Boolean(selected && ownedCollectibleCount(owned, selected.id, variant) > 0);

  return (
    <View style={styles.tradeSelectionScreen}>
      <View pointerEvents="none" style={[styles.collectionBoardShadow, { height: boardHeight - 10 }]} />
      <Image source={COLLECTION_DISPLAY_BOARD} resizeMode="stretch" style={[styles.collectionDisplayBoard, { height: boardHeight }]} />
      <View style={styles.collectionHeaderBar}>
        <ImageBackground source={UI_WIDE_PAPER} resizeMode="stretch" style={[styles.collectionHeaderCopy, styles.tradeSelectionHeaderCopy]}><Text numberOfLines={1} style={[styles.collectionHeaderTitle, styles.tradeSelectionHeaderTitle]}>交換する子を選ぶ</Text></ImageBackground>
        <ImageBackground source={UI_WIDE_PAPER} resizeMode="stretch" style={styles.collectionModeTabs} imageStyle={styles.panelStretchImage}>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: variant === 'key-normal' }} accessibilityLabel="通常サイズのぬいキーから選ぶ" onPress={() => onVariantChange('key-normal')} style={[styles.collectionModeTab, styles.pressableFocusReset, styles.tradeVariantTab, variant === 'key-normal' && styles.collectionModeTabActive]}><Text style={[styles.collectionModeText, styles.tradeVariantTabText, variant === 'key-normal' && styles.collectionModeTextActive]}>キー通常</Text></Pressable>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: variant === 'key-small' }} accessibilityLabel="Sサイズのぬいキーから選ぶ" onPress={() => onVariantChange('key-small')} style={[styles.collectionModeTab, styles.pressableFocusReset, styles.tradeVariantTab, variant === 'key-small' && styles.collectionModeTabActive]}><Text style={[styles.collectionModeText, styles.tradeVariantTabText, variant === 'key-small' && styles.collectionModeTextActive]}>キーS</Text></Pressable>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: variant === 'plush' }} accessibilityLabel="ぬいぐるみから選ぶ" onPress={() => onVariantChange('plush')} style={[styles.collectionModeTab, styles.pressableFocusReset, styles.tradeVariantTab, variant === 'plush' && styles.collectionModeTabActive]}><Text style={[styles.collectionModeText, styles.tradeVariantTabText, variant === 'plush' && styles.collectionModeTextActive]}>ぬいぐるみ</Text></Pressable>
        </ImageBackground>
      </View>
      <View style={[styles.tradeSelectionDisplay, { height: COLLECTION_BOARD_TOP + boardHeight }]}>
        {displayItems.map((item, index) => {
          const row = Math.floor(index / 3);
          const column = index % 3;
          const plushPlacement = getPlushCollectionPlacement(index, boardHeight);
          const placement = variant !== 'plush'
            ? { left: COLLECTION_COLUMN_X[column] - 48, top: COLLECTION_BOARD_TOP + COLLECTION_KEY_ROW_RATIOS[row] * boardHeight - 2 }
            : { left: plushPlacement.left - 4, top: plushPlacement.top - 3 };
          const isOwned = Boolean(item && ownedCollectibleCount(owned, item.id, variant) > 0);
          const isSelected = Boolean(item && isOwned && item.id === selectedId);
          const name = item ? item.name.replace(' ぬいキー', '').replace(' ぬい', '') : '未発見';
          return (
            <Pressable
              key={`trade-${variant}-${item?.id ?? 'locked'}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={item ? `${name}の${collectibleVariantLabel(variant)}を選ぶ` : '未発見のモビー'}
              accessibilityState={{ selected: isSelected, disabled: !isOwned }}
              disabled={!isOwned}
              onPress={() => item && onSelect(item.id)}
              style={({ pressed }) => [styles.tradeCollectionItem, placement, isSelected && styles.tradeCollectionItemSelected, pressed && styles.tradeCollectionItemPressed]}
            >
              <View style={styles.tradeCollectionVisual}>
                {item && isOwned ? (
                  variant !== 'plush'
                    ? <Image source={collectibleImage(item, variant)} resizeMode="contain" style={[styles.tradeCollectionKeyImage, variant === 'key-small' && styles.tradeCollectionSmallKeyImage]} />
                    : <Image source={item.image} resizeMode="contain" style={[styles.tradeCollectionPlushImage, { bottom: getPlushCollectionImageBottom(item) }]} />
                ) : <Text style={styles.tradeCollectionLockedMark}>?</Text>}
              </View>
              <Text style={[styles.tradeCollectionName, !isOwned && styles.tradeCollectionNameLocked]} numberOfLines={1}>{item ? name : '未発見'}</Text>
              {isSelected ? <ImageBackground source={MOBBY_TIME_REWARD_SEAL} resizeMode="contain" style={styles.tradeCollectionMarker}><Text style={styles.tradeCollectionMarkerText}>✓</Text></ImageBackground> : null}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.tradeSelectionActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="交換画面に戻る" onPress={onCancel} style={({ pressed }) => [styles.tradeSelectionBackButton, pressed && styles.tradeButtonPressed]}><ImageBackground source={UI_CREAM_BUTTON} resizeMode="stretch" style={styles.assetButtonInner}><Text style={styles.tradeSelectionBackText}>戻る</Text></ImageBackground></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={selected ? `${itemCharacterName(selected)}の${collectibleVariantLabel(variant)}を交換に決定` : '交換するキャラを決定'} accessibilityState={{ disabled: !canConfirm }} disabled={!canConfirm} onPress={onConfirm} style={({ pressed }) => [styles.tradeSelectionConfirmButton, !canConfirm && styles.tradeSelectionConfirmButtonDisabled, pressed && styles.tradeButtonPressed]}><ImageBackground source={UI_CORAL_BUTTON} resizeMode="stretch" style={styles.assetButtonInner}><Text style={styles.tradeSelectionConfirmText}>このキャラを交換</Text></ImageBackground></Pressable>
      </View>
    </View>
  );
}

function QrCode() {
  const cellSize = 3.65;
  return <View style={styles.qrCode}>{QR_PATTERN.map((row, rowIndex) => <View key={`qr-${rowIndex}`} style={[styles.qrRow, { height: cellSize }]}>{row.split('').map((cell, columnIndex) => <View key={`qr-${rowIndex}-${columnIndex}`} style={[styles.qrCell, { width: cellSize, height: cellSize }, cell === '1' && styles.qrCellOn]} />)}</View>)}</View>;
}

function TradeScreen({ items, owned, selectedId, selectedVariant, onSelect }: { items: Item[]; owned: Record<string, number>; selectedId: string; selectedVariant: CollectibleVariant; onSelect: (id: string, variant: CollectibleVariant) => void }) {
  const [qrVisible, setQrVisible] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftSelectedId, setDraftSelectedId] = useState(selectedId);
  const [draftVariant, setDraftVariant] = useState<CollectibleVariant>(selectedVariant);
  const { width: appWidth, height: appHeight } = useAppLayout();
  // The body starts below the 74px header and keeps 92px clear for the nav.
  const tradeBoardWidth = Math.min(appWidth - 12, 428, (appHeight - 166) / 1.5);
  const tradeBoardHeight = tradeBoardWidth * 1.5;
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const selectedName = selected.name.replace(' ぬいキー', '').replace(' ぬい', '');
  const selectedImage = collectibleImage(selected, selectedVariant);
  const openPicker = () => {
    setDraftSelectedId(selected.id);
    setDraftVariant(selectedVariant);
    setPickerOpen(true);
  };
  const confirmPicker = () => {
    onSelect(draftSelectedId, draftVariant);
    setPickerOpen(false);
  };

  if (pickerOpen) {
    return <TradeCharacterPicker items={items} owned={owned} selectedId={draftSelectedId} variant={draftVariant} onVariantChange={setDraftVariant} onSelect={setDraftSelectedId} onCancel={() => setPickerOpen(false)} onConfirm={confirmPicker} />;
  }

  return (
    <View style={[styles.tradeScreenScroll, styles.tradeScrollContent]}>
      <ImageBackground source={TRADE_EXCHANGE_BOARD} resizeMode="contain" style={[styles.tradeBoardAsset, { width: tradeBoardWidth, height: tradeBoardHeight }]} imageStyle={styles.tradeBoardAssetImage}>
        <View style={styles.tradeBoardTitle}><Text style={styles.tradeTitle}>モビー交換会</Text></View>
        <View style={[styles.tradeCard, styles.tradeCardFirst]}>
          <View style={styles.tradeConnectHeading}><Text style={styles.tradeSectionNo}>QRを見せあう</Text></View>
          <ImageBackground source={UI_WIDE_PAPER} resizeMode="stretch" style={styles.qrStage}>
            {qrVisible ? <QrCode /> : <View style={styles.qrPlaceholder}><Image source={EXCHANGE} resizeMode="contain" style={styles.qrPlaceholderIcon} /><Text style={styles.qrPlaceholderText}>ここに交換用QRが現れます</Text></View>}
          </ImageBackground>
          <Pressable accessibilityRole="button" accessibilityLabel={qrVisible ? '交換QRを閉じる' : '交換QRを表示'} onPress={() => setQrVisible((value) => !value)} style={({ pressed }) => [styles.tradePrimaryButton, pressed && styles.tradeButtonPressed]}><ImageBackground source={UI_CREAM_BUTTON} resizeMode="stretch" style={styles.assetButtonInner}><Image source={EXCHANGE} resizeMode="contain" style={styles.tradeButtonIcon} /><Text style={styles.tradePrimaryButtonText}>{qrVisible ? 'QRを閉じる' : 'QRを表示'}</Text></ImageBackground></Pressable>
        </View>
        <View style={[styles.tradeCard, styles.tradeCardSecond]}>
          <View style={styles.tradeCharacterHeading}><Text style={styles.tradeSectionNo}>交換する子を選ぶ</Text></View>
          <View style={styles.tradeItemRow}>
            <View style={styles.tradeItem}><View style={styles.tradeItemImage}><Image source={selectedImage} resizeMode="contain" style={[styles.tradeImage, selectedVariant === 'key-small' && styles.tradeSmallKeyImage]} /></View><Text style={styles.tradeItemName}>{selectedName}</Text><Text style={styles.tradeItemCount}>{collectibleVariantLabel(selectedVariant)}</Text></View>
            <View style={styles.exchangeArrow}><Image source={EXCHANGE} resizeMode="contain" style={styles.exchangeArrowIcon} /></View>
            <View style={styles.partnerItem}><View style={styles.partnerImage}><Image source={FRIEND} resizeMode="contain" style={styles.partnerWaitingIcon} /></View><Text style={styles.partnerName}>友達を待っています</Text></View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="交換するモビーを選ぶ" onPress={openPicker} style={({ pressed }) => [styles.tradeChooseCharacterButton, pressed && styles.tradeButtonPressed]}><ImageBackground source={UI_WIDE_PAPER} resizeMode="stretch" style={styles.assetButtonInner}><Image source={EXCHANGE} resizeMode="contain" style={styles.tradeChooseCharacterIcon} /><Text style={styles.tradeChooseCharacterText}>交換する子を選び直す</Text></ImageBackground></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={qrVisible ? '友達の読み取りを待っています' : '先に交換QRを表示してください'} accessibilityState={{ disabled: true }} disabled style={[styles.secondaryButton, styles.secondaryButtonDisabled]}><ImageBackground source={UI_CREAM_BUTTON} resizeMode="stretch" style={styles.assetButtonInner}><Text style={styles.secondaryButtonText}>{qrVisible ? '友達の読み取りを待っています' : '先にQRを表示してね'}</Text></ImageBackground></Pressable>
        </View>
      </ImageBackground>
    </View>
  );
}

function BottomNav({ screen, onNavigate, onOpenIncident, hasUnresolvedIncident }: { screen: Screen; onNavigate: (screen: Exclude<Screen, 'investigation'>) => void; onOpenIncident: () => void; hasUnresolvedIncident: boolean }) {
  const tabs: { id: Screen; label: string; icon: number }[] = [
    { id: 'home', label: 'ホーム', icon: HOUSE },
    { id: 'collection', label: 'コレクション', icon: MOBBY_ICON },
    { id: 'time', label: 'MOBBY TIME', icon: SPARKLES },
    { id: 'trade', label: 'TRADE', icon: FRIEND },
    { id: 'investigation', label: '事件', icon: require('../../assets/home-ui/icons/notice.png') },
  ];
  const handleTabPress = (tabId: Screen) => {
    if (tabId === 'investigation') onOpenIncident();
    else onNavigate(tabId);
  };
  const selectedTabId: Screen = screen === 'casebook' ? 'investigation' : screen;
  return <View style={styles.bottomNav}><Image source={UI_BOTTOM_STRIP} resizeMode="stretch" style={styles.bottomNavAsset} />{tabs.map((tab, index) => <Pressable key={tab.id} accessibilityRole="button" accessibilityLabel={tab.label} accessibilityState={{ selected: selectedTabId === tab.id }} onPress={() => handleTabPress(tab.id)} style={({ pressed }) => [styles.navTab, BOTTOM_NAV_CELLS[index], pressed && styles.navTabPressed]}><Image source={tab.icon} resizeMode="contain" style={[styles.navIcon, selectedTabId === tab.id && styles.navIconActive, tab.id === 'investigation' && styles.navCaseIcon]} /><Text style={[styles.navLabel, selectedTabId === tab.id && styles.navLabelActive]}>{tab.label}</Text>{selectedTabId === tab.id ? <View style={styles.navDot} /> : null}{tab.id === 'investigation' && hasUnresolvedIncident ? <View pointerEvents="none" style={styles.navIncidentBadge}><Text style={styles.navIncidentBadgeText}>!</Text></View> : null}</Pressable>)}</View>;
}

export default function IndexScreen() {
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
  const [tradeSelectedId, setTradeSelectedId] = useState('yami-key');
  const [tradeSelectedVariant, setTradeSelectedVariant] = useState<CollectibleVariant>('key-normal');
  const [owned, setOwned] = useState(INITIAL_OWNED);
  const [mobbyTimeStage, setMobbyTimeStage] = useState<MobbyTimeStage>('arrived');
  const [todayId, setTodayId] = useState(ITEMS[0].id);
  const [todayVariant, setTodayVariant] = useState<CollectibleVariant>('key-normal');
  const [secondsLeft, setSecondsLeft] = useState(1421);
  const [reaction, setReaction] = useState('');
  const [incidentStorage, setIncidentStorage] = useState<IncidentStorageV4<InvestigationProgress>>(() => freshIncidentStorage());
  const [incidentCutInVisible, setIncidentCutInVisible] = useState(false);
  const [cutInShowsOrganizationIntro, setCutInShowsOrganizationIntro] = useState(false);
  const [organizationIntroReplay, setOrganizationIntroReplay] = useState(false);
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
  const pullReactionIndexRef = useRef<Record<string, number>>({});
  const lastKeyJingleRef = useRef(0);
  const placementHandledIdRef = useRef<string | null>(null);
  const storageWriteChainRef = useRef<Promise<void>>(Promise.resolve());
  const selected = useMemo(() => ITEMS.find((item) => item.id === selectedId) ?? ITEMS[0], [selectedId]);
  const today = ITEMS.find((item) => item.id === todayId) ?? ITEMS[0];
  const activeIncident = incidentStorage.activeIncident;
  const pendingIncidentReward = incidentStorage.pendingReward;
  const activeIncidentId = activeIncident?.caseId ?? null;
  const incidentTargetItemId = activeIncident?.targetItemId ?? null;
  const incidentProgress = activeIncident?.progress ?? null;
  const incidentNotificationPending = activeIncident?.notificationPending ?? false;
  const caseSolvedIds = useMemo(() => selectSolvedCaseIds(incidentStorage), [incidentStorage]);
  const identifiedEnemyIds = useMemo(() => selectIdentifiedEnemyIds(incidentStorage), [incidentStorage]);
  const activeIncidentCase = activeIncident ? ENEMY_CASE_BY_ID[activeIncident.caseId] ?? null : null;
  const incidentTargetItem = useMemo(() => ITEMS.find((item) => item.id === incidentTargetItemId) ?? null, [incidentTargetItemId]);
  const resolutionCase = pendingIncidentReward ? ENEMY_CASE_BY_ID[pendingIncidentReward.caseId] ?? null : null;
  const resolutionTargetItemId = pendingIncidentReward?.targetItemId ?? null;
  const resolutionTargetItem = useMemo(() => ITEMS.find((item) => item.id === pendingIncidentReward?.targetItemId) ?? null, [pendingIncidentReward?.targetItemId]);
  const incidentResolutionPhase: IncidentResolutionPhase = pendingIncidentReward?.step === 'reward'
    ? 'resolved'
    : pendingIncidentReward?.step ?? 'none';
  const incidentAllies = useMemo<readonly IncidentAllySelection[]>(() => {
    const persisted = activeIncident?.allies ?? pendingIncidentReward?.allies;
    const targetItemId = activeIncident?.targetItemId ?? pendingIncidentReward?.targetItemId;
    if (!persisted || !targetItemId) return [];
    const candidates = buildIncidentAllyCandidates(owned, homeWallItemIds, homePlushItemIds);
    return restoreIncidentAllies(persisted, candidates, targetItemId) ?? [];
  }, [activeIncident, homePlushItemIds, homeWallItemIds, owned, pendingIncidentReward]);
  const casebookPreviewTarget = useMemo(() => ITEMS.find((item) => isValidIncidentTarget(owned, item.id)) ?? null, [owned]);
  const cutInCase = activeIncidentCase ?? (organizationIntroReplay ? PLAYABLE_ENEMY_CASES[0] ?? null : null);
  const cutInTargetItem = incidentTargetItem ?? (organizationIntroReplay ? casebookPreviewTarget : null);
  const hasUnresolvedIncident = Boolean(activeIncident);
  const incidentCutInActive = Boolean(incidentCutInVisible && appStarted && tutorialComplete && cutInCase && cutInTargetItem && !pendingIncidentReward);
  const incidentInvestigationActive = screen === 'investigation';
  const incidentResolutionActive = Boolean(pendingIncidentReward && resolutionCase && appStarted && storageReady && tutorialComplete);
  const incidentExperienceActive = incidentCutInActive || incidentInvestigationActive || incidentResolutionActive;
  const appBaseIsolated = !appStarted || incidentExperienceActive;
  const bgmMode = incidentResolutionPhase === 'returning'
    ? 'silent' as const
    : hasUnresolvedIncident ? 'incident' as const : 'normal' as const;
  const { engageBgm, playSfx } = useMobbyAudio({ bgmEnabled: appStarted && soundEnabled, sfxEnabled: soundEnabled, bgmMode });
  const incidentReactionImage = useMemo(() => {
    if (!incidentTargetItem) return undefined;
    if (!activeIncidentCase) return incidentTargetItem.image;
    const frames = PULL_REACTION_FRAMES[ITEM_MOBBY_IDS[incidentTargetItem.id] ?? 'mobichi'] ?? [];
    return frames[CASE_REACTION_FRAME_INDEX[activeIncidentCase.id] ?? 0] ?? incidentTargetItem.image;
  }, [activeIncidentCase, incidentTargetItem]);
  const resolutionReactionImage = useMemo(() => {
    if (!resolutionTargetItem) return undefined;
    if (!resolutionCase) return resolutionTargetItem.image;
    const frames = PULL_REACTION_FRAMES[ITEM_MOBBY_IDS[resolutionTargetItem.id] ?? 'mobichi'] ?? [];
    return frames[CASE_REACTION_FRAME_INDEX[resolutionCase.id] ?? 0] ?? resolutionTargetItem.image;
  }, [resolutionCase, resolutionTargetItem]);
  const tutorialRewardActive = !tutorialComplete && ['mobbyTime', 'opening', 'place', 'wallFlight'].includes(onboardingStep);
  const effectiveTodayVariant: CollectibleVariant = tutorialRewardActive ? 'key-normal' : todayVariant;
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
    AsyncStorage.multiGet([STORAGE_TUTORIAL_COMPLETE, STORAGE_FAVORITE, STORAGE_OWNED, STORAGE_OWNED_LEGACY, STORAGE_CASES])
      .then((entries) => {
        if (!mounted) return;
        const values = Object.fromEntries(entries);
        const completed = values[STORAGE_TUTORIAL_COMPLETE] === 'true';
        const favoriteValue = values[STORAGE_FAVORITE] ?? ITEMS[0].id;
        const storedFavorite = ITEMS.some((item) => item.id === favoriteValue) ? favoriteValue : ITEMS[0].id;
        let storedOwned = completed ? INITIAL_OWNED : EMPTY_OWNED;
        const storedInventory = values[STORAGE_OWNED] ?? values[STORAGE_OWNED_LEGACY];
        if (completed && storedInventory) {
          try {
            const parsed = JSON.parse(storedInventory) as Record<string, unknown>;
            storedOwned = normalizeOwnedInventory(parsed);
          } catch {
            storedOwned = INITIAL_OWNED;
          }
        }
        setTutorialComplete(completed);
        setFavoriteDraftId(storedFavorite);
        setSelectedId(storedFavorite);
        setTradeSelectedId(storedFavorite);
        setTradeSelectedVariant(preferredOwnedVariant(storedOwned, ITEMS.find((item) => item.id === storedFavorite) ?? ITEMS[0]));
        setOwned(storedOwned);
        if (values[STORAGE_CASES]) {
          try {
            const codec = createIncidentStorageCodec(storedOwned, ITEMS.map((item) => item.id), ITEMS.map((item) => item.id));
            const decoded = decodeIncidentStorage<InvestigationProgress>(JSON.parse(values[STORAGE_CASES]), codec);
            setIncidentStorage(decoded.state);
            const storedActive = decoded.state.activeIncident;
            setIncidentCutInVisible(Boolean(storedActive && !storedActive.notificationPending && !storedActive.caseIntroSeen));
            setCutInShowsOrganizationIntro(Boolean(storedActive && !decoded.state.archive.organizationIntroSeen));
            setOrganizationIntroReplay(false);
          } catch {
            setIncidentStorage(freshIncidentStorage());
            setIncidentCutInVisible(false);
            setCutInShowsOrganizationIntro(false);
            setOrganizationIntroReplay(false);
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
  const finalizePlacement = useCallback((item: Item, variant: CollectibleVariant) => {
    setMobbyTimeStage('placed');
    const inventoryKey = collectibleInventoryKey(item.id, variant);
    setOwned((current) => ({ ...current, [inventoryKey]: (current[inventoryKey] ?? 0) + 1 }));
    setSelectedId(item.id);
    setTradeSelectedId(item.id);
    setTradeSelectedVariant(variant);
    const placement = variant === 'plush' ? '棚' : '壁';
    if (variant === 'plush') {
      setHomePlushItemIds((current) => [item.id, ...current.filter((id) => id !== item.id)]);
    } else {
      setHomeWallVariants((current) => ({ ...current, [item.id]: variant }));
    }
    setNotice(`NEW! ${collectibleName(item, variant)}を${placement}に追加しました`);
    if (['place', 'opening', 'mobbyTime', 'wallFlight'].includes(onboardingStep)) {
      setScreen('home');
      setOnboardingStep('home');
    }
  }, [onboardingStep]);
  const placeToday = useCallback(() => {
    const rewardKey = collectibleInventoryKey(today.id, effectiveTodayVariant);
    if (placementHandledIdRef.current === rewardKey) return;
    placementHandledIdRef.current = rewardKey;
    setSelectedId(today.id);
    if (effectiveTodayVariant !== 'plush') {
      setNotice('');
      setWallPlacement({ item: today, variant: effectiveTodayVariant });
      setScreen('home');
      if (onboardingStep === 'place') setOnboardingStep('wallFlight');
      return;
    }
    playSfx('place');
    finalizePlacement(today, effectiveTodayVariant);
    // Plush placement finishes its in-card motion before this callback runs.
    // Return to the home shelf for all sessions, including users who have
    // already completed onboarding (the wall-flight branch does this before
    // its animation starts).
    setScreen('home');
  }, [effectiveTodayVariant, finalizePlacement, onboardingStep, playSfx, today]);
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
  const completeMobbyTimePlacement = useCallback(() => {
    // Plush rewards run the short “moving to the shelf” animation inside the
    // encounter card. Once it finishes, commit the item and leave Mobby Time
    // automatically instead of waiting for a second tap.
    if (effectiveTodayVariant === 'plush') {
      placeToday();
      return;
    }
    setMobbyTimeStage('placed');
  }, [effectiveTodayVariant, placeToday]);
  const completeWallPlacement = useCallback(() => {
    if (!wallPlacement) return;
    playSfx('place');
    finalizePlacement(wallPlacement.item, wallPlacement.variant);
    setWallPlacement(null);
  }, [finalizePlacement, playSfx, wallPlacement]);
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
  const incidentAllyActors = useMemo<readonly IncidentAllyActor[]>(
    () => incidentAllies.map((ally) => ({ slot: ally.slot, id: ally.id, name: ally.name, image: ally.image })),
    [incidentAllies],
  );
  const incidentWallState: 'none' | 'stolen' | 'returning' = incidentResolutionPhase === 'returning'
    ? 'returning'
    : hasUnresolvedIncident ? 'stolen' : 'none';

  const casebookActiveCase = useMemo<IncidentCasebookActiveCase | null>(() => {
    if (pendingIncidentReward) return null;
    if (activeIncident && activeIncidentCase && incidentTargetItem) {
      const storyScene = MIDNIGHT_DOUBLE_INCIDENT.scenes.find((scene) => scene.id === activeIncident.progress.storySceneId);
      const incidentNoticeConfirmed = activeIncident.caseIntroSeen && !activeIncident.notificationPending;
      const introReady = incidentNoticeConfirmed && incidentStorage.archive.organizationIntroSeen;
      const organizationIntroPending = incidentNoticeConfirmed && !incidentStorage.archive.organizationIntroSeen;
      return {
        id: activeIncidentCase.id,
        chapter: activeIncidentCase.publicChapter,
        title: activeIncidentCase.title,
        targetName: itemCharacterName(incidentTargetItem),
        targetImage: incidentTargetItem.image,
        progressLabel: introReady
          ? storyScene?.chapterLabel ?? activeIncident.progress.storySceneId ?? ''
          : organizationIntroPending ? '怪盗団記録・未確認' : '事件通知・未確認',
        objective: introReady
          ? storyScene?.objective ?? activeIncidentCase.summary
          : organizationIntroPending ? '怪盗団について確認する' : '事件の知らせを確認する',
        canResume: true,
        introSeen: introReady,
      };
    }
    const playableCase = PLAYABLE_ENEMY_CASES[0];
    if (!playableCase || !casebookPreviewTarget) return null;
    return {
      id: playableCase.id,
      chapter: playableCase.publicChapter,
      title: playableCase.title,
      targetName: itemCharacterName(casebookPreviewTarget),
      targetImage: casebookPreviewTarget.image,
      progressLabel: caseSolvedIds.includes(playableCase.id) ? '解決済み・もう一度遊べます' : '事件発生前',
      objective: playableCase.summary,
      canResume: false,
      introSeen: false,
    };
  }, [activeIncident, activeIncidentCase, caseSolvedIds, casebookPreviewTarget, incidentStorage.archive.organizationIntroSeen, incidentTargetItem, pendingIncidentReward]);

  const casebookEnemies = useMemo<readonly IncidentCasebookEnemyEntry[]>(() => ENEMIES_IN_REVEAL_ORDER.map((enemy) => {
    const caseData = ENEMY_CASES.find((candidate) => candidate.revealEnemyId === enemy.id);
    if (!identifiedEnemyIds.has(enemy.id) || !caseData) {
      const locked = getEnemyPublicDescriptor(enemy.id, 'locked');
      return {
        state: 'locked' as const,
        id: enemy.id,
        revealOrder: enemy.revealOrder,
        alias: locked.displayName,
        unlockCondition: enemy.publicChapter,
      };
    }
    const revealed = getEnemyPublicDescriptor(enemy.id, 'revealed');
    if (!revealed.image) {
      return {
        state: 'locked' as const,
        id: enemy.id,
        revealOrder: enemy.revealOrder,
        alias: enemy.preRevealAlias,
        unlockCondition: enemy.publicChapter,
      };
    }
    return {
      state: 'revealed' as const,
      id: enemy.id,
      caseId: caseData.id,
      revealOrder: enemy.revealOrder,
      name: revealed.displayName,
      role: revealed.displayRole,
      method: revealed.displayMethod,
      record: revealed.record,
      affiliationLabel: `${revealed.affiliation.organizationName}・${revealed.affiliation.relationship}`,
      image: revealed.image,
      isNew: pendingIncidentReward?.newEnemyId === enemy.id,
    };
  }), [identifiedEnemyIds, pendingIncidentReward?.newEnemyId]);

  const casebookComics = useMemo<readonly IncidentCasebookComicEntry[]>(() => incidentStorage.archive.comicUnlocks.flatMap((unlock) => {
    const comic = getIncidentComic(unlock.targetMobbyId);
    const target = ITEMS.find((item) => ITEM_MOBBY_IDS[item.id] === unlock.targetMobbyId);
    if (!target) return [];
    return [{
      id: comic.id,
      caseId: unlock.sourceCaseId,
      targetName: itemCharacterName(target),
      targetImage: target.image,
      title: comic.title,
      image: comic.image,
      frames: comic.placeholderPanels,
      isNew: pendingIncidentReward?.newComicId === comic.id,
    }];
  }), [incidentStorage.archive.comicUnlocks, pendingIncidentReward?.newComicId]);

  const resolutionNewEnemy = useMemo(() => {
    if (!pendingIncidentReward?.newEnemyId) return null;
    const enemy = getEnemyPublicDescriptor(pendingIncidentReward.newEnemyId, 'revealed');
    if (!enemy.image) return null;
    return {
      name: enemy.displayName,
      role: enemy.displayRole,
      method: enemy.displayMethod,
      image: enemy.image,
      affiliationLabel: `${enemy.affiliation.organizationName}・${enemy.affiliation.relationship}`,
    };
  }, [pendingIncidentReward?.newEnemyId]);

  const resolutionNewComic = useMemo(() => {
    if (!pendingIncidentReward?.newComicId || !resolutionTargetItem) return null;
    const comic = getIncidentComic(pendingIncidentReward.targetMobbyId);
    return {
      title: comic.title,
      targetName: itemCharacterName(resolutionTargetItem),
      image: comic.image,
      frames: comic.placeholderPanels,
    };
  }, [pendingIncidentReward?.newComicId, pendingIncidentReward?.targetMobbyId, resolutionTargetItem]);

  const openMobbyTimeNotification = useCallback(() => {
    playSfx('tap');
    placementHandledIdRef.current = null;
    const next = ITEMS[Math.floor(Math.random() * ITEMS.length)];
    setTodayId(next.id);
    setTodayVariant(COLLECTIBLE_VARIANTS[Math.floor(Math.random() * COLLECTIBLE_VARIANTS.length)]);
    setSecondsLeft(1800);
    setMobbyTimeStage('arrived');
    setScreen('time');
    setNotice('MOBBY TIME！中身は開けるまでのお楽しみ');
    setNotificationOpen(false);
  }, [playSfx]);

  const triggerIncident = useCallback((
    mode: 'automatic' | 'demo' | 'confirmed-demo' = 'automatic',
    requestedCaseId: EnemyCaseId = FEATURED_INCIDENT_CASE_ID,
    preferredTargetItemId?: string,
  ) => {
    if (incidentResolutionPhase !== 'none' || !tutorialComplete) return;
    if (activeIncident) return;
    const caseData = ENEMY_CASE_BY_ID[requestedCaseId];
    if (!caseData || !isPlayableEnemyCase(caseData)) return;
    const wallTargets = ITEMS.filter((item) => ownedCollectibleCount(owned, item.id, 'key-normal') + ownedCollectibleCount(owned, item.id, 'key-small') > 0);
    if (!wallTargets.length) return;
    const target = wallTargets.find((candidate) => candidate.id === preferredTargetItemId)
      ?? wallTargets[Math.floor(Math.random() * wallTargets.length)];
    const castCandidates = buildIncidentAllyCandidates(owned, homeWallItemIds, homePlushItemIds);
    const allies = selectIncidentAllies(castCandidates, target.id);
    const runId = createIncidentRunId(caseData.id, target.id, Date.now());
    setIncidentStorage((current) => startIncidentRun(current, {
      runId,
      caseId: caseData.id,
      targetItemId: target.id,
      targetMobbyId: ITEM_MOBBY_IDS[target.id],
      allies: incidentAllyIds(allies),
      progress: freshDefaultInvestigationProgress(),
      notificationPending: mode === 'demo',
    }, PLAYABLE_INCIDENT_CASE_IDS));
    // Let the triggering tap finish before mounting the full-screen cut-in;
    // otherwise the same pointer event can land on the new backdrop and
    // immediately choose "あとで調べる" on web.
    setIncidentCutInVisible(false);
    setCutInShowsOrganizationIntro(!incidentStorage.archive.organizationIntroSeen);
    setScreen('home');
    if (mode === 'demo') {
      setNotificationOpen(true);
      setNotice('事件通知が届きました。お知らせから異変を確認してください');
    } else {
      setNotificationOpen(false);
      setTimeout(() => setIncidentCutInVisible(true), 80);
      setNotice(`事件発生！ ${target.name.replace(' ぬいキー', '').replace(' ぬい', '')}が盗まれました`);
    }
    playSfx('incidentSting');
  }, [activeIncident, homePlushItemIds, homeWallItemIds, incidentResolutionPhase, incidentStorage.archive.organizationIntroSeen, owned, playSfx, tutorialComplete]);

  const openIncident = useCallback(() => {
    playSfx('tap');
    setNotificationOpen(false);
    setIncidentCutInVisible(false);
    setOrganizationIntroReplay(false);
    setCasebookInitialTab('active');
    setScreen('casebook');
  }, [playSfx]);

  const openIncidentNotification = useCallback(() => {
    if (activeIncident) {
      playSfx('tap');
      setNotificationOpen(false);
      setIncidentStorage((current) => acknowledgeIncidentNotification(current, activeIncident.runId));
      if (activeIncident.caseIntroSeen && incidentStorage.archive.organizationIntroSeen) {
        setScreen('investigation');
      } else {
        setScreen('home');
        setCutInShowsOrganizationIntro(!incidentStorage.archive.organizationIntroSeen);
        setIncidentCutInVisible(false);
        setTimeout(() => setIncidentCutInVisible(true), 80);
      }
      return;
    }
    playSfx('tap');
    setNotificationOpen(false);
    triggerIncident('confirmed-demo');
  }, [activeIncident, incidentStorage.archive.organizationIntroSeen, playSfx, triggerIncident]);

  const selectCasebookCase = useCallback((caseId: string) => {
    const caseData = ENEMY_CASES.find((candidate) => candidate.id === caseId);
    if (!caseData || !isPlayableEnemyCase(caseData) || activeIncident || pendingIncidentReward) return;
    triggerIncident('confirmed-demo', caseData.id, casebookPreviewTarget?.id);
  }, [activeIncident, casebookPreviewTarget?.id, pendingIncidentReward, triggerIncident]);

  const resumeIncident = useCallback(() => {
    if (!activeIncident) return;
    playSfx('tap');
    setNotificationOpen(false);
    setOrganizationIntroReplay(false);
    setIncidentStorage((current) => acknowledgeIncidentNotification(current, activeIncident.runId));
    if (activeIncident.caseIntroSeen && incidentStorage.archive.organizationIntroSeen) {
      setIncidentCutInVisible(false);
      setScreen('investigation');
    } else {
      setScreen('home');
      setCutInShowsOrganizationIntro(!incidentStorage.archive.organizationIntroSeen);
      setIncidentCutInVisible(false);
      setTimeout(() => setIncidentCutInVisible(true), 80);
    }
  }, [activeIncident, incidentStorage.archive.organizationIntroSeen, playSfx]);

  const replayIncidentIntro = useCallback(() => {
    if (!activeIncident) return;
    playSfx('tap');
    setOrganizationIntroReplay(false);
    setCutInShowsOrganizationIntro(!incidentStorage.archive.organizationIntroSeen);
    setIncidentStorage((current) => acknowledgeIncidentNotification(current, activeIncident.runId));
    setScreen('home');
    setIncidentCutInVisible(false);
    setTimeout(() => setIncidentCutInVisible(true), 80);
  }, [activeIncident, incidentStorage.archive.organizationIntroSeen, playSfx]);

  const replayOrganizationIntro = useCallback(() => {
    if (!activeIncident && !casebookPreviewTarget) return;
    playSfx('tap');
    setOrganizationIntroReplay(true);
    setCutInShowsOrganizationIntro(true);
    setIncidentCutInVisible(false);
    setTimeout(() => setIncidentCutInVisible(true), 80);
  }, [activeIncident, casebookPreviewTarget, playSfx]);

  const handleOrganizationIntroSeen = useCallback(() => {
    setIncidentStorage((current) => markOrganizationIntroSeen(current));
  }, []);

  const dismissIncidentCutIn = useCallback(() => {
    playSfx('tap');
    setIncidentCutInVisible(false);
    setCutInShowsOrganizationIntro(false);
    if (organizationIntroReplay) {
      setOrganizationIntroReplay(false);
      setScreen('casebook');
      return;
    }
    if (activeIncident) setIncidentStorage((current) => markIncidentCaseIntroSeen(current, activeIncident.runId));
    setScreen('home');
    setNotice('未解決事件を事件ボタンに保存しました');
  }, [activeIncident, organizationIntroReplay, playSfx]);

  const startIncidentInvestigation = useCallback(() => {
    playSfx('tap');
    setIncidentCutInVisible(false);
    setCutInShowsOrganizationIntro(false);
    setNotificationOpen(false);
    if (organizationIntroReplay) {
      setOrganizationIntroReplay(false);
      setScreen('casebook');
      return;
    }
    if (!activeIncident) return;
    setIncidentStorage((current) => markIncidentCaseIntroSeen(current, activeIncident.runId));
    setScreen('investigation');
  }, [activeIncident, organizationIntroReplay, playSfx]);

  useEffect(() => {
    if (!storageReady || !appStarted || !tutorialComplete || activeIncidentId || incidentResolutionPhase !== 'none') return;
    const delay = 14000 + Math.floor(Math.random() * 12000);
    const timer = setTimeout(() => triggerIncident(), delay);
    return () => clearTimeout(timer);
  }, [activeIncidentId, appStarted, incidentResolutionPhase, storageReady, triggerIncident, tutorialComplete]);

  const completeIncidentReturn = useCallback(() => {
    if (!pendingIncidentReward || pendingIncidentReward.step !== 'returning') return;
    setIncidentStorage((current) => advanceIncidentReturn(current, pendingIncidentReward.runId));
    setIncidentCutInVisible(false);
  }, [pendingIncidentReward]);

  const handleInvestigationSound = useCallback((sound: 'tap' | 'evidence' | 'wrong' | 'correct') => {
    if (sound === 'evidence') playSfx('clueReveal');
    else if (sound !== 'correct') playSfx('tap');
  }, [playSfx]);

  const handleResolutionSound = useCallback((sound: 'reveal' | 'reward' | 'tap') => {
    if (sound === 'reveal') playSfx('clueReveal');
    else if (sound === 'reward') playSfx('reward');
    else playSfx('tap');
  }, [playSfx]);

  const openNotificationScreen = useCallback((nextScreen: Screen) => {
    playSfx('tap');
    setScreen(nextScreen);
    setNotificationOpen(false);
  }, [playSfx]);

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

  const solveCase = useCallback((caseData: EnemyCase) => {
    if (
      !activeIncident
      || pendingIncidentReward
      || caseData.id !== activeIncident.caseId
      || !isPlayableEnemyCase(caseData)
      || !isValidIncidentTarget(owned, activeIncident.targetItemId)
    ) return;
    playSfx('caseSolved');
    const solvedAt = Date.now();
    setIncidentStorage((current) => solveIncidentRun(current, {
      runId: activeIncident.runId,
      caseId: activeIncident.caseId,
      targetItemId: activeIncident.targetItemId,
      targetMobbyId: activeIncident.targetMobbyId,
      enemyId: caseData.revealEnemyId,
      comicId: incidentComicId(activeIncident.targetMobbyId),
      solvedAt,
    }, INCIDENT_REWARD_RESOLVER));
    setReaction(`救出成功！ ${caseData.rewardTitle}`);
    setIncidentCutInVisible(false);
    setScreen('home');
    setNotice('事件解決！ モビーが帰ってきます');
  }, [activeIncident, owned, pendingIncidentReward, playSfx]);

  const dismissResolution = useCallback(() => {
    if (!pendingIncidentReward || pendingIncidentReward.step !== 'reward') return;
    playSfx('tap');
    setIncidentStorage((current) => dismissIncidentReward(current, pendingIncidentReward.runId));
    setNotice('事件解決！ モビーが壁に戻りました');
  }, [pendingIncidentReward, playSfx]);

  const openResolutionCasebook = useCallback(() => {
    if (!pendingIncidentReward || pendingIncidentReward.step !== 'reward') return;
    playSfx('tap');
    setCasebookInitialTab(pendingIncidentReward.newComicId ? 'comics' : pendingIncidentReward.newEnemyId ? 'enemies' : 'active');
    setIncidentStorage((current) => dismissIncidentReward(current, pendingIncidentReward.runId));
    setScreen('casebook');
  }, [pendingIncidentReward, playSfx]);

  const navigateTo = useCallback((nextScreen: Screen) => {
    playSfx('tap');
    setScreen(nextScreen);
  }, [playSfx]);

  const selectHomeMobby = useCallback((id: string) => {
    playSfx('tap');
    setReaction('');
    setSelectedId(id);
  }, [playSfx]);

  const selectTradeMobby = useCallback((id: string, variant: CollectibleVariant) => {
    playSfx('tap');
    setTradeSelectedId(id);
    setTradeSelectedVariant(variant);
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
    setScreen('home');
    if (!tutorialComplete) setOnboardingStep('favorite');
  }, [tutorialComplete]);

  const confirmFavorite = useCallback(() => {
    playSfx('reward');
    placementHandledIdRef.current = null;
    setSelectedId(favoriteDraftId);
    setTodayId(favoriteDraftId);
    setTodayVariant('key-normal');
    setOwned(EMPTY_OWNED);
    setSecondsLeft(1800);
    setMobbyTimeStage('arrived');
    setScreen('time');
    setNotice('最初のグッズが届きました。箱をタップして受け取ろう！');
    setOnboardingStep('mobbyTime');
  }, [favoriteDraftId, playSfx]);

  const finishOnboarding = useCallback(() => {
    playSfx('reward');
    setTutorialComplete(true);
    setOnboardingStep('none');
    setScreen('home');
    setNotice('チュートリアル完了！あとは自由にモビーと遊べます');
  }, [playSfx]);

  const advanceOnboarding = useCallback(() => {
    playSfx('tap');
    if (onboardingStep === 'home') {
      setScreen('collection');
      setOnboardingStep('collection');
      return;
    }
    if (onboardingStep === 'collection') {
      setScreen('time');
      setOnboardingStep('time');
      return;
    }
    if (onboardingStep === 'time') {
      setScreen('trade');
      setOnboardingStep('trade');
      return;
    }
    if (onboardingStep === 'trade') finishOnboarding();
  }, [finishOnboarding, onboardingStep, playSfx]);

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
                  onOpenTrade={() => openNotificationScreen('trade')}
                  onOpenInvestigation={openIncidentNotification}
                  hasUnresolvedIncident={hasUnresolvedIncident}
                  incidentNotificationPending={incidentNotificationPending}
                />
              ) : null}
              <View style={styles.screenBody}>
                {screen === 'home' ? <HomeScreen selected={selected} owned={owned} onSelect={selectHomeMobby} incidentWallItemId={incidentTargetItemId ?? resolutionTargetItemId ?? undefined} incidentWallState={incidentWallState} placementHiddenWallItemId={wallPlacement?.item.id} onIncidentPress={openIncident} wallItemIds={visibleHomeWallItemIds} wallVariants={homeWallVariants} plushItemIds={visibleHomePlushItemIds} onSwapWallItems={swapHomeWallItems} onSwapPlushItems={swapHomePlushItems} onUiTap={() => playSfx('tap')} onInteract={interact} onKeychainSwing={playKeychainJingle} reaction={reaction} /> : null}
                {screen === 'collection' ? <CollectionScreen items={ITEMS} owned={owned} selectedId={selectedId} onSelect={selectItem} onKeychainSwing={playKeychainJingle} /> : null}
                {screen === 'time' ? <MobbyTimeScreen today={today} todayVariant={effectiveTodayVariant} stage={mobbyTimeStage} onOpen={() => { playSfx('boxOpen'); setMobbyTimeStage('opening'); if (onboardingStep === 'mobbyTime') setOnboardingStep('opening'); }} onReveal={revealToday} onPlace={startPlacement} onPlaced={completeMobbyTimePlacement} onTrade={() => navigateTo('trade')} secondsLeft={secondsLeft} /> : null}
                {screen === 'touch' ? <TouchScreen selected={selected} onInteract={interact} reaction={reaction} /> : null}
                {screen === 'trade' ? <TradeScreen items={ITEMS} owned={owned} selectedId={tradeSelectedId} selectedVariant={tradeSelectedVariant} onSelect={selectTradeMobby} /> : null}
                {screen === 'casebook' ? <IncidentCasebookScreen activeCase={casebookActiveCase} enemies={casebookEnemies} comics={casebookComics} initialTab={casebookInitialTab} onSelectCase={selectCasebookCase} onResume={resumeIncident} onReplayIncidentIntro={replayIncidentIntro} onReplayOrganizationIntro={replayOrganizationIntro} onClose={() => navigateTo('home')} reduceMotion={reduceMotion} /> : null}
              </View>
              {!['favorite', 'mobbyTime', 'opening', 'place', 'wallFlight'].includes(onboardingStep) && !incidentExperienceActive ? <BottomNav screen={screen} hasUnresolvedIncident={hasUnresolvedIncident} onOpenIncident={openIncident} onNavigate={navigateTo} /> : null}
              {wallPlacement && wallPlacement.variant !== 'plush' ? <WallPlacementFlight item={wallPlacement.item} variant={wallPlacement.variant} onComplete={completeWallPlacement} /> : null}
              {onboardingStep !== 'none' && onboardingStep !== 'favorite' ? <OnboardingGuide step={onboardingStep} onNext={advanceOnboarding} onSkip={finishOnboarding} /> : null}
              {onboardingStep === 'favorite' ? <FavoriteMobbyPicker selectedId={favoriteDraftId} onSelect={(id) => { playSfx('tap'); setFavoriteDraftId(id); }} onConfirm={confirmFavorite} /> : null}
              </View>
              {!appStarted ? <OpeningScreen onBegin={() => { engageBgm(); playSfx('reward'); }} onStart={startApp} /> : null}
              {!storageReady || (!fontsLoaded && !fontError) ? <LoadingOverlay /> : null}
              {incidentInvestigationActive && activeIncident && incidentTargetItem ? <View style={styles.incidentScreenLayer} accessibilityViewIsModal><InvestigationScreen activeCase={activeIncidentCase} targetName={itemCharacterName(incidentTargetItem)} targetImage={incidentTargetItem.image} solvedCaseIds={caseSolvedIds} reactionImage={incidentReactionImage} allyActors={incidentAllyActors} identifiedEnemyIds={identifiedEnemyIds} story={MIDNIGHT_DOUBLE_INCIDENT} initialProgress={incidentProgress ?? undefined} onProgressChange={(progress) => setIncidentStorage((current) => updateIncidentProgress(current, activeIncident.runId, progress))} onUiSound={handleInvestigationSound} onSolved={solveCase} onClose={() => { setCasebookInitialTab('active'); navigateTo('casebook'); }} reduceMotion={reduceMotion} /></View> : null}
              {incidentCutInActive && cutInCase && cutInTargetItem ? <IncidentCutIn caseData={cutInCase} targetName={itemCharacterName(cutInTargetItem)} targetImage={cutInTargetItem.image} allyActors={incidentAllyActors} story={MIDNIGHT_DOUBLE_INCIDENT} showOrganizationIntro={cutInShowsOrganizationIntro} organizationIntroOnly={organizationIntroReplay} onOrganizationIntroSeen={handleOrganizationIntroSeen} onInvestigate={startIncidentInvestigation} onLater={dismissIncidentCutIn} reduceMotion={reduceMotion} /> : null}
              {incidentResolutionActive && resolutionCase && resolutionTargetItem && resolutionReactionImage ? <IncidentResolutionOverlay phase={incidentResolutionPhase === 'returning' ? 'returning' : 'resolved'} caseData={resolutionCase} targetName={itemCharacterName(resolutionTargetItem)} targetImage={resolutionTargetItem.image} rewardImage={resolutionReactionImage} allyActors={incidentAllyActors} newEnemy={resolutionNewEnemy} newComic={resolutionNewComic} onReturnComplete={completeIncidentReturn} onDismiss={dismissResolution} onOpenCasebook={openResolutionCasebook} onUiSound={handleResolutionSound} reduceMotion={reduceMotion} /> : null}
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
  appBaseLayer: { flex: 1, position: 'relative' },
  incidentScreenLayer: { ...StyleSheet.absoluteFillObject, zIndex: 160, backgroundColor: '#211827' },
  globalHeaderPlaceholder: { minHeight: 74 },
  appShellBackground: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  collectionReferenceBackground: { ...StyleSheet.absoluteFillObject, width: DESIGN_WIDTH, height: '100%' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 140, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(76,53,71,0.36)' },
  loadingCard: { width: 286, minHeight: 290, paddingHorizontal: 24, paddingTop: 15, paddingBottom: 22, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8E9', borderWidth: 1.5, borderColor: '#DDBA94', shadowColor: '#4D3246', shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 14 },
  loadingMascotWrap: { width: 210, height: 198, alignItems: 'center', justifyContent: 'flex-end' },
  loadingMascotWrapCompact: { width: 90, height: 62, marginBottom: -9 },
  loadingMascotImage: { width: 185, height: 175 },
  loadingMascotImageCompact: { width: 68, height: 58 },
  loadingDots: { height: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  loadingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#735574' },
  loadingTitle: { color: '#5D405B', fontSize: 18, lineHeight: 23, fontWeight: '900', marginTop: 2 },
  loadingText: { color: '#98737E', fontSize: 10, lineHeight: 15, fontWeight: '800', marginTop: 4 },
  pressableFocusReset: { outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  panelStretchImage: { width: '100%', height: '100%' },
  onboardingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 115, alignItems: 'center', justifyContent: 'center' },
  onboardingBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(67,44,61,0.025)' },
  favoriteCard: { position: 'absolute', top: 32, left: 14, right: 14, bottom: 24, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16, borderRadius: 30, alignItems: 'center', backgroundColor: 'rgba(255,249,236,0.2)', borderWidth: 1.6, borderColor: 'rgba(255,255,250,0.54)', shadowColor: '#4D3246', shadowOpacity: 0.17, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 16, ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(3px) saturate(1.03)' } as any) : {}) },
  favoriteGlassSheen: { position: 'absolute', top: 9, left: 18, right: 18, height: 86, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.035)', borderTopWidth: 1.4, borderColor: 'rgba(255,255,255,0.3)' },
  onboardingKicker: { color: '#A0797F', fontSize: 8, fontWeight: '900', letterSpacing: 1.8 },
  favoriteTitle: { color: '#553B59', fontSize: 23, lineHeight: 29, fontWeight: '900', marginTop: 4 },
  favoriteLead: { width: 320, color: '#8D6C76', fontSize: 10, lineHeight: 15, fontWeight: '800', textAlign: 'center', marginTop: 4, marginBottom: 10 },
  favoriteCarousel: { width: '100%', minHeight: 366, marginTop: -2 },
  onboardingPrimaryButton: { width: '100%', minHeight: 48, marginTop: 10, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6B547D', borderWidth: 1.2, borderColor: '#E3C7D5', shadowColor: '#4E365B', shadowOpacity: 0.2, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  onboardingPrimaryButtonPressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  onboardingPrimaryText: { color: '#FFF9EC', fontSize: 13, fontWeight: '900', letterSpacing: 0.4 },
  guideOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  guideNavHighlight: { position: 'absolute', bottom: Platform.OS === 'web' ? 17 : 10, width: 76, height: 60, padding: 3, borderRadius: 20, borderWidth: 2, borderColor: '#C9778B', backgroundColor: 'rgba(255,240,225,0.18)', zIndex: 104, shadowColor: '#6A4158', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 10 },
  guideNavHighlightInner: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,247,228,0.92)' },
  guideCard: { position: 'absolute', left: 10, right: 10, paddingHorizontal: 28, paddingTop: 23, paddingBottom: 25, shadowColor: '#4E3449', shadowOpacity: 0.23, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 11 },
  guideCardImage: { width: '100%', height: '100%' },
  guideCardBottom: { bottom: 84, minHeight: 132 },
  guideCardTop: { top: 78, minHeight: 104 },
  guideHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  guideStep: { color: '#A3727E', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  guideSkip: { color: '#91717B', fontSize: 9, fontWeight: '900', textDecorationLine: 'underline' },
  guideTitle: { color: '#5C405B', fontSize: 15, lineHeight: 20, fontWeight: '900', marginTop: 3 },
  guideBody: { color: '#876872', fontSize: 10, lineHeight: 15, fontWeight: '800', marginTop: 3 },
  guideButton: { alignSelf: 'flex-end', width: 126, height: 42, marginTop: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  guideButtonText: { color: '#FFF9EC', fontSize: 10, fontWeight: '900' },
  openingScreen: { ...StyleSheet.absoluteFillObject, zIndex: 100, overflow: 'hidden' },
  openingBackdrop: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  openingTapSurface: { ...StyleSheet.absoluteFillObject, zIndex: 6, backgroundColor: 'transparent' },
  openingTitleWrap: { position: 'absolute', top: 34, left: 24, right: 24, alignItems: 'center', zIndex: 8 },
  openingTitlePlaque: { width: 310, height: 129, alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  openingLogoImage: { width: 280, height: 99 },
  openingTitle: { color: '#5A3A69', fontSize: 43, lineHeight: 45, fontWeight: '900', letterSpacing: 2.2, textShadowColor: 'rgba(255,249,231,0.72)', textShadowRadius: 3 },
  openingTitleSub: { color: '#8B647E', fontSize: 9, fontWeight: '900', letterSpacing: 2.6, marginTop: 1 },
  openingTagline: { color: '#694C5E', fontSize: 12, fontWeight: '900', marginTop: -7, textShadowColor: 'rgba(255,250,233,0.9)', textShadowRadius: 4 },
  openingScene: { position: 'absolute', top: 0, left: 0, right: 0, height: 428 },
  openingOpenedBox: { position: 'absolute', top: 0, left: '50%', width: 360, height: 360, marginLeft: -180, zIndex: 1 },
  openingKeyDecoration: { position: 'absolute' },
  openingMobby: { position: 'absolute', top: 69, left: '50%', width: 222, height: 252, marginLeft: -111, zIndex: 3 },
  openingUnopenedPackage: { position: 'absolute', left: '50%', zIndex: 4 },
  openingStartWrap: { position: 'absolute', left: 18, right: 18, bottom: 18, alignItems: 'center', zIndex: 9 },
  openingStartButton: { width: 292, height: 126, alignItems: 'center', justifyContent: 'center', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  openingStartLoading: { opacity: 0.78 },
  openingStartPressed: { transform: [{ scale: 0.96 }] },
  openingStartPlaque: { width: 292, height: 126, alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  openingStartTitle: { color: '#64425D', fontSize: 16, fontWeight: '900', letterSpacing: 1.7 },
  openingStartSub: { color: '#9A707C', fontSize: 10, fontWeight: '900', marginTop: 3 },
  header: { minHeight: 74, paddingHorizontal: 16, paddingTop: 7, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent', borderBottomWidth: 0 },
  logo: { width: 103, height: 50, marginLeft: -5 },
  headerCopy: { flex: 1, marginLeft: 2 },
  headerKicker: { color: '#806174', fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  headerDay: { color: '#49334E', fontSize: 12, fontWeight: '900', marginTop: 3 },
  headerDot: { color: '#D18A9C' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  soundButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,249,235,0.88)', alignItems: 'center', justifyContent: 'center', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent', shadowColor: '#66475D', shadowOpacity: 0.12, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  soundButtonMuted: { backgroundColor: 'rgba(238,231,225,0.92)' },
  soundButtonText: { color: '#76536F', fontSize: 19, lineHeight: 21, fontWeight: '900' },
  soundButtonTextMuted: { color: '#9B8687' },
  soundMutedSlash: { position: 'absolute', width: 23, height: 2, borderRadius: 1, backgroundColor: '#A1777F', transform: [{ rotate: '-42deg' }] },
  caseHeaderButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,253,246,0.9)', alignItems: 'center', justifyContent: 'center', shadowColor: '#66475D', shadowOpacity: 0.12, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  caseHeaderIcon: { width: 21, height: 21, tintColor: '#76536F' },
  caseHeaderBadge: { position: 'absolute', right: -3, top: -5, width: 16, height: 16, borderRadius: 8, backgroundColor: '#D8898E', borderWidth: 1.2, borderColor: '#FFF8EC', alignItems: 'center', justifyContent: 'center' },
  caseHeaderBadgeWaiting: { backgroundColor: '#B6A2B0' },
  caseHeaderBadgeText: { color: '#FFF', fontSize: 9, lineHeight: 11, fontWeight: '900' },
  bellButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,253,246,0.9)', alignItems: 'center', justifyContent: 'center', shadowColor: '#66475D', shadowOpacity: 0.12, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  bellIcon: { width: 21, height: 21 },
  bellBadge: { position: 'absolute', right: -4, top: -6, width: 17, height: 17, borderRadius: 9, backgroundColor: '#E47884', borderWidth: 1.5, borderColor: '#FFF8EC', alignItems: 'center', justifyContent: 'center' },
  bellBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  notificationOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 80 },
  notificationBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(63,42,56,0.2)' },
  notificationPopup: { position: 'absolute', top: 61, left: 12, right: 12, padding: 10, borderRadius: 23, backgroundColor: '#FFF9EC', borderWidth: 1.4, borderColor: '#DCB991', shadowColor: '#4E354A', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 14 },
  notificationPointer: { position: 'absolute', top: -7, right: 20, width: 16, height: 16, backgroundColor: '#FFF9EC', borderLeftWidth: 1.2, borderTopWidth: 1.2, borderColor: '#DCB991', transform: [{ rotate: '45deg' }] },
  notificationHeader: { minHeight: 49, paddingLeft: 6, paddingRight: 2, paddingBottom: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notificationTitle: { color: '#5B3E59', fontSize: 17, lineHeight: 21, fontWeight: '900', letterSpacing: 0.5 },
  notificationSubtitle: { color: '#7F5C68', fontSize: 9, lineHeight: 12, fontWeight: '700', marginTop: 2 },
  notificationCloseButton: { width: 31, height: 31, borderRadius: 12, backgroundColor: '#F3E3D5', alignItems: 'center', justifyContent: 'center', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  notificationCloseText: { color: '#775568', fontSize: 23, lineHeight: 25, marginTop: -2 },
  notificationItem: { height: 78, marginTop: 5, outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  notificationItemPaper: { width: '100%', height: '100%', paddingHorizontal: 17, paddingTop: 10, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' },
  notificationItemFeatured: {},
  notificationItemPressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  notificationIcon: { width: 42, height: 42, marginRight: 9, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1.2 },
  notificationIconTime: { backgroundColor: '#F1D4A6', borderColor: '#D3A56C' },
  notificationIconCollection: { backgroundColor: '#EAD9E6', borderColor: '#C9A8C0' },
  notificationIconTrade: { backgroundColor: '#DDE6D5', borderColor: '#B0C29F' },
  notificationIconCase: { backgroundColor: '#E7D2D7', borderColor: '#BE8B9C' },
  notificationIconText: { color: '#6A4C68', fontSize: 20, fontWeight: '900' },
  notificationCopy: { flex: 1, minWidth: 0 },
  notificationItemHeading: { flexDirection: 'row', alignItems: 'center' },
  notificationKicker: { color: '#795463', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  notificationLiveBadge: { marginLeft: 7, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: '#E47780' },
  notificationNewBadge: { marginLeft: 7, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: '#8C5D83' },
  notificationLiveText: { color: '#FFF9ED', fontSize: 7, fontWeight: '900' },
  notificationItemTitle: { color: '#50364D', fontSize: 12, lineHeight: 16, fontWeight: '800', marginTop: 2 },
  notificationItemBody: { color: '#765762', fontSize: 9, lineHeight: 13, fontWeight: '600', marginTop: 1 },
  notificationChevron: { color: '#A98787', fontSize: 25, lineHeight: 27, marginLeft: 5 },
  noticeToast: { position: 'absolute', zIndex: 30, top: 78, left: 15, right: 15, minHeight: 44, paddingHorizontal: 13, borderRadius: 15, backgroundColor: '#503B65', flexDirection: 'row', alignItems: 'center', shadowColor: '#3E294D', shadowOpacity: 0.23, shadowRadius: 9, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  noticeToastText: { flex: 1, color: '#FFF8ED', fontSize: 11, fontWeight: '800' },
  noticeToastClose: { color: '#F5CED2', fontSize: 21, marginLeft: 8 },
  screenBody: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingTop: 13, paddingBottom: 105 },
  timeScrollContent: { paddingHorizontal: 14, paddingTop: 0, alignItems: 'center' },
  homeScreenBackground: { flex: 1 },
  brandWrap: { width: 124, height: 48, alignItems: 'flex-start', justifyContent: 'center' },
  headerLogoImage: { width: 120, height: 47 },
  headerSpacer: { flex: 1 },
  brand: { color: '#5A3A6A', fontSize: 25, lineHeight: 28, fontWeight: '900', letterSpacing: 1.3 },
  brandSub: { color: '#806189', fontSize: 10, fontWeight: '900', letterSpacing: 2.2, marginTop: -2 },
  homeRoom: { flex: 1, position: 'relative', overflow: 'hidden' },
  homeShelfBase: { position: 'absolute', top: '-15%', left: 0, right: 0, width: '100%', height: '100%', zIndex: 0 },
  homeGarland: { position: 'absolute', top: -27, left: 5, width: 430, height: 138, zIndex: 1, opacity: 0.86 },
  homeDecorPlant: { position: 'absolute', left: -5, bottom: 63, width: 108, height: 144, zIndex: 4, opacity: 0.9 },
  homeDecorCushions: { position: 'absolute', right: 5, bottom: 78, width: 112, height: 74, zIndex: 5, opacity: 0.9 },
  homeDecorAsset: { width: '100%', height: '100%' },
  homeEditButton: { position: 'absolute', top: 4, right: 14, zIndex: 24, width: 72, height: 34, alignItems: 'center', justifyContent: 'center' },
  homeEditButtonAsset: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', paddingBottom: 1 },
  homeEditButtonActive: {},
  homeEditButtonText: { color: '#6B4A62', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  homeEditButtonTextActive: { color: '#FFF9EC', textShadowColor: 'rgba(89,46,56,0.32)', textShadowRadius: 2 },
  homeEditGuide: { position: 'absolute', left: 16, right: 16, bottom: 82, zIndex: 24, minHeight: 54, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(83,58,101,0.95)', borderWidth: 1.2, borderColor: '#E8C9D8', shadowColor: '#3E294D', shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  homeEditGuideTitle: { color: '#F7D7E3', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  homeEditGuideText: { color: '#FFF9EB', fontSize: 11, fontWeight: '900', textAlign: 'center', marginTop: 2 },
  // Nine keychains are distributed over two broad rows so the center stage
  // remains clear for the selected Mobby and the shelf below.
  homeWallKeys: { position: 'absolute', top: '7%', left: '7%', right: '7%', height: '43%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', alignContent: 'flex-start', zIndex: 2 },
  homeWallKey: { width: '20%', height: '43%', alignItems: 'center', justifyContent: 'flex-start', borderRadius: 12, position: 'relative', overflow: 'visible', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  homeWallKeySelected: { backgroundColor: 'rgba(255,244,196,0.34)', shadowColor: '#FFF0A8', shadowOpacity: 0.8, shadowRadius: 9, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  homeWallKeyHidden: { opacity: 0 },
  homeWallKeyStolen: { zIndex: 18 },
  homeWallKeyReturning: { zIndex: 12 },
  homeWallReturningImage: { opacity: 0.74 },
  homeWallStolenMarker: { position: 'absolute', top: -16, left: -10, right: -10, height: 152, borderRadius: 22, borderWidth: 3, alignItems: 'center', justifyContent: 'center', shadowColor: '#F32D48', shadowOpacity: 0.8, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 16 },
  homeWallStolenGhost: { position: 'absolute', top: 22, width: 92, height: 102, opacity: 0.2, tintColor: '#441723' },
  homeWallStolenGhostSmall: { width: 74, height: 84, top: 28 },
  homeWallBrokenCord: { position: 'absolute', top: 9, left: '50%', width: 48, height: 48, marginLeft: -24 },
  homeWallBrokenCordLeft: { position: 'absolute', left: 13, top: 0, width: 4, height: 30, borderRadius: 2, backgroundColor: '#D83C4D', transform: [{ rotate: '18deg' }] },
  homeWallBrokenCordRight: { position: 'absolute', right: 11, top: 3, width: 4, height: 25, borderRadius: 2, backgroundColor: '#D83C4D', transform: [{ rotate: '-23deg' }] },
  homeWallCaseTag: { position: 'absolute', top: 4, left: 4, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: '#27131D', borderWidth: 1, borderColor: '#FF8994' },
  homeWallCaseTagText: { color: '#FFE6D7', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  homeWallStolenBand: { position: 'absolute', left: -8, right: -8, top: 54, height: 35, backgroundColor: '#B8273E', borderTopWidth: 2, borderBottomWidth: 2, borderColor: '#FFD0B8', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] },
  homeWallStolenBandText: { color: '#FFF9E8', fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },
  homeWallStolenName: { position: 'absolute', left: 2, right: 2, bottom: 23, color: '#FFF1DE', fontSize: 12, fontWeight: '900', textAlign: 'center', textShadowColor: '#35101B', textShadowRadius: 3 },
  homeWallResume: { position: 'absolute', bottom: 4, color: '#FFCFB6', fontSize: 10, fontWeight: '900', letterSpacing: 0.1 },
  homeDecorationEditable: { borderWidth: 1.2, borderColor: 'rgba(107,84,125,0.48)', borderStyle: 'dashed', backgroundColor: 'rgba(255,250,232,0.18)' },
  homeDecorationTarget: { borderColor: '#D5748B', backgroundColor: 'rgba(255,225,232,0.34)' },
  homeDecorationEditSelected: { borderWidth: 2.5, borderStyle: 'solid', borderColor: '#6B547D', backgroundColor: 'rgba(255,244,196,0.56)', shadowColor: '#FFF0A8', shadowOpacity: 0.88, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 7 },
  homeSlotBadge: { position: 'absolute', top: -8, right: -5, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6B547D', borderWidth: 1.5, borderColor: '#FFF9EA', zIndex: 8 },
  homeSlotBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  homeWallHook: { position: 'absolute', top: -25, left: '50%', width: 54, height: 81, marginLeft: -27, zIndex: 0 },
  homeWallKeySwing: { alignItems: 'center', transformOrigin: '50% 0%', marginTop: 11 },
  // The hook plate's round center is the hanging point. Start each keychain
  // there so the chain visibly comes out of the center of the wood hook.
  homeWallKeyImage: { width: 96, height: 106 },
  homeWallSmallKeyImage: { width: 76, height: 84 },
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
  homePlushSwing: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'flex-end', transformOrigin: '50% 100%' },
  homePlushItemSelected: { backgroundColor: 'rgba(255,244,196,0.32)', shadowColor: '#FFF0A8', shadowOpacity: 0.8, shadowRadius: 9, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  homePlushImage: { width: 70, height: 80 },
  homePlushSlotBadge: { top: -5, right: -4 },
  homeSelectablePressed: { opacity: 0.74, transform: [{ scale: 0.96 }] },
  homeCharacterPicker: { position: 'absolute', left: 14, right: 14, bottom: 82, alignItems: 'center', zIndex: 24 },
  homeCharacterPickerCompact: { bottom: 52 },
  homeCharacterSelectButton: { minWidth: 152, minHeight: 47, paddingHorizontal: 17, paddingVertical: 6, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,249,237,0.95)', borderWidth: 1.2, borderColor: '#DDB997', shadowColor: '#684B4B', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4, outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  homeCharacterSelectEyebrow: { color: '#A07B78', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  homeCharacterSelectName: { color: '#6B4A62', fontSize: 13, fontWeight: '900', marginTop: 1, maxWidth: 170 },
  homeCharacterSelectHint: { color: '#9C7774', fontSize: 8, fontWeight: '800', marginTop: 1 },
  homeCharacterPickerOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 70 },
  homeCharacterPickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(54,36,54,0.24)', zIndex: 30 },
  homeCharacterPickerMenu: { position: 'absolute', left: 12, right: 12, bottom: 112, height: 334, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 22, shadowColor: '#3E294D', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10, zIndex: 40 },
  homeCharacterPickerMenuCompact: { bottom: 100 },
  homeCharacterPickerMenuHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 6, marginBottom: 8 },
  homeCharacterPickerTitle: { color: '#6B4A62', fontSize: 14, fontWeight: '900', letterSpacing: 0.4 },
  homeCharacterPickerClose: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4DFD7' },
  homeCharacterPickerCloseText: { color: '#76516C', fontSize: 18, lineHeight: 20, marginTop: -1 },
  homeCharacterOptions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 5 },
  homeCharacterOption: { width: '31.8%', minHeight: 75, paddingVertical: 4, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  homeCharacterOptionSelected: { backgroundColor: '#F8E7BD', borderColor: '#DCA66D' },
  homeCharacterOptionImage: { width: 51, height: 55 },
  homeCharacterOptionName: { width: '100%', color: '#76516C', fontSize: 9, fontWeight: '900', textAlign: 'center', marginTop: 1 },
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
  wallFlightSmallImage: { width: 66, height: 73 },
  wallFlightTrail: { position: 'absolute', left: 0, top: 0, width: 84, height: 92, borderRadius: 46, backgroundColor: 'rgba(255,242,166,0.5)', borderWidth: 4, borderColor: '#FFF1A8' },
  wallLandingBurst: { position: 'absolute', width: 76, height: 76, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,244,176,0.44)', borderWidth: 3, borderColor: '#FFF4B6', zIndex: 2 },
  wallLandingBurstText: { color: '#FFF8CA', fontSize: 42, fontWeight: '900', textShadowColor: '#C7748D', textShadowRadius: 8 },
  collectionHeaderBar: { position: 'absolute', top: 8, left: 18, right: 18, height: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 },
  collectionScreenBackground: { flex: 1, backgroundColor: 'transparent' },
  collectionScrollContent: { flex: 1, position: 'relative' },
  collectionBoardShadow: { position: 'absolute', top: 84, left: 30, width: 380, borderRadius: 36, backgroundColor: 'rgba(72,44,31,0.24)', shadowColor: '#3D281F', shadowOpacity: 0.42, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 11, zIndex: 1 },
  collectionDisplayBoard: { position: 'absolute', top: COLLECTION_BOARD_TOP, left: 25, width: 390, borderRadius: 36, overflow: 'hidden', zIndex: 2 },
  collectionHeaderCopy: { width: 145, height: 37, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingBottom: 1 },
  collectionHeaderTitle: { color: '#563C50', fontSize: 14, lineHeight: 18, fontWeight: '900', letterSpacing: 0.2, fontFamily: 'MochiyPopOne_400Regular' },
  collectionModeTabs: { height: 36, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 5 },
  collectionModeTab: { minWidth: 74, height: 25, paddingHorizontal: 10, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  collectionModeTabActive: { backgroundColor: '#70556E', shadowColor: '#513B4E', shadowOpacity: 0.16, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  collectionModeText: { color: '#876C7D', fontSize: 10, fontWeight: '800' },
  collectionModeTextActive: { color: '#FFF9ED' },
  collectionKeySizeTabs: { position: 'absolute', top: 51, right: 27, height: 25, flexDirection: 'row', alignItems: 'center', gap: 3, zIndex: 10 },
  collectionKeySizeLabel: { color: '#8B6B79', fontSize: 8, fontWeight: '800', marginRight: 2 },
  collectionKeySizeTab: { minWidth: 29, height: 23, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  collectionKeySizeTabActive: { backgroundColor: 'rgba(255,248,232,0.9)' },
  collectionKeySizeText: { color: '#967584', fontSize: 9, fontWeight: '800' },
  collectionKeySizeTextActive: { color: '#65475E' },
  collectionDisplay: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'transparent', overflow: 'visible', zIndex: 3 },
  collectionDisplayPlush: { backgroundColor: 'transparent' },
  keyCollectionGrid: { ...StyleSheet.absoluteFillObject },
  collectionKeyItem: { width: 104, alignItems: 'center' },
  collectionKeyItemAnchored: { position: 'absolute' },
  collectionKeyPressable: { alignItems: 'center', outlineColor: 'transparent', outlineWidth: 0 },
  collectionKeySwing: { alignItems: 'center', transformOrigin: '50% 0%' },
  collectionKeyHookOwned: { height: 0 },
  collectionKeyBody: { width: 55, height: 70, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(91,64,75,0.28)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  collectionKeyBodyOwned: { width: 104, height: 122, borderRadius: 0, borderWidth: 0, borderColor: 'transparent', backgroundColor: 'transparent', overflow: 'visible' },
  collectionKeySelected: { transform: [{ scale: 1.06 }] },
  collectionKeyImage: { width: 104, height: 122 },
  collectionSmallKeyImage: { width: 81, height: 95 },
  collectionKeyName: { width: 104, color: '#503645', fontSize: 8, fontWeight: '700', textAlign: 'center', marginTop: 1, textShadowColor: '#FFF4DC', textShadowRadius: 2 },
  collectionLocked: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(96,80,94,0.52)', alignItems: 'center', justifyContent: 'center' },
  collectionLockedText: { color: '#FFF7E6', fontSize: 27, fontWeight: '900' },
  plushCollectionShelf: { ...StyleSheet.absoluteFillObject },
  plushCollectionItem: { position: 'absolute', width: 110, height: 134, alignItems: 'center' },
  plushCollectionBody: { width: 110, height: 120, borderRadius: 28, borderWidth: 1.4, borderColor: 'rgba(86,58,58,0.27)', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  plushCollectionBodyOwned: { width: 110, height: 120, borderRadius: 0, borderWidth: 0, borderColor: 'transparent', backgroundColor: 'transparent', overflow: 'visible' },
  plushCollectionSelected: { transform: [{ scale: 1.05 }] },
  plushCollectionImage: { position: 'absolute', width: 110, height: 120 },
  collectionPlushName: { width: 110, color: '#503645', fontSize: 8, fontWeight: '700', textAlign: 'center', textShadowColor: '#FFF4DC', textShadowRadius: 2, marginTop: 1 },
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
  timeHeader: { alignSelf: 'stretch', height: 110, alignItems: 'center', paddingTop: 1, paddingHorizontal: 18 },
  timeTitle: { color: '#4B304B', fontSize: 22, lineHeight: 25, fontWeight: '900', letterSpacing: 0.4, textAlign: 'center', fontFamily: Platform.select({ ios: 'Hiragino Maru Gothic ProN', default: undefined }) },
  bigTitle: { color: '#4D3455', fontSize: 29, fontWeight: '900', letterSpacing: 1.2, marginTop: 3 },
  timeHeaderSub: { color: '#5D4051', fontSize: 10, lineHeight: 13, fontWeight: '700', marginTop: 0, textAlign: 'center', textShadowColor: '#FFF6E7', textShadowRadius: 4 },
  bigTimer: { marginTop: -2, width: 184, height: 66, alignItems: 'center', justifyContent: 'center', paddingTop: 2 },
  bigTimerLabel: { color: '#694A5C', fontSize: 8, lineHeight: 9, fontWeight: '900' },
  bigTimerValue: { color: '#422A43', fontSize: 24, lineHeight: 26, fontWeight: '900', letterSpacing: 1.4 },
  bigTimerUnit: { color: '#7F5C6D', fontSize: 7, lineHeight: 8, fontWeight: '900', letterSpacing: 0.8 },
  encounterCard: { alignSelf: 'center', paddingTop: 47, paddingHorizontal: 39, paddingBottom: 18 },
  encounterCardImage: { borderRadius: 24 },
  arrivalNotice: { minHeight: 35, marginBottom: 0, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  arrivalNoticeText: { color: '#4E3348', fontSize: 12, lineHeight: 16, fontWeight: '900', textAlign: 'center', textShadowColor: '#FFF4DE', textShadowRadius: 3 },
  encounterScene: { height: 306, borderRadius: 26, overflow: 'visible', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  packageAnimationWrap: { ...StyleSheet.absoluteFillObject, zIndex: 3, alignItems: 'center', justifyContent: 'center', paddingTop: 22 },
  mobbyPackage: { width: 242, height: 242, alignItems: 'center', justifyContent: 'center', position: 'relative', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  packagePressed: { transform: [{ rotate: '1deg' }, { scale: 0.96 }] },
  packageAsset: { position: 'absolute', width: 242, height: 242 },
  packageBrandOverlay: { position: 'absolute', top: 144, left: 54, right: 54, height: 43, alignItems: 'center', justifyContent: 'center' },
  packageLogo: { color: '#68465F', fontSize: 15, lineHeight: 17, fontWeight: '900', letterSpacing: 1.6 },
  packageHint: { color: '#8B6774', fontSize: 6, fontWeight: '900', letterSpacing: 1.1, marginTop: 2 },
  packageCaptionSpacer: { height: 15 },
  magicParticles: { ...StyleSheet.absoluteFillObject, zIndex: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 28 },
  magicParticle: { color: '#FFF7B8', fontSize: 32, fontWeight: '900', textShadowColor: '#D98FA0', textShadowRadius: 8 },
  encounterOpenedBox: { position: 'absolute', top: 18, left: '50%', width: 300, height: 300, marginLeft: -150, zIndex: 2 },
  encounterRewardWrap: { width: 286, height: 312, alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  encounterKeyImage: { width: 286, height: 312 },
  encounterSmallKeyImage: { width: 222, height: 244 },
  encounterPlushImage: { width: 222, height: 246 },
  placementSparkles: { ...StyleSheet.absoluteFillObject, zIndex: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 18 },
  placementSparkle: { color: '#FFF4A8', fontSize: 27, fontWeight: '900', textShadowColor: '#C96F8B', textShadowRadius: 7 },
  newBadge: { position: 'absolute', left: 7, bottom: 4, width: 72, height: 72, alignItems: 'center', justifyContent: 'center', paddingBottom: 12, transform: [{ rotate: '-7deg' }], zIndex: 5 },
  newBadgeText: { color: '#FFF8ED', fontSize: 11, fontWeight: '900', letterSpacing: 0.6, textShadowColor: 'rgba(91,58,76,0.34)', textShadowRadius: 2 },
  encounterSilhouette: { width: 154, height: 194, borderRadius: 75, alignItems: 'center', justifyContent: 'center', opacity: 0.64, borderWidth: 4, borderColor: 'rgba(67,55,69,0.26)' },
  silhouetteEyes: { color: '#5D5367', fontSize: 30, letterSpacing: 20, marginLeft: 17 },
  silhouetteQuestion: { color: '#5D5367', fontSize: 54, fontWeight: '900', marginTop: 13 },
  encounterImage: { width: 208, height: 246 },
  encounterBubble: { position: 'absolute', top: -2, right: -15, width: 158, height: 78, paddingHorizontal: 27, paddingTop: 17, paddingBottom: 20, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '3deg' }], zIndex: 6 },
  encounterBubbleTitle: { color: '#4E3048', fontSize: 10, lineHeight: 13, fontWeight: '900', textAlign: 'center', textShadowColor: '#FFF7E7', textShadowRadius: 2 },
  encounterBubbleText: { color: '#694B5A', fontSize: 8, lineHeight: 10, fontWeight: '800', marginTop: 1, textAlign: 'center' },
  encounterOpenButton: { alignSelf: 'center', width: 260, height: 52, borderRadius: 20, overflow: 'hidden', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent', shadowColor: '#6B3F4D', shadowOpacity: 0.28, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  encounterOpenButtonAsset: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', paddingLeft: 20, paddingRight: 48, paddingBottom: 1 },
  encounterOpenButtonText: { color: '#FFF9ED', fontFamily: 'MochiyPopOne_400Regular', fontSize: 12, lineHeight: 17, fontWeight: '900', letterSpacing: 0.15, textAlign: 'center', textShadowColor: 'rgba(92,45,54,0.42)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  encounterOpenButtonPressed: { opacity: 0.9, transform: [{ translateY: 2 }, { scale: 0.97 }] },
  encounterOpenButtonDisabled: { opacity: 0.58 },
  primaryButton: { minHeight: 49, borderRadius: 17, backgroundColor: '#6B547D', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 17 },
  primaryButtonDone: { backgroundColor: '#9A8491' },
  primaryButtonIcon: { width: 22, height: 22, marginRight: 5 },
  primaryButtonText: { color: '#FFF9EC', fontSize: 13, fontWeight: '900' },
  timePrimaryButton: { position: 'absolute', left: 63, bottom: 38, width: 244, height: 46, zIndex: 8, outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  timePrimaryButtonInactive: { opacity: 0.58 },
  timePrimaryButtonText: { color: '#5B3D54', textShadowColor: 'rgba(255,251,232,0.62)', textShadowRadius: 2 },
  assetButtonInner: { width: '100%', height: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 8, overflow: 'hidden' },
  touchTop: { paddingTop: 7, paddingBottom: 12 },
  touchTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  touchSub: { color: '#987480', fontSize: 11, fontWeight: '700', marginTop: 3 },
  rarityBadge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, marginLeft: 6 },
  rarityBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  touchScreenBackground: { flex: 1, backgroundColor: 'transparent' },
  touchScrollContent: { flex: 1, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 82 },
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
  characterPickerButton: { position: 'absolute', zIndex: 20, width: 68, height: 51, alignItems: 'center', justifyContent: 'center' },
  characterPickerButtonAsset: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', paddingBottom: 1 },
  characterPickerButtonLarge: { left: -68, top: '43%' },
  characterPickerButtonCompact: { left: -68, top: '41%' },
  characterPickerButtonPressed: { transform: [{ scale: 0.94 }], opacity: 0.88 },
  characterPickerCaption: { color: '#8B6D91', fontSize: 8, fontWeight: '800', lineHeight: 11 },
  characterPickerValue: { color: '#68465F', fontSize: 11, fontWeight: '900', lineHeight: 15 },
  animeEffectLayer: { ...StyleSheet.absoluteFillObject, zIndex: 6 },
  animeBurstRayWrap: { ...StyleSheet.absoluteFillObject },
  animeBurstRay: { position: 'absolute', width: 3, borderRadius: 3, backgroundColor: 'rgba(255, 225, 151, 0.88)' },
  animeCheekTrail: { position: 'absolute', top: '39%', gap: 6 },
  animeCheekTrailLeft: { left: '2%', alignItems: 'flex-start', transform: [{ rotate: '-8deg' }] },
  animeCheekTrailRight: { right: '2%', alignItems: 'flex-end', transform: [{ rotate: '8deg' }] },
  animeCheekStroke: { height: 3, borderRadius: 3, borderWidth: 0.7, borderColor: 'rgba(196,128,105,0.45)', backgroundColor: 'rgba(255,231,181,0.88)' },
  animeSpeedGroup: { position: 'absolute', top: '31%', gap: 7 },
  animeSpeedGroupLeft: { left: '1%', alignItems: 'flex-start' },
  animeSpeedGroupRight: { right: '1%', alignItems: 'flex-end' },
  animeSpeedLine: { height: 3, borderRadius: 3, backgroundColor: 'rgba(211, 111, 82, 0.8)' },

  animeGloomLines: { position: 'absolute', left: '17%', top: '9%', flexDirection: 'row', gap: 7, alignItems: 'flex-start' },
  animeGloomLine: { width: 3, height: 27, borderRadius: 3, backgroundColor: 'rgba(103, 82, 120, 0.56)' },
  animeGloomLineShort: { height: 18 },

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
  tradeScreenScroll: { flex: 1 },
  tradeScrollContent: { paddingBottom: 92, alignItems: 'center' },
  tradeBoardTitle: { position: 'absolute', top: 18, left: 48, right: 48, alignItems: 'center', justifyContent: 'center', zIndex: 4 },
  tradeTitle: { color: '#4B3049', fontSize: 25, lineHeight: 31, fontWeight: '900', textAlign: 'center', letterSpacing: 0.45, textShadowColor: 'rgba(255,246,222,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 },
  tradeBoardAsset: { alignSelf: 'center', paddingTop: 81, paddingHorizontal: 43, paddingBottom: 27, borderRadius: 28, overflow: 'hidden' },
  tradeBoardAssetImage: { borderRadius: 28 },
  tradeCard: { backgroundColor: 'transparent' },
  tradeCardFirst: { minHeight: 0 },
  tradeCardSecond: { marginTop: 22 },
  tradeConnectHeading: { height: 30, alignItems: 'center', justifyContent: 'center' },
  tradeCharacterHeading: { height: 26, alignItems: 'center', justifyContent: 'center' },
  tradeSectionNo: { color: '#4D314A', fontSize: 16, lineHeight: 21, fontWeight: '900', textAlign: 'center', letterSpacing: 0.15, textShadowColor: 'rgba(255,247,225,0.86)', textShadowRadius: 3 },
  qrStage: { width: '100%', height: 96, marginTop: 2, paddingHorizontal: 18, paddingVertical: 7, alignItems: 'center', justifyContent: 'center' },
  qrPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  qrPlaceholderIcon: { width: 36, height: 40, opacity: 0.76, tintColor: '#694B65' },
  qrPlaceholderText: { color: '#56384D', fontSize: 11.5, lineHeight: 16, fontWeight: '700', marginTop: 0, textAlign: 'center' },
  qrCode: { padding: 5, backgroundColor: '#FFF', shadowColor: '#765466', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
  qrRow: { flexDirection: 'row' },
  qrCell: { backgroundColor: '#FFF' },
  qrCellOn: { backgroundColor: '#3C3142' },
  tradePrimaryButton: { alignSelf: 'center', width: 270, height: 48, marginTop: 4, overflow: 'hidden', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  tradeButtonIcon: { width: 20, height: 24, marginRight: 8, tintColor: '#684963' },
  tradePrimaryButtonText: { color: '#50344B', fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 0.15 },
  tradeButtonPressed: { opacity: 0.76 },
  tradeItemRow: { height: 150, flexDirection: 'row', alignItems: 'center', overflow: 'visible' },
  tradeItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tradeItemImage: { width: 140, height: 112, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  tradeImage: { width: 118, height: 116 },
  tradeSmallKeyImage: { width: 100, height: 104 },
  tradeItemName: { color: '#492E46', fontSize: 14, lineHeight: 19, fontWeight: '900', marginTop: 0, textAlign: 'center', letterSpacing: 0.1, textShadowColor: 'rgba(255,247,225,0.88)', textShadowRadius: 2 },
  tradeItemCount: { color: '#624454', fontSize: 10.5, lineHeight: 15, fontWeight: '700', textAlign: 'center', textShadowColor: 'rgba(255,247,225,0.8)', textShadowRadius: 2 },
  exchangeArrow: { width: 38, alignItems: 'center', justifyContent: 'center', marginHorizontal: 0 },
  exchangeArrowIcon: { width: 34, height: 41, tintColor: '#684B64' },
  partnerItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  partnerImage: { width: 140, height: 116, alignItems: 'center', justifyContent: 'center' },
  partnerWaitingIcon: { width: 84, height: 84, tintColor: '#765C72', opacity: 0.56 },
  partnerName: { color: '#573A4D', fontSize: 10.5, lineHeight: 15, fontWeight: '500', marginTop: 0, textAlign: 'center' },
  tradeChooseCharacterButton: { alignSelf: 'center', width: 280, height: 48, marginTop: 1, overflow: 'hidden', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  tradeChooseCharacterIcon: { width: 19, height: 23, marginRight: 7, tintColor: '#684B64' },
  tradeChooseCharacterText: { color: '#50344B', fontSize: 12.5, lineHeight: 18, fontWeight: '900', letterSpacing: 0.1 },
  secondaryButton: { alignSelf: 'center', width: 280, height: 46, alignItems: 'center', justifyContent: 'center', marginTop: 0, overflow: 'hidden', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  secondaryButtonDisabled: { opacity: 0.68 },
  secondaryButtonText: { color: '#50344B', fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 0.1 },
  tradeSelectionScreen: { flex: 1, position: 'relative' },
  tradeSelectionDisplay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3 },
  tradeCollectionItem: { position: 'absolute', width: 96, height: 116, alignItems: 'center', justifyContent: 'flex-start', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  tradeCollectionItemSelected: { transform: [{ scale: 1.08 }], zIndex: 5 },
  tradeCollectionItemPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  tradeCollectionVisual: { width: 94, height: 98, alignItems: 'center', justifyContent: 'flex-end', overflow: 'visible' },
  tradeCollectionKeyImage: { width: 88, height: 104 },
  tradeCollectionSmallKeyImage: { width: 69, height: 82 },
  tradeCollectionPlushImage: { position: 'absolute', width: 88, height: 96 },
  tradeCollectionLockedMark: { color: 'rgba(83,61,76,0.56)', fontSize: 30, lineHeight: 34, fontWeight: '900', textShadowColor: 'rgba(255,245,220,0.72)', textShadowRadius: 3, marginBottom: 25 },
  tradeCollectionName: { width: 96, color: '#4F3546', fontSize: 10.5, lineHeight: 14, fontWeight: '800', textAlign: 'center', textShadowColor: '#FFF4DC', textShadowRadius: 3, marginTop: 0 },
  tradeCollectionNameLocked: { color: '#806A72' },
  tradeCollectionMarker: { position: 'absolute', top: -5, right: -2, width: 38, height: 38, alignItems: 'center', justifyContent: 'center', zIndex: 7 },
  tradeCollectionMarkerText: { color: '#FFF9EA', fontSize: 14, lineHeight: 17, fontWeight: '900', textShadowColor: '#6C425D', textShadowRadius: 2, marginTop: -1 },
  tradeSelectionHeaderCopy: { width: 178 },
  tradeSelectionHeaderTitle: { fontSize: 13, lineHeight: 17 },
  tradeVariantTab: { minWidth: 62, paddingHorizontal: 7 },
  tradeVariantTabText: { fontSize: 8 },
  tradeSelectionActions: { position: 'absolute', left: 29, right: 29, bottom: 91, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 12 },
  tradeSelectionBackButton: { width: 94, height: 48, overflow: 'hidden', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  tradeSelectionBackText: { color: '#62455B', fontSize: 12, lineHeight: 17, fontWeight: '900' },
  tradeSelectionConfirmButton: { width: 250, height: 50, overflow: 'hidden', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  tradeSelectionConfirmButtonDisabled: { opacity: 0.5 },
  tradeSelectionConfirmText: { color: '#FFF9ED', fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 0.2, textShadowColor: 'rgba(104,61,69,0.42)', textShadowRadius: 2 },
  bottomNav: { position: 'absolute', left: 8, width: DESIGN_WIDTH - 16, bottom: Platform.OS === 'web' ? 9 : 3, height: 74, shadowColor: '#624651', shadowOpacity: 0.16, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  bottomNavAsset: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  navTab: { position: 'absolute', top: 9, height: 55, borderRadius: 18, alignItems: 'center', justifyContent: 'center', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  navTabPressed: { opacity: 0.72 },
  navIcon: { width: 24, height: 24, tintColor: '#A48189', marginBottom: 2 },
  navCaseIcon: { width: 22, height: 22 },
  navIconActive: { tintColor: '#705178' },
  navLabel: { color: '#80626B', fontSize: 9, fontWeight: '700' },
  navLabelActive: { color: '#694B70' },
  navIncidentBadge: { position: 'absolute', top: 1, right: 9, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C65F6D', borderWidth: 1.2, borderColor: '#FFF8EB' },
  navIncidentBadgeText: { color: '#FFF8EC', fontSize: 9, lineHeight: 11, fontWeight: '900' },
  navDot: { position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: '#D17B8C' },
  pressed: { opacity: 0.74, transform: [{ translateY: 1 }] },
});
