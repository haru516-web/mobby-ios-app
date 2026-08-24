import { useCallback, useEffect, useMemo, useRef, useState, type ElementRef, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo, Animated, Easing, Image, ImageBackground, PanResponder, Platform, Pressable, View, type LayoutChangeEvent } from 'react-native';

import { CharacterPickerPopover, type CharacterPickerCharacter } from '@/components/home/CharacterPickerPopover';
import { HomeInventoryTray } from '@/components/home/HomeInventoryTray';
import { HomeTeaseTools, type HomeTeaseToolSelection } from '@/components/home/HomeTeaseTools';
import { MobbyIdleMotion } from '@/components/mobby';
import { MobbyAssetButton } from '@/components/mobby-ui';
import { PullableMobby } from '@/components/mobby/PullableMobby';
import { ReactionCollectionPopover } from '@/components/home/ReactionCollectionPopover';
import { EMPTY_OWNED, ITEM_ENEMY_IDS, ITEM_MOBBY_IDS, collectibleImage, itemCharacterName, ownedCollectibleCount, type CollectibleVariant, type Item } from '@/data/collectibles';
import { ALL_REACTION_IDS, REACTION_STICKERS, normalizeCollectedReactionIds, REACTION_COLLECTION_STORAGE_KEY, type ReactionSticker } from '@/data/reactionCollection';
import { getCharacterProfile, toBlackStarCharacterId } from '@/domain/characters/roster';
import type { CharacterId } from '@/domain/characters/types';
import { useGachaTheme } from '@/theme/GachaThemeContext';
import {
  HOME_SHELF_SLOT_COUNT,
  HOME_WALL_SLOT_COUNT,
  moveHomePlacement,
  ownedHomePlacementIds,
  resolveHomePlacement,
  type HomeLayoutV1,
  type HomePlacementId,
  type HomePlacementKind,
} from '@/domain/home/homeLayout';
import { styles } from '@/ui/layout/appStyles';
import { Text, useAppLayout } from '@/ui/layout/visualPrimitives';

const HOME_GARLAND = require('../../../assets/backgrounds/home-garland-trimmed-v1.png');
const WOODEN_HOOK = require('../../../assets/backgrounds/hook-transparent.png');
const PLUSH_SHELF_BASE = require('../../../assets/backgrounds/plush-base-transparent.png');
const SPEECH_BUBBLE_PAPER = require('../../../assets/generated-ui/speech-bubble-paper-v1.png');
const HOME_CONTROL_BUTTON_BACKGROUND = require('../../../assets/generated-ui/home-control-button-v1.png');

const PLUSH_VISIBLE_BOTTOM_RATIO: Record<string, number> = {
  'mobiyan-plush': 0.952,
  'mobibou-plush': 0.918,
  'mobiyura-plush': 0.909,
  'pote-plush': 0.888,
};
const PLUSH_CONTACT_REFERENCE = PLUSH_VISIBLE_BOTTOM_RATIO['mobiyan-plush'];

type HomeKeySwing = (notify?: boolean) => void;

const HOME_WALL_COLUMNS = 5;
const HOME_WALL_ROWS = Math.ceil(HOME_WALL_SLOT_COUNT / HOME_WALL_COLUMNS);

type HomeDropFrame = { x: number; y: number; width: number; height: number };

type HomeDragSession = {
  id: HomePlacementId;
  kind: HomePlacementKind;
  origin: 'slot' | 'tray';
  originIndex: number | null;
  baseLayout: HomeLayoutV1;
  previewLayout: HomeLayoutV1;
  targetIndex: number | null;
  pageX: number;
  pageY: number;
};

function DraggableHomePlacement({ children, disabled, editing, index, onCancel, onDragMove, onDragStart, onDrop, onTap, reduceMotion }: {
  children: ReactNode;
  disabled?: boolean;
  editing: boolean;
  index: number;
  onCancel: () => void;
  onDragMove: (pageX: number, pageY: number) => void;
  onDragStart: (pageX: number, pageY: number) => void;
  onDrop: (pageX: number, pageY: number) => void;
  onTap: () => void;
  reduceMotion: boolean;
}) {
  const jiggle = useRef(new Animated.Value(0)).current;
  const nativeDriver = Platform.OS !== 'web';
  const callbacksRef = useRef({ onCancel, onDragMove, onDragStart, onDrop, onTap });
  callbacksRef.current = { onCancel, onDragMove, onDragStart, onDrop, onTap };

  useEffect(() => {
    jiggle.stopAnimation();
    jiggle.setValue(0);
    if (!editing || reduceMotion || disabled) return undefined;
    const motion = Animated.loop(Animated.sequence([
      Animated.delay((index % 4) * 22),
      Animated.timing(jiggle, { toValue: -1, duration: 92, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
      Animated.timing(jiggle, { toValue: 1, duration: 184, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
      Animated.timing(jiggle, { toValue: 0, duration: 92, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
    ]));
    motion.start();
    return () => motion.stop();
  }, [disabled, editing, index, jiggle, nativeDriver, reduceMotion]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => editing && !disabled,
    onStartShouldSetPanResponderCapture: () => editing && !disabled,
    onMoveShouldSetPanResponder: (_event, gesture) => editing && !disabled && Math.hypot(gesture.dx, gesture.dy) > 4,
    onMoveShouldSetPanResponderCapture: (_event, gesture) => editing && !disabled && Math.hypot(gesture.dx, gesture.dy) > 4,
    onPanResponderGrant: (event) => {
      callbacksRef.current.onDragStart(event.nativeEvent.pageX, event.nativeEvent.pageY);
    },
    onPanResponderMove: (event) => {
      callbacksRef.current.onDragMove(event.nativeEvent.pageX, event.nativeEvent.pageY);
    },
    onPanResponderRelease: (event, gesture) => {
      if (Math.hypot(gesture.dx, gesture.dy) > 5) callbacksRef.current.onDrop(event.nativeEvent.pageX, event.nativeEvent.pageY);
      else callbacksRef.current.onTap();
    },
    onPanResponderTerminate: () => {
      callbacksRef.current.onCancel();
    },
    onPanResponderTerminationRequest: () => false,
  }), [disabled, editing]);

  return <Animated.View
    style={[
      styles.homeArrangeDraggable,
      {
        transform: [
          { rotate: jiggle.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-1.8deg', '0deg', '1.8deg'] }) },
        ],
      },
    ]}
  >
    <View style={styles.homeArrangeContent}>{children}</View>
    {editing && !disabled ? <View {...panResponder.panHandlers} style={styles.homeArrangeGestureSurface} /> : null}
  </Animated.View>;
}

function HomeWallKeychain({ item, placementId, variant, index, selectedId, ownedCount, incidentState, editSelected, editing, onPress, onEditPress, onEditStart, onSwing, registerSwing }: {
  item: Item;
  placementId: HomePlacementId;
  variant: Exclude<CollectibleVariant, 'plush'>;
  index: number;
  selectedId: string;
  ownedCount: number;
  incidentState: 'normal' | 'stolen' | 'returning' | 'placement-hidden';
  editSelected: boolean;
  editing: boolean;
  onPress?: () => void;
  onEditPress: () => void;
  onEditStart: () => void;
  onSwing: () => void;
  registerSwing?: (id: string, swing: HomeKeySwing) => void | (() => void);
}) {
  const rotation = useRef(new Animated.Value(0)).current;
  const owned = ownedCount > 0;
  const swing = useCallback((notify = true) => {
    if (!owned || incidentState === 'stolen' || incidentState === 'returning') return;
    if (notify) onSwing();
    Animated.sequence([
      Animated.timing(rotation, { toValue: 1, duration: 120, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(rotation, { toValue: 0, speed: 17, bounciness: 7, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [incidentState, onSwing, owned, rotation]);
  useEffect(() => {
    const unregister = registerSwing?.(placementId, swing);
    return typeof unregister === 'function' ? unregister : undefined;
  }, [placementId, registerSwing, swing]);
  const name = item.name.replace(' ぬいキー', '').replace(' ぬい', '');
  const variantName = variant === 'key-small' ? 'Sぬいキー' : '通常ぬいキー';
  const copyNumber = resolveHomePlacement(placementId)?.copyNumber ?? 1;
  const copyLabel = ownedCount > 1 ? ` ${copyNumber}個目／${ownedCount}個中` : '';
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={incidentState === 'stolen' ? `${name}${copyLabel}のおはなしを続ける` : editing && owned && incidentState === 'normal' ? `${name} ${variantName}${copyLabel}を移動` : owned ? `${name} ${variantName}${copyLabel}を揺らす` : `未所持の壁フック${index + 1}`}
    accessibilityState={{ selected: editSelected, disabled: incidentState !== 'stolen' && (!owned || (editing && incidentState !== 'normal')) }}
    disabled={incidentState !== 'stolen' && (!owned || (editing && incidentState !== 'normal'))}
    delayLongPress={420}
    onLongPress={() => { if (!editing && owned && incidentState === 'normal') onEditStart(); }}
    onPress={() => { if (incidentState === 'stolen') onPress?.(); else if (editing && owned && incidentState === 'normal') onEditPress(); else if (!editing) swing(); }}
    style={({ pressed }) => [
      styles.homeWallKey,
      owned && item.id === selectedId && styles.homeWallKeySelected,
      editSelected && styles.homeReorderSelected,
      incidentState === 'placement-hidden' && styles.homeWallKeyHidden,
      incidentState === 'stolen' && styles.homeWallKeyStolen,
      incidentState === 'returning' && styles.homeWallKeyReturning,
      pressed && styles.homeSelectablePressed,
    ]}
  >
    <Image source={WOODEN_HOOK} resizeMode="contain" style={styles.homeWallHook} />
    {incidentState === 'stolen' ? <View style={styles.homeWallStolenMarker}>
      <Image source={collectibleImage(item, variant)} resizeMode="contain" style={[styles.homeWallStolenGhost, variant === 'key-small' && styles.homeWallStolenGhostSmall]} />
      <View style={styles.homeWallCaseTag}><Text style={styles.homeWallCaseTagText}>STORY 04</Text></View>
      <View style={styles.homeWallStolenBand}><Text style={styles.homeWallStolenBandText}>おでかけ中</Text></View>
      <Text numberOfLines={1} style={styles.homeWallStolenName}>{name}</Text>
      <Text style={styles.homeWallResume}>タップして続きを見る</Text>
    </View> : owned ? <Animated.View style={[styles.homeWallKeySwing, { transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '18deg'] }) }] }]}>
      <Image source={collectibleImage(item, variant)} resizeMode="contain" style={[styles.homeWallKeyImage, variant === 'key-small' && styles.homeWallSmallKeyImage, incidentState === 'returning' && styles.homeWallReturningImage]} />
    </Animated.View> : null}
  </Pressable>;
}

export function HomeScreenVisual({ selected, characters, onSelectCharacter, owned = EMPTY_OWNED, incidentWallItemId, incidentWallState, placementHiddenWallPlacementId, onIncidentPress, homeLayout, onCommitHomeLayout, onMoveHomePlacement, onRemoveHomePlacement, onArrangeStart, onArrangeMove, onUiTap, onInteract, onKeychainSwing, reaction, dailyHydrated = true, onDailyPullRelease, onDailyReaction, entryNonce = 0 }: {
  selected: Item;
  characters: readonly CharacterPickerCharacter[];
  onSelectCharacter: (id: string) => boolean;
  owned?: Record<string, number>;
  incidentWallItemId?: string;
  incidentWallState: 'none' | 'stolen' | 'returning';
  placementHiddenWallPlacementId?: HomePlacementId;
  onIncidentPress: () => void;
  homeLayout: HomeLayoutV1;
  onCommitHomeLayout: (layout: HomeLayoutV1) => void;
  onMoveHomePlacement: (placementId: HomePlacementId, targetIndex: number) => void;
  onRemoveHomePlacement: (placementId: HomePlacementId) => void;
  onArrangeStart?: () => void;
  onArrangeMove?: () => void;
  onUiTap: () => void;
  onInteract: (kind: string) => number;
  onKeychainSwing: () => void;
  reaction: string;
  dailyHydrated?: boolean;
  onDailyPullRelease?: () => Promise<void>;
  onDailyReaction?: (reactionId: string) => void;
  entryNonce?: number;
}) {
  const { activeTheme } = useGachaTheme();
  const { height } = useAppLayout();
  const compact = height < 780;
  const [roomSize, setRoomSize] = useState({ width: 440, height: 646 });
  const [homeLayoutReady, setHomeLayoutReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [inventoryKind, setInventoryKind] = useState<HomePlacementKind>('wall');
  const [inventoryKeyVariant, setInventoryKeyVariant] = useState<Exclude<CollectibleVariant, 'plush'>>('key-normal');
  const [placementSelection, setPlacementSelection] = useState<HomePlacementId | null>(null);
  const [dragSession, setDragSession] = useState<HomeDragSession | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const selectedCharacterId: CharacterId = ITEM_ENEMY_IDS[selected.id]
    ? toBlackStarCharacterId(ITEM_ENEMY_IDS[selected.id])
    : ITEM_MOBBY_IDS[selected.id] ?? 'mobichi';
  const selectedCharacter = getCharacterProfile(selectedCharacterId);
  const [characterPickerOpen, setCharacterPickerOpen] = useState(false);
  const [reactionBookOpen, setReactionBookOpen] = useState(false);
  const [reactionTabId, setReactionTabId] = useState<CharacterId>(selectedCharacterId);
  const [collectedReactionIds, setCollectedReactionIds] = useState<string[]>(() => __DEV__ ? [...ALL_REACTION_IDS] : []);
  const [activeTeaseTool, setActiveTeaseTool] = useState<HomeTeaseToolSelection | null>(null);
  const [activeTeaseReaction, setActiveTeaseReaction] = useState<ReactionSticker | null>(null);
  const entryMotion = useRef(new Animated.Value(0)).current;
  const teaseToolMotion = useRef(new Animated.Value(0)).current;
  const teaseToolAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const entryPlayedRef = useRef<string | null>(null);
  const entryAnimationFinishedRef = useRef(false);
  const keySwingsRef = useRef<Record<string, HomeKeySwing>>({});
  const roomRef = useRef<ElementRef<typeof View>>(null);
  const wallGridRef = useRef<ElementRef<typeof View>>(null);
  const shelfGridRef = useRef<ElementRef<typeof View>>(null);
  const roomWindowRef = useRef({ x: 0, y: 0 });
  const wallDropFrameRef = useRef<HomeDropFrame>({ x: 30, y: 40, width: 378, height: 278 });
  const shelfDropFrameRef = useRef<HomeDropFrame>({ x: 35, y: 280, width: 370, height: 116 });
  const dragSessionRef = useRef<HomeDragSession | null>(null);
  const visualLayout = dragSession?.previewLayout ?? homeLayout;
  const wallPlacements = useMemo(() => visualLayout.wallSlots.map(resolveHomePlacement), [visualLayout.wallSlots]);
  const shelfPlacements = useMemo(() => visualLayout.shelfSlots.map(resolveHomePlacement), [visualLayout.shelfSlots]);
  const renderedWallPlacements = useMemo(() => {
    if (editing || !incidentWallItemId || incidentWallState === 'none' || wallPlacements.some((placement) => placement?.item.id === incidentWallItemId)) return wallPlacements;
    const candidate = ownedHomePlacementIds(owned, 'wall').map(resolveHomePlacement).find((placement) => placement?.item.id === incidentWallItemId);
    if (!candidate) return wallPlacements;
    const next = [...wallPlacements];
    next[next.length - 1] = candidate;
    return next;
  }, [editing, incidentWallItemId, incidentWallState, owned, wallPlacements]);
  const incidentWallPlacementId = useMemo(() => renderedWallPlacements.find((placement) => placement?.item.id === incidentWallItemId)?.id, [incidentWallItemId, renderedWallPlacements]);
  const homeWallPlacementsRef = useRef(renderedWallPlacements);
  const homeOwnedRef = useRef(owned);
  homeWallPlacementsRef.current = renderedWallPlacements;
  homeOwnedRef.current = owned;
  useEffect(() => {
    setReactionTabId(selectedCharacterId);
  }, [selectedCharacterId]);
  useEffect(() => {
    if (__DEV__) {
      setCollectedReactionIds([...ALL_REACTION_IDS]);
      return undefined;
    }
    let mounted = true;
    void AsyncStorage.getItem(REACTION_COLLECTION_STORAGE_KEY).then((raw) => {
      if (!mounted || !raw) return;
      try {
        setCollectedReactionIds(normalizeCollectedReactionIds(JSON.parse(raw)));
      } catch {
        setCollectedReactionIds([]);
      }
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);
  const collectReaction = useCallback((reactionId: string) => {
    onDailyReaction?.(reactionId);
    const validIds = normalizeCollectedReactionIds([reactionId]);
    if (!validIds.length) return;
    setCollectedReactionIds((current) => {
      if (validIds.every((id) => current.includes(id))) return current;
      const next = [...new Set([...current, ...validIds])];
      void AsyncStorage.setItem(REACTION_COLLECTION_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, [onDailyReaction]);
  const useTeaseTool = useCallback((tool: HomeTeaseToolSelection) => {
    if (busy || editing || !dailyHydrated) return;
    teaseToolAnimationRef.current?.stop();
    teaseToolMotion.setValue(0);
    setActiveTeaseTool(tool);
    setBusy(true);
    onInteract('ほっぺ');
    const reactionEntry = REACTION_STICKERS[selectedCharacterId]?.[tool.kind === 'poke' ? 1 : 9];
    setActiveTeaseReaction(reactionEntry ?? null);
    if (reactionEntry) collectReaction(reactionEntry.id);
    const animation = Animated.timing(teaseToolMotion, {
      toValue: 1,
      duration: reduceMotion ? 620 : tool.kind === 'poke' ? 980 : 1320,
      easing: Easing.linear,
      useNativeDriver: typeof document === 'undefined',
    });
    teaseToolAnimationRef.current = animation;
    animation.start(() => {
      teaseToolAnimationRef.current = null;
      teaseToolMotion.setValue(0);
      setActiveTeaseTool(null);
      setActiveTeaseReaction(null);
      setBusy(false);
    });
  }, [busy, collectReaction, dailyHydrated, editing, onInteract, reduceMotion, selectedCharacterId, teaseToolMotion]);
  useEffect(() => () => teaseToolAnimationRef.current?.stop(), []);
  const registerKeySwing = useCallback((id: string, swing: HomeKeySwing) => {
    keySwingsRef.current[id] = swing;
    return () => {
      if (keySwingsRef.current[id] === swing) delete keySwingsRef.current[id];
    };
  }, []);
  const plushImageSize = useMemo(() => {
    const width = Math.min(roomSize.width * 0.84 * 0.255, roomSize.height * 0.18);
    return { width, height: width * 1.14 };
  }, [roomSize]);
  const shelfSurfaceY = roomSize.height * 0.35 + Math.min(roomSize.height, roomSize.width * 1.5) * (1112 / 1536 - 0.5);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const homeEntrySignature = useMemo(() => homeLayout.wallSlots.map((id) => {
    const placement = resolveHomePlacement(id);
    return placement ? `${placement.id}:${ownedCollectibleCount(owned, placement.item.id, placement.variant)}` : 'empty';
  }).join('|'), [homeLayout.wallSlots, owned]);
  useEffect(() => {
    const entryKey = `${entryNonce}:${homeEntrySignature}`;
    if (!dailyHydrated || !homeLayoutReady || (entryPlayedRef.current === entryKey && entryAnimationFinishedRef.current)) return undefined;
    entryPlayedRef.current = entryKey;
    entryAnimationFinishedRef.current = false;
    entryMotion.stopAnimation();
    entryMotion.setValue(0);
    const animation = Animated.timing(entryMotion, {
      toValue: 1,
      duration: reduceMotion ? 900 : 2200,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: typeof document === 'undefined',
    });
    let cancelled = false;
    const swingTimers: ReturnType<typeof setTimeout>[] = [];
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const playKeychainEntry = () => {
      if (cancelled) return;
      const ownedIds = homeWallPlacementsRef.current
        .filter((placement) => placement && ownedCollectibleCount(homeOwnedRef.current, placement.item.id, placement.variant) > 0)
        .map((placement) => placement!.id);
      const readyIds = ownedIds.filter((id) => Boolean(keySwingsRef.current[id]));
      if (!readyIds.length && attempts < 12) {
        attempts += 1;
        retryTimer = setTimeout(playKeychainEntry, 90);
        return;
      }
      readyIds.forEach((id) => {
        swingTimers.push(setTimeout(() => {
          if (!cancelled) keySwingsRef.current[id]?.(false);
        }, reduceMotion ? 40 : 90));
      });
    };
    // Let the first fully-painted home frame become visible before starting.
    // The character and every keychain still begin together after this pause.
    const startTimer = setTimeout(() => {
      if (cancelled) return;
      playKeychainEntry();
      animation.start(({ finished }) => {
        if (finished) entryAnimationFinishedRef.current = true;
      });
    }, reduceMotion ? 120 : 320);
    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      animation.stop();
      if (retryTimer) clearTimeout(retryTimer);
      swingTimers.forEach((timer) => clearTimeout(timer));
    };
  }, [dailyHydrated, entryMotion, entryNonce, homeEntrySignature, homeLayoutReady, reduceMotion]);

  // Reuse the clearly visible screen-entry jump at irregular intervals. The
  // older idle gestures remain as ambient detail, but this motion is large
  // enough to read on-device and intentionally affects only the main character.
  useEffect(() => {
    if (!dailyHydrated || !homeLayoutReady || busy || editing) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let animation: Animated.CompositeAnimation | undefined;
    const schedule = () => {
      timer = setTimeout(() => {
        if (cancelled) return;
        entryMotion.stopAnimation();
        entryMotion.setValue(0);
        animation = Animated.timing(entryMotion, {
          toValue: 1,
          duration: reduceMotion ? 900 : 2200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: typeof document === 'undefined',
        });
        animation.start(({ finished }) => {
          if (finished && !cancelled) schedule();
        });
      }, (reduceMotion ? 12000 : 7000) + Math.random() * 7000);
    };
    schedule();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      animation?.stop();
    };
  }, [busy, dailyHydrated, editing, entryMotion, entryNonce, homeLayoutReady, reduceMotion]);

  const setCurrentDragSession = useCallback((next: HomeDragSession | null) => {
    dragSessionRef.current = next;
    setDragSession(next);
  }, []);
  const measureDropFrames = useCallback(() => {
    roomRef.current?.measureInWindow((x, y) => {
      roomWindowRef.current = { x, y };
    });
    wallGridRef.current?.measureInWindow((x, y, width, height) => {
      wallDropFrameRef.current = { x, y, width, height };
    });
    shelfGridRef.current?.measureInWindow((x, y, width, height) => {
      shelfDropFrameRef.current = { x, y, width, height };
    });
  }, []);
  const slotAtPagePoint = useCallback((kind: HomePlacementKind, pageX: number, pageY: number) => {
    const frame = kind === 'wall' ? wallDropFrameRef.current : shelfDropFrameRef.current;
    const columns = kind === 'wall' ? HOME_WALL_COLUMNS : HOME_SHELF_SLOT_COUNT;
    const rows = kind === 'wall' ? HOME_WALL_ROWS : 1;
    const usableHeight = kind === 'wall' ? frame.height * 0.86 : frame.height;
    const localX = pageX - frame.x;
    const localY = pageY - frame.y;
    if (localX < 0 || localX >= frame.width || localY < 0 || localY >= usableHeight) return null;
    const column = Math.min(columns - 1, Math.floor(localX / Math.max(1, frame.width / columns)));
    const row = Math.min(rows - 1, Math.floor(localY / Math.max(1, usableHeight / rows)));
    const index = row * columns + column;
    const capacity = kind === 'wall' ? HOME_WALL_SLOT_COUNT : HOME_SHELF_SLOT_COUNT;
    return index < capacity ? index : null;
  }, []);
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setRoomSize(event.nativeEvent.layout);
    setHomeLayoutReady(true);
    measureDropFrames();
  }, [measureDropFrames]);
  const cancelPlacementDrag = useCallback(() => {
    setCurrentDragSession(null);
  }, [setCurrentDragSession]);
  const startPlacementDrag = useCallback((id: HomePlacementId, origin: 'slot' | 'tray', originIndex: number | null, pageX: number, pageY: number) => {
    const placement = resolveHomePlacement(id);
    if (!placement) return;
    measureDropFrames();
    setInventoryKind(placement.kind);
    if (placement.variant !== 'plush') setInventoryKeyVariant(placement.variant);
    setPlacementSelection(null);
    setCurrentDragSession({
      id: placement.id,
      kind: placement.kind,
      origin,
      originIndex,
      baseLayout: homeLayout,
      previewLayout: homeLayout,
      targetIndex: originIndex,
      pageX,
      pageY,
    });
    onArrangeStart?.();
  }, [homeLayout, measureDropFrames, onArrangeStart, setCurrentDragSession]);
  const updatePlacementDrag = useCallback((pageX: number, pageY: number) => {
    const current = dragSessionRef.current;
    if (!current) return;
    const targetIndex = slotAtPagePoint(current.kind, pageX, pageY);
    if (targetIndex === current.targetIndex) {
      setCurrentDragSession({ ...current, pageX, pageY });
      return;
    }
    // Every hover preview is recalculated from the layout captured when the
    // drag began. This makes the current target swap with the dragged item's
    // original slot instead of carrying earlier provisional swaps forward.
    const previewLayout = targetIndex === null
      ? current.baseLayout
      : moveHomePlacement(current.baseLayout, current.id, targetIndex);
    if (previewLayout !== current.previewLayout) onArrangeMove?.();
    setCurrentDragSession({ ...current, previewLayout, targetIndex, pageX, pageY });
  }, [onArrangeMove, setCurrentDragSession, slotAtPagePoint]);
  const finishPlacementDrag = useCallback((pageX: number, pageY: number) => {
    updatePlacementDrag(pageX, pageY);
    const completed = dragSessionRef.current;
    if (completed && completed.targetIndex !== null) {
      onCommitHomeLayout(completed.previewLayout);
      AccessibilityInfo.announceForAccessibility('配置を変更しました');
    }
    setCurrentDragSession(null);
  }, [onCommitHomeLayout, setCurrentDragSession, updatePlacementDrag]);
  const beginEditing = useCallback((kind: HomePlacementKind = inventoryKind, selection: HomePlacementId | null = null) => {
    if (!editing) {
      onUiTap();
      onArrangeStart?.();
    }
    setEditing(true);
    setInventoryKind(kind);
    const selectedPlacement = resolveHomePlacement(selection);
    if (selectedPlacement && selectedPlacement.variant !== 'plush') setInventoryKeyVariant(selectedPlacement.variant);
    setPlacementSelection(selection);
    setCharacterPickerOpen(false);
    setReactionBookOpen(false);
  }, [editing, inventoryKind, onArrangeStart, onUiTap]);
  const finishEditing = useCallback(() => {
    onUiTap();
    cancelPlacementDrag();
    setEditing(false);
    setPlacementSelection(null);
  }, [cancelPlacementDrag, onUiTap]);
  const selectPlacement = useCallback((id: HomePlacementId) => {
    const placement = resolveHomePlacement(id);
    if (!placement) return;
    onUiTap();
    setInventoryKind(placement.kind);
    if (placement.variant !== 'plush') setInventoryKeyVariant(placement.variant);
    setPlacementSelection((current) => current === id ? null : id);
  }, [onUiTap]);
  const activateSlot = useCallback((kind: HomePlacementKind, index: number, slotId: HomePlacementId | null) => {
    cancelPlacementDrag();
    if (placementSelection) {
      const selectedPlacement = resolveHomePlacement(placementSelection);
      if (selectedPlacement?.kind === kind) {
        if (slotId === placementSelection) {
          setPlacementSelection(null);
          return;
        }
        onMoveHomePlacement(placementSelection, index);
        onArrangeMove?.();
        setPlacementSelection(null);
        return;
      }
    }
    if (slotId) selectPlacement(slotId);
  }, [cancelPlacementDrag, onArrangeMove, onMoveHomePlacement, placementSelection, selectPlacement]);
  const removePlacement = useCallback((id: HomePlacementId) => {
    onUiTap();
    cancelPlacementDrag();
    onRemoveHomePlacement(id);
    setPlacementSelection((current) => current === id ? null : current);
  }, [cancelPlacementDrag, onRemoveHomePlacement, onUiTap]);
  return <View style={styles.homeScreenBackground}>
    <View ref={roomRef} style={styles.homeRoom} onLayout={handleLayout}>
      <Pressable accessibilityLabel={editing ? '並べ替えを完了' : '長押しして並べ替え'} delayLongPress={440} onLongPress={() => beginEditing()} onPress={editing ? finishEditing : undefined} style={styles.homeArrangeBackgroundTarget} />
      <MobbyAssetButton backgroundSource={activeTheme ? undefined : HOME_CONTROL_BUTTON_BACKGROUND} backgroundResizeMode="stretch" tone="cream" accessibilityLabel={editing ? '並べ替えを終了' : '壁と棚を並べ替え'} accessibilityState={{ expanded: editing }} onPress={editing ? finishEditing : () => beginEditing()} style={styles.homeReorderButton} contentStyle={styles.homeReorderButtonContent}>
        <Text style={[styles.homeReorderButtonText, editing && styles.homeReorderButtonTextActive]}>{editing ? '完了' : '並べ替え'}</Text>
      </MobbyAssetButton>
      <Image source={PLUSH_SHELF_BASE} resizeMode="contain" style={styles.homeShelfBase} />
      <View pointerEvents="none" style={styles.homeGarland}><Image source={HOME_GARLAND} resizeMode="contain" style={styles.homeDecorAsset} /></View>
      <View ref={wallGridRef} onLayout={measureDropFrames} style={styles.homeWallKeys}>{renderedWallPlacements.map((placement, index) => {
        const source = dragSession?.origin === 'slot' && dragSession.kind === 'wall' && dragSession.originIndex === index;
        const placementIncidentState = !editing && placement?.id === incidentWallPlacementId && incidentWallState !== 'none' ? incidentWallState : placement?.id === placementHiddenWallPlacementId ? 'placement-hidden' : 'normal';
        const target = dragSession?.kind === 'wall' && dragSession.targetIndex === index;
        const dragged = placement?.id === dragSession?.id;
        const placementOwnedCount = placement ? ownedCollectibleCount(owned, placement.item.id, placement.variant) : 0;
        const wallCopyLabel = placement && placementOwnedCount > 1 ? ` ${placement.copyNumber}個目／${placementOwnedCount}個中` : '';
        return <View key={`wall-slot-${index}`} style={[styles.homeWallSlot, editing && styles.homeArrangeSlot, placementSelection === placement?.id && styles.homeArrangeActiveSlot, source && styles.homeArrangeSourceSlot, target && styles.homeArrangeDropTarget]}>
          <DraggableHomePlacement
            disabled={!source && (!placement || placementIncidentState !== 'normal')}
            editing={editing}
            index={index}
            onCancel={cancelPlacementDrag}
            onDragMove={updatePlacementDrag}
            onDragStart={(pageX, pageY) => { if (placement) startPlacementDrag(placement.id, 'slot', index, pageX, pageY); }}
            onDrop={finishPlacementDrag}
            onTap={() => { cancelPlacementDrag(); activateSlot('wall', index, placement?.id ?? null); }}
            reduceMotion={reduceMotion}
          >
            {placement ? <View style={[styles.homeArrangePlacementVisual, dragged && styles.homeArrangeDraggedItem]}>
              <HomeWallKeychain
                item={placement.item} placementId={placement.id} variant={placement.variant as Exclude<CollectibleVariant, 'plush'>} index={index} selectedId={selected.id}
                ownedCount={placementOwnedCount} incidentState={placementIncidentState}
                editing={editing} editSelected={placementSelection === placement.id}
                onPress={onIncidentPress} onEditPress={() => activateSlot('wall', index, placement.id)} onEditStart={() => beginEditing('wall', placement.id)} onSwing={onKeychainSwing} registerSwing={registerKeySwing}
              />
            </View> : editing ? <Pressable accessibilityLabel={`壁の空き位置${index + 1}${placementSelection ? 'に選択中のアイテムを飾る' : ''}`} accessibilityRole="button" onPress={() => activateSlot('wall', index, null)} style={styles.homeArrangeEmptySlot}><Text style={styles.homeArrangeEmptyPlus}>＋</Text></Pressable> : null}
          </DraggableHomePlacement>
          {editing && !dragSession && placement && placementIncidentState === 'normal' ? <Pressable accessibilityLabel={`${itemCharacterName(placement.item)} ${placement.variant === 'key-small' ? 'Sぬいキー' : '通常ぬいキー'}${wallCopyLabel}をホームから外す`} accessibilityRole="button" hitSlop={8} onPress={() => removePlacement(placement.id)} style={styles.homeArrangeRemoveButton}><Text style={styles.homeArrangeRemoveText}>−</Text></Pressable> : null}
        </View>;
      })}</View>
      <View ref={shelfGridRef} onLayout={measureDropFrames} style={[styles.homePlushShelf, { top: shelfSurfaceY - roomSize.height * 0.18 }]}>{shelfPlacements.map((placement, index) => {
        const source = dragSession?.origin === 'slot' && dragSession.kind === 'plush' && dragSession.originIndex === index;
        const target = dragSession?.kind === 'plush' && dragSession.targetIndex === index;
        const dragged = placement?.id === dragSession?.id;
        const rendered = placement ? Math.min(plushImageSize.width, plushImageSize.height) : 0;
        const belowFeet = placement ? plushImageSize.height - ((plushImageSize.height - rendered) / 2 + rendered * (PLUSH_VISIBLE_BOTTOM_RATIO[placement.item.id] ?? PLUSH_CONTACT_REFERENCE)) : 0;
        const placementOwnedCount = placement ? ownedCollectibleCount(owned, placement.item.id, placement.variant) : 0;
        const shelfCopyLabel = placement && placementOwnedCount > 1 ? ` ${placement.copyNumber}個目／${placementOwnedCount}個中` : '';
        return <View key={`shelf-slot-${index}`} style={[styles.homePlushSlot, editing && styles.homeArrangeSlot, placementSelection === placement?.id && styles.homeArrangeActiveSlot, source && styles.homeArrangeSourceSlot, target && styles.homeArrangeDropTarget]}>
          <DraggableHomePlacement
            disabled={!source && !placement}
            editing={editing}
            index={index}
            onCancel={cancelPlacementDrag}
            onDragMove={updatePlacementDrag}
            onDragStart={(pageX, pageY) => { if (placement) startPlacementDrag(placement.id, 'slot', index, pageX, pageY); }}
            onDrop={finishPlacementDrag}
            onTap={() => { cancelPlacementDrag(); activateSlot('plush', index, placement?.id ?? null); }}
            reduceMotion={reduceMotion}
          >
            {placement ? <View style={[styles.homeArrangePlacementVisual, dragged && styles.homeArrangeDraggedItem]}><Pressable accessibilityRole="button" accessibilityLabel={editing ? `${itemCharacterName(placement.item)} ぬいぐるみ${shelfCopyLabel}を移動` : `${itemCharacterName(placement.item)} ぬいぐるみ${shelfCopyLabel}を揺らす`} accessibilityState={{ selected: placementSelection === placement.id }} delayLongPress={420} onLongPress={() => { if (!editing) beginEditing('plush', placement.id); }} onPress={editing ? () => activateSlot('plush', index, placement.id) : onKeychainSwing} style={[styles.homePlushItem, placementSelection === placement.id && styles.homeReorderSelected]}>
              <View style={styles.homePlushSwing}><Image source={collectibleImage(placement.item, placement.variant)} resizeMode="contain" style={[styles.homePlushImage, plushImageSize, { bottom: -belowFeet }]} /></View>
            </Pressable></View> : editing ? <Pressable accessibilityLabel={`棚の空き位置${index + 1}${placementSelection ? 'に選択中のアイテムを飾る' : ''}`} accessibilityRole="button" onPress={() => activateSlot('plush', index, null)} style={styles.homeArrangeEmptySlot}><Text style={styles.homeArrangeEmptyPlus}>＋</Text></Pressable> : null}
          </DraggableHomePlacement>
          {editing && !dragSession && placement ? <Pressable accessibilityLabel={`${itemCharacterName(placement.item)} ぬいぐるみ${shelfCopyLabel}をホームから外す`} accessibilityRole="button" hitSlop={8} onPress={() => removePlacement(placement.id)} style={styles.homeArrangeRemoveButton}><Text style={styles.homeArrangeRemoveText}>−</Text></Pressable> : null}
        </View>;
      })}</View>
      <View accessible={!editing} accessibilityLabel={`${selectedCharacter.name}。ほっぺを引っぱれます`} pointerEvents={editing ? 'none' : 'auto'} style={[styles.homeMainCharacter, styles.homeMainCharacterPullable, compact && styles.homeMainCharacterCompact, editing && styles.homeArrangeMainDimmed]}>
        <Animated.View style={{ transform: [
          { translateY: entryMotion.interpolate({ inputRange: [0, 0.1, 0.3, 0.5, 0.7, 0.86, 1], outputRange: reduceMotion ? [0, 4, -32, -8, -20, -7, 0] : [0, 16, -88, -18, -48, -12, 0] }) },
          { scale: entryMotion.interpolate({ inputRange: [0, 0.1, 0.3, 0.5, 0.7, 0.86, 1], outputRange: reduceMotion ? [1, 0.94, 1.28, 1.04, 1.16, 1.05, 1] : [1, 0.82, 1.78, 1.08, 1.42, 1.1, 1] }) },
          { rotate: entryMotion.interpolate({ inputRange: [0, 0.1, 0.3, 0.5, 0.7, 0.86, 1], outputRange: reduceMotion ? ['0deg', '-3deg', '4deg', '-3deg', '2deg', '-1deg', '0deg'] : ['0deg', '-9deg', '13deg', '-8deg', '7deg', '-3deg', '0deg'] }) },
          { translateX: teaseToolMotion.interpolate({ inputRange: [0, 0.18, 0.34, 0.52, 0.76, 1], outputRange: activeTeaseTool?.kind === 'poke' ? [0, 0, -9, 10, -3, 0] : [0, 0, 0, 0, 0, 0] }) },
          { translateY: teaseToolMotion.interpolate({ inputRange: [0, 0.24, 0.38, 0.76, 1], outputRange: activeTeaseTool?.kind === 'weight' ? [0, 0, 37, 37, 0] : [0, 0, 0, 0, 0] }) },
          { scaleX: teaseToolMotion.interpolate({ inputRange: [0, 0.18, 0.34, 0.52, 0.76, 1], outputRange: activeTeaseTool?.kind === 'poke' ? [1, 1, 0.67, 0.83, 1.05, 1] : activeTeaseTool?.kind === 'weight' ? [1, 1, 1.34, 1.34, 1.34, 1] : [1, 1, 1, 1, 1, 1] }) },
          { scaleY: teaseToolMotion.interpolate({ inputRange: [0, 0.18, 0.34, 0.52, 0.76, 1], outputRange: activeTeaseTool?.kind === 'poke' ? [1, 1, 1.19, 1.1, 0.98, 1] : activeTeaseTool?.kind === 'weight' ? [1, 1, 0.43, 0.43, 0.43, 1] : [1, 1, 1, 1, 1, 1] }) },
        ] }}>
          <Animated.View style={{ opacity: activeTeaseReaction
            ? teaseToolMotion.interpolate({ inputRange: [0, 0.22, 0.34, 0.78, 0.9, 1], outputRange: [1, 1, 0, 0, 1, 1] })
            : 1 }}>
            <MobbyIdleMotion enabled={!busy && !editing}><PullableMobby selected={selected} selectedMobbyName={selectedCharacter.name} specialCentering size={compact ? 178 : 220} onPull={() => onInteract('ほっぺ')} onInteractionStateChange={setBusy} enabled={dailyHydrated && !editing} onValidRelease={onDailyPullRelease} onReaction={collectReaction} /></MobbyIdleMotion>
          </Animated.View>
          {activeTeaseReaction ? <Animated.Image
            accessible={false}
            resizeMode="contain"
            source={activeTeaseReaction.source}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              zIndex: 3,
              width: compact ? 178 : 220,
              height: compact ? 178 : 220,
              opacity: teaseToolMotion.interpolate({ inputRange: [0, 0.22, 0.34, 0.78, 0.9, 1], outputRange: [0, 0, 1, 1, 0, 0] }),
            }}
          /> : null}
        </Animated.View>
        {activeTeaseTool ? <Animated.Image
          accessible={false}
          resizeMode="contain"
          source={activeTeaseTool.source}
          style={{
            position: 'absolute',
            zIndex: 18,
            width: activeTeaseTool.kind === 'poke' ? 124 : 146,
            height: activeTeaseTool.kind === 'poke' ? 124 : 146,
            left: activeTeaseTool.kind === 'poke' ? 118 : 38,
            top: activeTeaseTool.kind === 'poke' ? 36 : -95,
            opacity: teaseToolMotion.interpolate({ inputRange: [0, 0.08, 0.82, 1], outputRange: [0, 1, 1, 0] }),
            transform: activeTeaseTool.kind === 'poke' ? [
              { translateX: teaseToolMotion.interpolate({ inputRange: [0, 0.2, 0.34, 0.52, 0.75, 1], outputRange: [92, 45, -36, 14, 48, 92] }) },
              { translateY: teaseToolMotion.interpolate({ inputRange: [0, 0.34, 0.52, 1], outputRange: [18, 0, 8, 18] }) },
              { rotate: '-48deg' },
            ] : [
              { translateY: teaseToolMotion.interpolate({ inputRange: [0, 0.24, 0.38, 0.76, 1], outputRange: [-130, -80, 42, 42, -130] }) },
              { rotate: teaseToolMotion.interpolate({ inputRange: [0, 0.38, 0.76, 1], outputRange: ['-4deg', '3deg', '-2deg', '-4deg'] }) },
            ],
          }}
        /> : null}
        <HomeTeaseTools disabled={busy || editing || !dailyHydrated} onUse={useTeaseTool} />
        <MobbyAssetButton accessibilityLabel={`メインキャラを選ぶ（現在：${selectedCharacter.name}）`} backgroundSource={activeTheme ? undefined : HOME_CONTROL_BUTTON_BACKGROUND} backgroundResizeMode="stretch" tone="cream" onPress={() => { onUiTap(); setReactionBookOpen(false); setCharacterPickerOpen(true); }} style={[styles.characterPickerButton, styles.characterPickerButtonCompact]} contentStyle={styles.characterPickerButtonAsset}><Text style={styles.characterPickerCaption}>キャラ</Text><Text style={styles.characterPickerValue}>選択</Text></MobbyAssetButton>
        <Animated.View pointerEvents="none" style={{
          position: 'absolute', top: -12, right: -10, zIndex: 5,
          opacity: entryMotion.interpolate({ inputRange: [0, 0.14, 0.24, 0.76, 0.94, 1], outputRange: [0, 0, 1, 1, 0.7, 0] }),
          transform: [
            { translateY: entryMotion.interpolate({ inputRange: [0, 0.28, 1], outputRange: [10, -8, -18] }) },
            { scale: entryMotion.interpolate({ inputRange: [0, 0.24, 0.7, 1], outputRange: [0.4, 1.65, 1.2, 0.8] }) },
            { rotate: '-8deg' },
          ],
        }}>
          <Text style={{ color: '#ff6f91', fontSize: compact ? 42 : 54, fontWeight: '900' }}>！♪</Text>
        </Animated.View>
        <MobbyAssetButton
          accessibilityLabel="リアクション図鑑を開く"
          onPress={() => { onUiTap(); setCharacterPickerOpen(false); setReactionTabId(selectedCharacterId); setReactionBookOpen(true); }}
          backgroundSource={activeTheme ? undefined : HOME_CONTROL_BUTTON_BACKGROUND}
          backgroundResizeMode="stretch"
          tone="cream"
          style={[styles.reactionBookButton, compact && styles.reactionBookButtonCompact]}
          contentStyle={styles.reactionBookButtonContent}
        >
          <Text style={styles.reactionBookButtonLabel}>リアクション</Text>
          <Text style={styles.reactionBookButtonLabel}>図鑑</Text>
        </MobbyAssetButton>
      </View>
      {reaction && !editing ? <ImageBackground
        accessible={false}
        accessibilityLiveRegion="polite"
        source={activeTheme?.assets.popup ?? SPEECH_BUBBLE_PAPER}
        resizeMode="stretch"
        imageStyle={styles.homeReactionBubbleImage}
      style={[styles.homeReactionBubble, { pointerEvents: 'none', top: shelfSurfaceY + 4 }]}
      ><Text accessibilityRole="alert" style={styles.homeReactionBubbleText}>{reaction}</Text></ImageBackground> : null}
      {editing ? <>
        <View pointerEvents="none" style={styles.homeArrangeHint}><Text style={styles.homeArrangeHintText}>{dragSession ? '重なったアイテムと仮に入れ替え中。指を離すと確定' : placementSelection ? '飾りたい場所をタップするか、そのまま上へドラッグ' : '選択不要：下のアイテムをそのまま上へドラッグ'}</Text></View>
        <View style={styles.homeInventoryTray}>
          <HomeInventoryTray
            activeKeyVariant={inventoryKeyVariant}
            activeKind={inventoryKind}
            draggingId={dragSession?.id}
            homeLayout={visualLayout}
            orderLayout={dragSession?.baseLayout ?? homeLayout}
            onChangeKeyVariant={(variant) => { onUiTap(); cancelPlacementDrag(); setInventoryKeyVariant(variant); setPlacementSelection(null); }}
            onChangeKind={(kind) => { onUiTap(); cancelPlacementDrag(); setInventoryKind(kind); setPlacementSelection(null); }}
            onDragCancel={() => cancelPlacementDrag()}
            onDragEnd={(_id, pageX, pageY) => finishPlacementDrag(pageX, pageY)}
            onDragMove={(_id, pageX, pageY) => updatePlacementDrag(pageX, pageY)}
            onDragStart={(id, pageX, pageY) => startPlacementDrag(id, 'tray', null, pageX, pageY)}
            onSelect={selectPlacement}
            owned={owned}
            selectedId={placementSelection}
          />
        </View>
        {dragSession ? (() => {
          const placement = resolveHomePlacement(dragSession.id);
          if (!placement) return null;
          const width = placement.variant === 'plush' ? plushImageSize.width : placement.variant === 'key-small' ? 76 : 96;
          const height = placement.variant === 'plush' ? plushImageSize.height : placement.variant === 'key-small' ? 84 : 106;
          return <View pointerEvents="none" style={[styles.homeArrangeDragOverlay, {
            left: dragSession.pageX - roomWindowRef.current.x - width / 2,
            top: dragSession.pageY - roomWindowRef.current.y - height / 2,
            width,
            height,
          }]}><Image source={collectibleImage(placement.item, placement.variant)} resizeMode="contain" style={styles.homeArrangeDragOverlayImage} /></View>;
        })() : null}
      </> : null}
    </View>
    {characterPickerOpen ? <CharacterPickerPopover
      characters={characters}
      disabled={!dailyHydrated}
      onClose={() => setCharacterPickerOpen(false)}
      onConfirm={(id) => {
        if (onSelectCharacter(id)) setCharacterPickerOpen(false);
      }}
      onUiTap={onUiTap}
      selectedId={selected.id}
    /> : null}
    {reactionBookOpen ? <ReactionCollectionPopover
      collectedIds={collectedReactionIds}
      onClose={() => setReactionBookOpen(false)}
      onSelectCharacter={setReactionTabId}
      reduceMotion={reduceMotion}
      selectedCharacterId={reactionTabId}
    /> : null}
  </View>;
}
