import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, ImageBackground } from 'expo-image';
import { AccessibilityInfo, Animated, PanResponder, Platform, Pressable, View, type LayoutChangeEvent } from 'react-native';

import type { ReactionMilestone } from '@/data/dailyRewards';
import { BlackStarToggle } from '@/components/characters';
import { collectibleImage, itemCharacterName, ownedCollectibleCount, type CollectibleVariant, type Item, type ItemKind } from '@/data/collectibles';
import { styles } from '@/ui/layout/appStyles';
import { Text, useAppLayout } from '@/ui/layout/visualPrimitives';

type KeychainImageSize = 'normal' | 'small';

const COLLECTION_DISPLAY_BOARD = require('../../../assets/backgrounds/collection-display-board-cutout-v1.png');
const UI_WIDE_PAPER = require('../../../assets/home-ui/panels/wide-paper.png');
const UI_SIZE_SELECTOR_PAPER = require('../../../assets/home-ui/panels/size-selector-paper-v1.png');

function collectibleVariantFromKeySize(size: KeychainImageSize): CollectibleVariant {
  return size === 'small' ? 'key-small' : 'key-normal';
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
const COLLECTION_BOARD_TOP = 128;
const COLLECTION_COLUMN_X = [128, 220, 312] as const;
const COLLECTION_KEY_ROW_RATIOS = [0.149, 0.396, 0.665] as const;
const COLLECTION_PLUSH_SHELF_RATIOS = [0.324, 0.6, 0.871] as const;












type KeychainSwing = (direction: number, notify?: boolean) => void;
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
  reduceMotion?: boolean;
};

function KeychainTile({ item, owned, selectedId, onSelect, imageSize = 'normal', placement, gestureManaged = false, onSwingReady, onLayout, onGestureStart, onGestureMove, onGestureEnd, onSwing, reduceMotion = false }: KeychainTileProps) {
  const keyVariant = collectibleVariantFromKeySize(imageSize);
  const ownedCount = item ? ownedCollectibleCount(owned, item.id, keyVariant) : 0;
  const rotation = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const swing = useCallback((direction: number, notify = true) => {
    if (notify) onSwing?.();
    rotation.stopAnimation();
    scale.stopAnimation();
    if (reduceMotion) {
      // Respect the device's reduced-motion preference without making the
      // collection feel inert: use one short, low-amplitude sway and no
      // scale/bounce. This keeps the entry feedback perceivable in previews
      // where prefers-reduced-motion is enabled.
      Animated.sequence([
        Animated.timing(rotation, { toValue: direction * 0.65, duration: 130, useNativeDriver: typeof document === 'undefined' }),
        Animated.timing(rotation, { toValue: -direction * 0.42, duration: 170, useNativeDriver: typeof document === 'undefined' }),
        Animated.timing(rotation, { toValue: direction * 0.18, duration: 120, useNativeDriver: typeof document === 'undefined' }),
        Animated.timing(rotation, { toValue: 0, duration: 150, useNativeDriver: typeof document === 'undefined' }),
      ]).start();
      scale.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.sequence([
        Animated.timing(rotation, { toValue: direction, duration: 70, useNativeDriver: typeof document === 'undefined' }),
        Animated.timing(rotation, { toValue: -direction * 0.82, duration: 130, useNativeDriver: typeof document === 'undefined' }),
        Animated.timing(rotation, { toValue: direction * 0.58, duration: 110, useNativeDriver: typeof document === 'undefined' }),
        Animated.spring(rotation, { toValue: 0, useNativeDriver: typeof document === 'undefined', speed: 18, bounciness: 8 }),
      ]),
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.045, duration: 70, useNativeDriver: typeof document === 'undefined' }),
        Animated.timing(scale, { toValue: 0.985, duration: 130, useNativeDriver: typeof document === 'undefined' }),
        Animated.timing(scale, { toValue: 1.025, duration: 110, useNativeDriver: typeof document === 'undefined' }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: typeof document === 'undefined', speed: 18, bounciness: 8 }),
      ]),
    ]).start();
  }, [onSwing, reduceMotion, rotation, scale]);
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
        scale.stopAnimation();
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
  }, [onGestureEnd, onGestureMove, onGestureStart, ownedCount, rotation, scale, swing]);
  const sway = rotation.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-18deg', '0deg', '18deg'] });
  const name = item ? itemCharacterName(item) : '未発見';
  const keyImage = item ? collectibleImage(item, keyVariant) : undefined;
  const localPanHandlers = !gestureManaged && item && ownedCount > 0 ? panResponder.panHandlers : {};
  const selectKey = () => {
    if (!item || ownedCount === 0) return;
    onSelect(item.id);
    swing(1);
  };
  return (
    <Animated.View {...localPanHandlers} onLayout={onLayout} style={[styles.collectionKeyItem, placement && styles.collectionKeyItemAnchored, placement]}>
      <Pressable disabled={ownedCount === 0} onPress={selectKey} style={styles.collectionKeyPressable} accessibilityRole="button" accessibilityLabel={`${name}${imageSize === 'small' ? ' Sサイズ' : ' 通常サイズ'}を揺らす`} accessibilityState={{ disabled: ownedCount === 0 }}>
        <Text style={styles.collectionKeyName} numberOfLines={1}>{name}</Text>
        <Animated.View style={[styles.collectionKeySwing, { transform: [{ rotate: sway }, { scale }] }]}>
          <View style={[styles.collectionKeyBody, item && ownedCount > 0 && styles.collectionKeyBodyOwned, item && ownedCount > 0 && selectedId === item.id && styles.collectionKeySelected]}>{item && ownedCount > 0 ? <Image source={keyImage} contentFit="contain" style={[styles.collectionKeyImage, imageSize === 'small' && styles.collectionSmallKeyImage]} /> : item?.faction === 'kuroboshi' ? <Image source={keyImage} contentFit="contain" tintColor="#17131D" style={[styles.collectionKeyImage, imageSize === 'small' && styles.collectionSmallKeyImage, { opacity: 0.44 }]} /> : <Text style={styles.collectionKeyPlaceholderText}>?</Text>}</View>
        </Animated.View>
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
  /** Incremented whenever the collection tab becomes the active route. */
  entryNonce?: number;
};

type TileFrame = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

function KeychainGrid({ items, owned, selectedId, onSelect, imageSize, boardHeight, onSwing, entryNonce = 0 }: KeychainGridProps) {
  const { scale: appScale } = useAppLayout();
  const [reduceMotion, setReduceMotion] = useState(false);
  const tileFrames = useRef<Record<string, TileFrame>>({});
  const tileSwings = useRef<Record<string, KeychainSwing>>({});
  const initialSwingPlayed = useRef(false);
  const itemsRef = useRef(items);
  const touchedTiles = useRef(new Set<string>());
  const previousPoint = useRef<Point | null>(null);
  const pointerActive = useRef(false);
  const gridOrigin = useRef<Point>({ x: 0, y: 0 });
  const gridRef = useRef<View>(null);

  itemsRef.current = items;

  // Hydration can replace the initial empty inventory after the grid has
  // mounted. Keep a stable primitive signature so that the entry animation
  // retries when ownership becomes available without replaying on every
  // unrelated render.
  const ownershipSignature = useMemo(() => items.map((item) => {
    if (!item) return '-';
    return `${item.id}:${ownedCollectibleCount(owned, item.id, collectibleVariantFromKeySize(imageSize))}`;
  }).join('|'), [imageSize, items, owned]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => mounted && setReduceMotion(value));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

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

  useEffect(() => {
    // Expo Router keeps tab routes mounted. Resetting this guard for a new
    // route entry makes the promised "arrive -> keys sway" feedback happen
    // every time the user returns to Collection, not just on first mount.
    initialSwingPlayed.current = false;
    let cancelled = false;
    let attempts = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const schedule = (callback: () => void, delay: number) => {
      const next = setTimeout(() => {
        timers.delete(next);
        callback();
      }, delay);
      timers.add(next);
    };
    const playInitialSwings = () => {
      if (cancelled || initialSwingPlayed.current) return;
      const animatableIds = itemsRef.current
        .filter((item): item is Item => item !== null)
        .map((item) => item.id);
      if (animatableIds.length > 0) {
        initialSwingPlayed.current = true;
        animatableIds.forEach((id, index) => {
          schedule(() => {
            if (!cancelled) tileSwings.current[id]?.(index % 2 === 0 ? 1 : -1, false);
          }, reduceMotion ? 90 : 240);
        });
        return;
      }
      attempts += 1;
      if (attempts < 12) schedule(playInitialSwings, reduceMotion ? 60 : 90);
    };
    schedule(playInitialSwings, reduceMotion ? 70 : 120);
    return () => { cancelled = true; timers.forEach(clearTimeout); timers.clear(); };
  }, [entryNonce, imageSize, ownershipSignature, reduceMotion]);

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
          reduceMotion={reduceMotion}
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

export function CollectionVisual({
  items, owned, selectedId, onSelect, onKeychainSwing,
  reactionCount = 0, claimedReactionMilestones = [], dailyHydrated = true,
  onClaimReactionMilestone,
  entryNonce = 0,
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
  entryNonce?: number;
}) {
  const { height: appHeight } = useAppLayout();
  const [mode, setMode] = useState<ItemKind>('ぬいキー');
  const [keyImageSize, setKeyImageSize] = useState<KeychainImageSize>('normal');
  const [showBlackStars, setShowBlackStars] = useState(false);
  useEffect(() => setShowBlackStars(false), [entryNonce]);
  const visibleItems = items.filter((item) => item.faction === (showBlackStars ? 'kuroboshi' : 'mobby'));
  const slotCount = showBlackStars ? 7 : 9;
  const displayItems: (Item | null)[] = [...visibleItems, ...Array.from({ length: Math.max(0, slotCount - visibleItems.length) }, () => null)];
  const boardHeight = Math.min(640, Math.max(420, appHeight - 302));
  void reactionCount;
  void claimedReactionMilestones;
  void dailyHydrated;
  void onClaimReactionMilestone;
  return (
    <View style={styles.collectionScreenBackground}>
      <View style={styles.collectionScrollContent}>
      <View style={[styles.collectionStage, { height: COLLECTION_BOARD_TOP + boardHeight }]}>
      <View pointerEvents="none" style={[styles.collectionBoardShadow, { height: boardHeight - 10 }]} />
      <Image source={COLLECTION_DISPLAY_BOARD} contentFit="contain" contentPosition="center" style={[styles.collectionDisplayBoard, { height: boardHeight }]} />
      <View style={styles.collectionHeaderBar}>
        <ImageBackground source={UI_WIDE_PAPER} contentFit="contain" contentPosition="center" accessibilityRole="tablist" accessibilityLabel="コレクションの種類" style={styles.collectionModeTabs}>
          <Pressable accessibilityRole="tab" accessibilityLabel="ぬいキー" accessibilityState={{ selected: mode === 'ぬいキー' }} onPress={() => setMode('ぬいキー')} style={({ pressed }) => [styles.collectionModeTab, pressed && styles.collectionKeySizeTabPressed]}>
            <Text style={[styles.collectionModeText, mode === 'ぬいキー' && styles.collectionModeTextActive]}>ぬいキー</Text>
          </Pressable>
          <Pressable accessibilityRole="tab" accessibilityLabel="ぬいぐるみ" accessibilityState={{ selected: mode === 'ぬいぐるみ' }} onPress={() => setMode('ぬいぐるみ')} style={({ pressed }) => [styles.collectionModeTab, pressed && styles.collectionKeySizeTabPressed]}>
            <Text style={[styles.collectionModeText, mode === 'ぬいぐるみ' && styles.collectionModeTextActive]}>ぬいぐるみ</Text>
          </Pressable>
        </ImageBackground>
      </View>
      <BlackStarToggle
        active={showBlackStars}
        onChange={setShowBlackStars}
        style={{ position: 'absolute', top: 69, right: 12, zIndex: 14 }}
        testID="collection-black-star-toggle"
      />
      {mode === 'ぬいキー' ? (
        <ImageBackground source={UI_SIZE_SELECTOR_PAPER} contentFit="contain" contentPosition="center" accessibilityRole="tablist" accessibilityLabel="ぬいキーのサイズ" style={styles.collectionKeySizeTabs}>
          <Text style={styles.collectionKeySizeLabel}>サイズ</Text>
          <Pressable accessibilityRole="tab" accessibilityLabel="ノーマルサイズ" accessibilityState={{ selected: keyImageSize === 'normal' }} onPress={() => setKeyImageSize('normal')} style={({ pressed }) => [styles.collectionKeySizeTab, pressed && styles.collectionKeySizeTabPressed]}>
            <Text style={[styles.collectionKeySizeText, keyImageSize === 'normal' && styles.collectionKeySizeTextActive]}>ノーマル</Text>
          </Pressable>
          <Pressable accessibilityRole="tab" accessibilityLabel="Sサイズ" accessibilityState={{ selected: keyImageSize === 'small' }} onPress={() => setKeyImageSize('small')} style={({ pressed }) => [styles.collectionKeySizeTab, pressed && styles.collectionKeySizeTabPressed]}>
            <Text style={[styles.collectionKeySizeText, keyImageSize === 'small' && styles.collectionKeySizeTextActive]}>S</Text>
          </Pressable>
        </ImageBackground>
      ) : null}
      <View style={[styles.collectionDisplay, { height: COLLECTION_BOARD_TOP + boardHeight }, mode === 'ぬいぐるみ' && styles.collectionDisplayPlush]}>
        {mode === 'ぬいキー' ? (
          <KeychainGrid items={displayItems} owned={owned} selectedId={selectedId} onSelect={onSelect} imageSize={keyImageSize} boardHeight={boardHeight} onSwing={onKeychainSwing} entryNonce={entryNonce} />
        ) : (
          <View style={styles.plushCollectionShelf}>
            {displayItems.map((item, index) => (
              <Pressable
                key={`${mode}-${item?.id ?? 'locked'}-${index}`}
                disabled={!item || ownedCollectibleCount(owned, item.id, 'plush') === 0}
                onPress={() => {
                  if (!item || ownedCollectibleCount(owned, item.id, 'plush') === 0) return;
                  onSelect(item.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={item ? `${itemCharacterName(item)}のぬいぐるみ` : '未発見のぬいぐるみ'}
                accessibilityState={{ disabled: !item || ownedCollectibleCount(owned, item.id, 'plush') === 0 }}
                style={({ pressed }) => [styles.plushCollectionItem, getPlushCollectionPlacement(index, boardHeight), pressed && styles.gamePressed]}
                >
                  <View style={[styles.plushCollectionBody, item && ownedCollectibleCount(owned, item.id, 'plush') > 0 && styles.plushCollectionBodyOwned, item && ownedCollectibleCount(owned, item.id, 'plush') > 0 && selectedId === item.id && styles.plushCollectionSelected]}>
                    {item && ownedCollectibleCount(owned, item.id, 'plush') > 0 ? (
                      <Image source={item.image} contentFit="contain" style={[styles.plushCollectionImage, { bottom: getPlushCollectionImageBottom(item) }]} />
                    ) : item?.faction === 'kuroboshi' ? (
                      <Image source={item.image} contentFit="contain" tintColor="#17131D" style={[styles.plushCollectionImage, { bottom: getPlushCollectionImageBottom(item), opacity: 0.42 }]} />
                    ) : (
                    <Text style={styles.plushCollectionPlaceholderText}>?</Text>
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
    </View>
  );
}
