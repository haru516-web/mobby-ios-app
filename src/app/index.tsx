import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
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
  useWindowDimensions,
} from 'react-native';

import { MobbyPullMesh, type MobbyPullMeshHandle } from '@/components/MobbyPullMesh';

type Screen = 'home' | 'collection' | 'time' | 'touch' | 'trade';
type ItemKind = 'ぬいキー' | 'ぬいぐるみ';

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
const HOME_WALL_BACKGROUND = require('../../assets/backgrounds/home-wall-re2.png');
const COLLECTION_WALL_BACKGROUND = require('../../assets/backgrounds/home-wall.png');
const WOODEN_HOOK = require('../../assets/backgrounds/hook-transparent.png');
const PLUSH_SHELF_BASE = require('../../assets/backgrounds/plush-base-transparent.png');
const TOUCH_BACKGROUND = require('../../assets/backgrounds/touch-stage.png');
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

function Header({ onBell }: { onBell: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.brandWrap}><Text style={styles.brand}>MOBBY</Text><Text style={styles.brandSub}>collection</Text></View>
      <View style={styles.headerSpacer} />
      <Pressable accessibilityRole="button" accessibilityLabel="お知らせ" onPress={onBell} style={styles.bellButton}>
        <Image source={BELL} resizeMode="contain" style={styles.bellIcon} />
        <View style={styles.bellBadge}><Text style={styles.bellBadgeText}>3</Text></View>
      </Pressable>
    </View>
  );
}

function HomeScreen({ selected, onSelect }: { selected: Item; onSelect: (id: string) => void }) {
  const { height: viewportHeight } = useWindowDimensions();
  const compactViewport = viewportHeight < 780;
  const [roomSize, setRoomSize] = useState({ width: 0, height: 0 });
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
    const width = Math.min(itemWidth * 0.9, shelfHeight * 0.78);
    return { width, height: width * 1.14 };
  }, [roomSize.height, roomSize.width]);
  const wallItems = ITEMS;
  const plushItems = ITEMS.filter((item) => item.kind === 'ぬいぐるみ');
  const selectedIndex = Math.max(0, ITEMS.findIndex((item) => item.id === selected.id));
  const selectRelative = (offset: number) => {
    const nextIndex = (selectedIndex + offset + ITEMS.length) % ITEMS.length;
    onSelect(ITEMS[nextIndex].id);
  };
  return (
    <View style={styles.homeScreenBackground}>
      <View style={styles.homeRoom} onLayout={handleRoomLayout}>
        <Image source={PLUSH_SHELF_BASE} resizeMode="contain" style={styles.homeShelfBase} />
        <View style={styles.homeWallKeys}>
          {wallItems.map((item) => {
            const name = item.name.replace(' ぬいキー', '').replace(' ぬい', '');
            return (
              <View key={item.id} accessibilityLabel={`${name}のぬいキー`} style={styles.homeWallKey}>
                <Image source={WOODEN_HOOK} resizeMode="contain" style={styles.homeWallHook} />
                <Image source={item.keyImage ?? item.image} resizeMode="contain" style={styles.homeWallKeyImage} />
              </View>
            );
          })}
        </View>
        <View style={styles.homePlushShelf}>
          {plushItems.map((item) => (
            <View key={item.id} accessibilityLabel={`${item.name.replace(' ぬい', '')}のぬいぐるみ`} style={styles.homePlushItem}>
              <View pointerEvents="none" style={styles.homePlushContactShadow} />
              <Image
                source={item.image}
                resizeMode="contain"
                style={[
                  styles.homePlushImage,
                  plushImageSize,
                  {
                    transform: [{ translateY: Math.max(0, PLUSH_CONTACT_REFERENCE - (PLUSH_VISIBLE_BOTTOM_RATIO[item.id] ?? PLUSH_CONTACT_REFERENCE)) * plushImageSize.height }],
                  },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.homeCharacterPicker}>
          <Pressable accessibilityRole="button" accessibilityLabel="前のモビー" onPress={() => selectRelative(-1)} style={styles.homeCharacterArrow}>
            <Text style={styles.homeCharacterArrowText}>‹</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="次のモビー" onPress={() => selectRelative(1)} style={styles.homeCharacterArrow}>
            <Text style={styles.homeCharacterArrowText}>›</Text>
          </Pressable>
        </View>
        <Image source={selected.image} resizeMode="contain" style={[styles.homeMainCharacter, compactViewport && styles.homeMainCharacterCompact]} />
      </View>
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
  gestureManaged?: boolean;
  onSwingReady?: (id: string, swing: KeychainSwing | null) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  onGestureStart?: (event: KeychainPanEvent) => void;
  onGestureMove?: (event: KeychainPanEvent, gesture: KeychainGesture) => void;
  onGestureEnd?: () => void;
};

function KeychainTile({ item, owned, selectedId, onSelect, imageSize = 'normal', gestureManaged = false, onSwingReady, onLayout, onGestureStart, onGestureMove, onGestureEnd }: KeychainTileProps) {
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
    <Animated.View {...localPanHandlers} onLayout={onLayout} style={styles.collectionKeyItem}>
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
};

type TileFrame = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

function KeychainGrid({ items, owned, selectedId, onSelect, imageSize }: KeychainGridProps) {
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
      return { x: pageX - gridOrigin.current.x, y: pageY - gridOrigin.current.y };
    }
    return { x: locationX ?? 0, y: locationY ?? 0 };
  }, []);

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

function CollectionScreen({ items, owned, selectedId, onSelect }: { items: Item[]; owned: Record<string, number>; selectedId: string; onSelect: (id: string) => void }) {
  const [mode, setMode] = useState<ItemKind>('ぬいキー');
  const [keyImageSize, setKeyImageSize] = useState<KeychainImageSize>('normal');
  const visibleItems = items;
  const slotCount = 9;
  const displayItems: (Item | null)[] = [...visibleItems, ...Array.from({ length: Math.max(0, slotCount - visibleItems.length) }, () => null)];
  const ownedCount = visibleItems.filter((item) => (owned[item.id] ?? 0) > 0).length;
  const completionPercent = Math.round((ownedCount / (mode === 'ぬいキー' ? 40 : 30)) * 100);
  const title = mode === 'ぬいキー' ? `ぬいキー（${keyImageSize === 'small' ? 'Sサイズ' : '通常サイズ'}）` : 'ぬいぐるみ';
  return (
    <View style={styles.collectionScreenBackground}>
      <ScrollView scrollEnabled={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.collectionScrollContent}>
      <View style={styles.collectionHeaderBar}><Pressable onPress={() => setMode(mode === 'ぬいキー' ? 'ぬいぐるみ' : 'ぬいキー')} style={styles.backButton}><Text style={styles.backButtonText}>‹</Text></Pressable><Text style={styles.collectionHeaderTitle}>{title}</Text><View style={styles.collectionHeaderHeart}><Text>♡</Text></View></View>
      <View style={styles.collectionModeTabs}><Pressable onPress={() => setMode('ぬいキー')} style={[styles.collectionModeTab, mode === 'ぬいキー' && styles.collectionModeTabActive]}><Text style={[styles.collectionModeText, mode === 'ぬいキー' && styles.collectionModeTextActive]}>ぬいキー</Text></Pressable><Pressable onPress={() => setMode('ぬいぐるみ')} style={[styles.collectionModeTab, mode === 'ぬいぐるみ' && styles.collectionModeTabActive]}><Text style={[styles.collectionModeText, mode === 'ぬいぐるみ' && styles.collectionModeTextActive]}>ぬいぐるみ</Text></Pressable></View>
      {mode === 'ぬいキー' ? <View style={styles.collectionKeySizeTabs}><Pressable onPress={() => setKeyImageSize('normal')} style={[styles.collectionKeySizeTab, keyImageSize === 'normal' && styles.collectionKeySizeTabActive]} accessibilityRole="tab" accessibilityState={{ selected: keyImageSize === 'normal' }}><Text style={[styles.collectionKeySizeText, keyImageSize === 'normal' && styles.collectionKeySizeTextActive]}>通常サイズ</Text></Pressable><Pressable onPress={() => setKeyImageSize('small')} style={[styles.collectionKeySizeTab, keyImageSize === 'small' && styles.collectionKeySizeTabActive]} accessibilityRole="tab" accessibilityState={{ selected: keyImageSize === 'small' }}><Text style={[styles.collectionKeySizeText, keyImageSize === 'small' && styles.collectionKeySizeTextActive]}>Sサイズ</Text></Pressable></View> : null}
      <View style={[styles.collectionDisplay, mode === 'ぬいぐるみ' && styles.collectionDisplayPlush]}>{mode === 'ぬいキー' ? <KeychainGrid items={displayItems} owned={owned} selectedId={selectedId} onSelect={onSelect} imageSize={keyImageSize} /> : <View style={styles.plushCollectionShelf}>{displayItems.map((item, index) => <Pressable key={`${mode}-${item?.id ?? 'locked'}-${index}`} onPress={() => item && owned[item.id] ? onSelect(item.id) : undefined} style={[styles.plushCollectionItem, { transform: [{ translateY: index < 3 ? 0 : index < 6 ? -7 : -10 }] }]}><View style={[styles.plushCollectionBody, item && (owned[item.id] ?? 0) > 0 && styles.plushCollectionBodyOwned, item && selectedId === item.id && styles.plushCollectionSelected]}>{item && (owned[item.id] ?? 0) > 0 ? <Image source={item.image} resizeMode="contain" style={styles.plushCollectionImage} /> : <View style={styles.collectionLocked}><Text style={styles.collectionLockedText}>?</Text></View>}</View><Text style={styles.collectionPlushName} numberOfLines={1}>{item ? item.name.replace(' ぬいキー', '').replace(' ぬい', '') : '未発見'}</Text></Pressable>)}</View>}</View>
      <View style={styles.collectionCountRow}><Text style={styles.collectionCount}>{ownedCount} / {mode === 'ぬいキー' ? '40' : '30'}</Text><View style={styles.collectionProgress}><Text style={styles.collectionCountHint}>★ コンプリート率 {completionPercent}%</Text><View style={styles.collectionProgressTrack}><View style={[styles.collectionProgressFill, { width: `${Math.min(100, completionPercent)}%` }]} /></View></View><View style={styles.collectionFilter}><Text style={styles.collectionFilterText}>▽ 絞り込み</Text></View></View>
      </ScrollView>
    </View>
  );
}

function MobbyTimeScreen({ today, claimed, onGet, secondsLeft }: { today: Item; claimed: boolean; onGet: () => void; secondsLeft: number }) {
  const active = secondsLeft > 0;
  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.timeHeader}><Text style={styles.eyebrow}>EVERYONE, SAME TIME</Text><Text style={styles.bigTitle}>{active ? 'MOBBY TIME' : 'MOBBY TIME FINISH'}</Text><Text style={styles.timeHeaderSub}>1日1回、みんな同時にモビーがやってくる。</Text><View style={styles.bigTimer}><Text style={styles.bigTimerLabel}>{active ? '残り' : '次回まで'}</Text><Text style={styles.bigTimerValue}>{active ? `${minutes}:${seconds}` : '明日'}</Text><Text style={styles.bigTimerUnit}>TODAY 19:30 — 20:00</Text></View></View>
      <View style={styles.encounterCard}><View style={styles.encounterStepRow}><View style={styles.encounterStepActive}><Text style={styles.stepNo}>01</Text><Text style={styles.stepText}>さがす</Text></View><View style={styles.stepLine} /><View style={styles.encounterStep}><Text style={styles.stepNo}>02</Text><Text style={styles.stepText}>GET</Text></View><View style={styles.stepLine} /><View style={styles.encounterStep}><Text style={styles.stepNo}>03</Text><Text style={styles.stepText}>集める</Text></View></View><View style={styles.encounterScene}><View style={styles.encounterGlow} />{claimed ? <Image source={today.image} resizeMode="contain" style={styles.encounterImage} /> : <View style={[styles.encounterSilhouette, { backgroundColor: today.accent }]}><Text style={styles.silhouetteEyes}>••</Text><Text style={styles.silhouetteQuestion}>?</Text></View>}<View style={styles.encounterBubble}><Text style={styles.encounterBubbleTitle}>{claimed ? 'NEW!' : active ? '何かいる……' : 'また明日'}</Text><Text style={styles.encounterBubbleText}>{claimed ? today.name : active ? '物陰がふるふるしている' : 'MOBBY TIMEは終了しました'}</Text></View></View><Text style={styles.encounterCaption}>{claimed ? '今日のモビーがコレクションに追加されました。' : active ? 'シルエットをタップして、モビーを見つけよう。' : 'GETと交換は次のMOBBY TIMEまでお休みです。'}</Text><Pressable accessibilityRole="button" onPress={onGet} disabled={claimed || !active} style={({ pressed }) => [styles.primaryButton, (claimed || !active) && styles.primaryButtonDone, pressed && styles.pressed]}><Image source={claimed ? MOBBY_ICON : SPARKLES} resizeMode="contain" style={styles.primaryButtonIcon} /><Text style={styles.primaryButtonText}>{claimed ? 'GET済み　コレクションを見る' : active ? '今日のモビーをGET！' : '次のMOBBY TIMEを待つ'}</Text></Pressable></View>
    </ScrollView>
  );
}

function PullableMobby({ selected, onPull }: { selected: Item; onPull: () => void }) {
  const [status, setStatus] = useState<'idle' | 'pulling' | 'released'>('idle');
  const scaleX = useRef(new Animated.Value(1)).current;
  const scaleY = useRef(new Animated.Value(1)).current;
  const meshRef = useRef<MobbyPullMeshHandle>(null);

  const release = useCallback((dx: number, dy: number) => {
    if (Math.hypot(dx, dy) < 4) {
      setStatus('idle');
      return;
    }
    meshRef.current?.release();
    setStatus('released');
    onPull();
    Animated.parallel([
      Animated.spring(scaleX, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 13 }),
      Animated.spring(scaleY, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 13 }),
    ]).start(() => setStatus('idle'));
  }, [onPull, scaleX, scaleY]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      scaleX.stopAnimation();
      scaleY.stopAnimation();
      setStatus('pulling');
      meshRef.current?.begin(event.nativeEvent.locationX, event.nativeEvent.locationY);
    },
    onPanResponderMove: (_event, gesture) => {
      const dx = Math.max(-64, Math.min(64, gesture.dx));
      const dy = Math.max(-50, Math.min(50, gesture.dy));
      scaleX.setValue(1 + Math.min(0.16, Math.abs(dx) / 430));
      scaleY.setValue(1 - Math.min(0.06, Math.abs(dx) / 1100));
      meshRef.current?.update(dx, dy);
    },
    onPanResponderRelease: (_event, gesture) => release(gesture.dx, gesture.dy),
    onPanResponderTerminate: (_event, gesture) => release(gesture.dx, gesture.dy),
  }), [release, scaleX, scaleY]);

  const meshVisible = Platform.OS === 'web' && status !== 'idle';
  return (
    <View style={styles.pullableWrap}>
      <Animated.View {...panResponder.panHandlers} accessibilityRole="button" accessibilityLabel="モビーのほっぺを引っ張る" style={[styles.pullableSlot, { transform: [{ scaleX }, { scaleY }] }]}>
        <Image source={selected.image} resizeMode="contain" style={styles.pullableBody} />
      </Animated.View>
      <MobbyPullMesh ref={meshRef} source={selected.image} size={320} visible={meshVisible} />
      {status !== 'idle' ? <View pointerEvents="none" style={styles.pullStatus}><Text style={styles.pullStatusText}>{status === 'pulling' ? 'のびてる……' : 'びよーん！'}</Text></View> : null}
    </View>
  );
}

function TouchScreen({ selected, onInteract, reaction }: { selected: Item; onInteract: (kind: string) => void; reaction: string }) {
  return (
    <ImageBackground source={TOUCH_BACKGROUND} resizeMode="cover" style={styles.touchScreenBackground} imageStyle={styles.touchScreenBackgroundImage}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.touchScrollContent}>
      <View style={styles.touchTop}><Text style={styles.eyebrow}>DIGITAL PLUSH</Text><View style={styles.touchTitleRow}><Text style={styles.bigTitle}>{selected.name}</Text><View style={[styles.rarityBadge, { backgroundColor: selected.accent }]}><Text style={styles.rarityBadgeText}>{selected.rarity}</Text></View></View></View>
      <ImageBackground source={TOUCH_BACKGROUND} resizeMode="cover" style={styles.touchStage} imageStyle={styles.touchStageImage}><PullableMobby selected={selected} onPull={() => onInteract('ほっぺ')} />{reaction ? <View style={styles.touchBubble}><Text style={styles.touchBubbleText}>{reaction}</Text></View> : null}<Text style={styles.touchHand}>☝</Text><View style={styles.touchHearts}><Text style={styles.touchHeart}>♥</Text><Text style={styles.touchHeart}>♥</Text><Text style={styles.touchHeart}>♥</Text></View></ImageBackground>
      </ScrollView>
    </ImageBackground>
  );
}

function QrCode() {
  return <View style={styles.qrCode}>{QR_PATTERN.map((row, rowIndex) => <View key={`qr-${rowIndex}`} style={styles.qrRow}>{row.split('').map((cell, columnIndex) => <View key={`qr-${rowIndex}-${columnIndex}`} style={[styles.qrCell, cell === '1' && styles.qrCellOn]} />)}</View>)}</View>;
}

function TradeScreen({ items, owned, selectedId, onSelect }: { items: Item[]; owned: Record<string, number>; selectedId: string; onSelect: (id: string) => void }) {
  const [qrVisible, setQrVisible] = useState(false);
  const [tradeState, setTradeState] = useState<'idle' | 'ready' | 'done'>('idle');
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.tradeHeader}><Text style={styles.eyebrow}>TRADE DURING MOBBY TIME</Text><Text style={styles.bigTitle}>友達と交換</Text><Text style={styles.tradeSub}>フレンド機能なし。QRを見せるだけ。</Text></View>
      <View style={styles.tradeCard}><View style={styles.tradeCardTop}><View><Text style={styles.tradeCardKicker}>STEP 01</Text><Text style={styles.tradeCardTitle}>交換用QRをつなぐ</Text></View><View style={styles.liveDot}><View style={styles.liveDotCircle} /><Text style={styles.liveDotText}>LIVE</Text></View></View><View style={styles.qrStage}>{qrVisible ? <QrCode /> : <View style={styles.qrPlaceholder}><Image source={EXCHANGE} resizeMode="contain" style={styles.qrPlaceholderIcon} /><Text style={styles.qrPlaceholderText}>QRを表示して友達に見せよう</Text></View>}</View><Pressable onPress={() => setQrVisible((value) => !value)} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryButtonText}>{qrVisible ? 'QRを隠す' : 'QRを表示する'}</Text></Pressable><Text style={styles.qrExpiry}>交換成立・キャンセル・5分経過で無効になります</Text></View>
      <View style={styles.tradeCard}><Text style={styles.tradeCardKicker}>STEP 02</Text><Text style={styles.tradeCardTitle}>交換するグッズを選ぶ</Text><View style={styles.tradeItemRow}><Pressable onPress={() => onSelect(selected.id)} style={styles.tradeItem}><View style={[styles.tradeItemImage, { backgroundColor: selected.accent }]}><Image source={selected.kind === 'ぬいキー' ? selected.keyImage ?? selected.image : selected.image} resizeMode="contain" style={styles.tradeImage} /></View><Text style={styles.tradeItemName}>{selected.name}</Text><Text style={styles.tradeItemOwner}>あなた　×{owned[selected.id] ?? 0}</Text></Pressable><View style={styles.exchangeArrow}><Text>↔</Text></View><View style={styles.partnerItem}><View style={styles.partnerImage}><Text style={styles.partnerQuestion}>?</Text></View><Text style={styles.partnerName}>相手のグッズ</Text><Text style={styles.tradeItemOwner}>QR接続待ち</Text></View></View><View style={styles.tradePicker}>{items.filter((item) => (owned[item.id] ?? 0) > 0).map((item) => <Pressable key={item.id} onPress={() => onSelect(item.id)} style={[styles.tradePickerDot, item.id === selected.id && styles.tradePickerDotSelected]}><Image source={item.kind === 'ぬいキー' ? item.keyImage ?? item.image : item.image} resizeMode="contain" style={styles.tradePickerImage} /></Pressable>)}</View><Pressable onPress={() => setTradeState(tradeState === 'ready' ? 'done' : 'ready')} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><Text style={styles.secondaryButtonText}>{tradeState === 'idle' ? '交換内容を確認' : tradeState === 'ready' ? 'この内容で交換する' : '交換成立！'}</Text></Pressable></View>
    </ScrollView>
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
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedId, setSelectedId] = useState('yami-key');
  const [owned, setOwned] = useState(INITIAL_OWNED);
  const [claimed, setClaimed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(1421);
  const [reaction, setReaction] = useState('');
  const [notice, setNotice] = useState('');
  const selected = useMemo(() => ITEMS.find((item) => item.id === selectedId) ?? ITEMS[0], [selectedId]);
  const today = ITEMS[5];

  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft((value) => value > 0 ? value - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, []);

  const selectItem = (id: string) => { setSelectedId(id); setScreen('touch'); };
  const getToday = () => {
    if (secondsLeft <= 0) return;
    setClaimed(true);
    setOwned((current) => ({ ...current, [today.id]: (current[today.id] ?? 0) + 1 }));
    setSelectedId(today.id);
    setNotice('NEW! もびゆら ぬい がコレクションに追加されました');
  };

  const interact = (kind: string) => {
    const lines: Record<string, string> = { ほっぺ: 'むむっ。ほっぺは大事。' };
    setReaction(lines[kind] ?? '？');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outer}>
        <View style={styles.appShell}>
          <Image source={screen === 'home' ? HOME_WALL_BACKGROUND : screen === 'collection' ? COLLECTION_WALL_BACKGROUND : ROOM_BACKGROUND} resizeMode="cover" style={styles.appShellBackground} />
          <Header onBell={() => setNotice('お知らせ：MOBBY TIMEは毎日19:30から！')} />
          {notice ? <Pressable onPress={() => setNotice('')} style={styles.noticeToast}><Text style={styles.noticeToastText}>{notice}</Text><Text style={styles.noticeToastClose}>×</Text></Pressable> : null}
          <View style={styles.screenBody}>
            {screen === 'home' ? <HomeScreen selected={selected} onSelect={setSelectedId} /> : null}
            {screen === 'collection' ? <CollectionScreen items={ITEMS} owned={owned} selectedId={selectedId} onSelect={selectItem} /> : null}
            {screen === 'time' ? <MobbyTimeScreen today={today} claimed={claimed} onGet={getToday} secondsLeft={secondsLeft} /> : null}
            {screen === 'touch' ? <TouchScreen selected={selected} onInteract={interact} reaction={reaction} /> : null}
            {screen === 'trade' ? <TradeScreen items={ITEMS} owned={owned} selectedId={selectedId} onSelect={setSelectedId} /> : null}
          </View>
          <BottomNav screen={screen} setScreen={setScreen} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#E7D3BC' },
  outer: { flex: 1, alignItems: 'center', backgroundColor: Platform.OS === 'web' ? '#E7D3BC' : '#FFF7EA' },
  appShell: { flex: 1, width: '100%', maxWidth: 440, backgroundColor: 'transparent', overflow: 'hidden', ...(Platform.OS === 'web' ? { boxShadow: '0 16px 48px rgba(81, 48, 54, 0.18)' } : {}) },
  appShellBackground: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', objectFit: 'cover' },
  header: { minHeight: 74, paddingHorizontal: 13, paddingTop: 7, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent', borderBottomWidth: 0 },
  logo: { width: 103, height: 50, marginLeft: -5 },
  headerCopy: { flex: 1, marginLeft: 2 },
  headerKicker: { color: '#806174', fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  headerDay: { color: '#49334E', fontSize: 12, fontWeight: '900', marginTop: 3 },
  headerDot: { color: '#D18A9C' },
  bellButton: { width: 35, height: 35, borderRadius: 13, borderWidth: 1.2, borderColor: '#E1BF9D', backgroundColor: '#FFFDF6', alignItems: 'center', justifyContent: 'center' },
  bellIcon: { width: 21, height: 21 },
  bellBadge: { position: 'absolute', right: -4, top: -6, width: 17, height: 17, borderRadius: 9, backgroundColor: '#E47884', borderWidth: 1.5, borderColor: '#FFF8EC', alignItems: 'center', justifyContent: 'center' },
  bellBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  noticeToast: { position: 'absolute', zIndex: 30, top: 78, left: 15, right: 15, minHeight: 44, paddingHorizontal: 13, borderRadius: 15, backgroundColor: '#503B65', flexDirection: 'row', alignItems: 'center', shadowColor: '#3E294D', shadowOpacity: 0.23, shadowRadius: 9, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  noticeToastText: { flex: 1, color: '#FFF8ED', fontSize: 11, fontWeight: '800' },
  noticeToastClose: { color: '#F5CED2', fontSize: 21, marginLeft: 8 },
  screenBody: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingTop: 13, paddingBottom: 105 },
  homeScreenBackground: { flex: 1 },
  brandWrap: { width: 104, alignItems: 'center', justifyContent: 'center', marginLeft: -5 },
  headerSpacer: { flex: 1 },
  brand: { color: '#5A3A6A', fontSize: 25, lineHeight: 28, fontWeight: '900', letterSpacing: 1.3 },
  brandSub: { color: '#806189', fontSize: 10, fontWeight: '900', letterSpacing: 2.2, marginTop: -2 },
  homeRoom: { flex: 1, position: 'relative', overflow: 'hidden' },
  homeShelfBase: { position: 'absolute', top: '-15%', left: 0, right: 0, width: '100%', height: '100%', zIndex: 0 },
  // Nine keychains are distributed over two broad rows so the center stage
  // remains clear for the selected Mobby and the shelf below.
  homeWallKeys: { position: 'absolute', top: '7%', left: '7%', right: '7%', height: '43%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'space-between', zIndex: 2 },
  homeWallKey: { width: '17%', height: '43%', alignItems: 'center', justifyContent: 'flex-start', borderRadius: 12, position: 'relative', overflow: 'visible' },
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
  homePlushShelf: { position: 'absolute', top: '42.5%', left: '8%', right: '8%', height: '18%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 3 },
  homePlushItem: { width: '22%', height: '100%', alignItems: 'center', justifyContent: 'flex-end', borderRadius: 13, position: 'relative' },
  homePlushImage: { width: 70, height: 80 },
  homePlushContactShadow: { position: 'absolute', bottom: -2, width: '62%', height: 7, borderRadius: 8, backgroundColor: 'rgba(84,52,33,0.2)', zIndex: 0 },
  homeCharacterPicker: { position: 'absolute', top: '63%', left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  homeCharacterArrow: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,249,237,0.92)', borderWidth: 1.2, borderColor: '#E2BF9B', shadowColor: '#684B4B', shadowOpacity: 0.18, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3, outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  homeCharacterArrowText: { color: '#76516C', fontSize: 30, lineHeight: 32, marginTop: -2 },
  homeMainCharacter: { position: 'absolute', left: '50%', bottom: 96, width: 220, height: 250, marginLeft: -110, zIndex: 8 },
  homeMainCharacterCompact: { bottom: 42, width: 178, height: 198, marginLeft: -89 },
  collectionHeaderBar: { height: 47, borderRadius: 16, backgroundColor: '#FFFDF5', borderWidth: 1.1, borderColor: '#E8D0B3', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  collectionScreenBackground: { flex: 1, backgroundColor: 'transparent' },
  collectionScrollContent: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 75 },
  backButton: { width: 32, height: 32, borderRadius: 11, backgroundColor: '#F9EEDC', alignItems: 'center', justifyContent: 'center' },
  backButtonText: { color: '#604664', fontSize: 28, lineHeight: 29, marginTop: -3 },
  collectionHeaderTitle: { flex: 1, color: '#5B3F57', fontSize: 14, fontWeight: '900', textAlign: 'center' },
  collectionHeaderHeart: { width: 32, height: 32, borderRadius: 11, backgroundColor: '#F8E1E2', alignItems: 'center', justifyContent: 'center' },
  collectionHeaderHeartText: { color: '#9D6377', fontSize: 20 },
  collectionModeTabs: { flexDirection: 'row', alignSelf: 'center', marginTop: 12, padding: 3, borderRadius: 15, backgroundColor: '#E7D9E3' },
  collectionModeTab: { minWidth: 112, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 12, alignItems: 'center' },
  collectionModeTabActive: { backgroundColor: '#6B547D' },
  collectionModeText: { color: '#755B73', fontSize: 10, fontWeight: '900' },
  collectionModeTextActive: { color: '#FFF8EA' },
  collectionKeySizeTabs: { flexDirection: 'row', alignSelf: 'center', marginTop: 7, padding: 2, borderRadius: 12, backgroundColor: '#F1E7E2', borderWidth: 1, borderColor: '#E6D3CC' },
  collectionKeySizeTab: { minWidth: 98, paddingHorizontal: 13, paddingVertical: 5, borderRadius: 9, alignItems: 'center' },
  collectionKeySizeTabActive: { backgroundColor: '#E8C3B2' },
  collectionKeySizeText: { color: '#8C6A73', fontSize: 9, fontWeight: '900' },
  collectionKeySizeTextActive: { color: '#5E4059' },
  collectionDisplay: { height: 430, marginTop: 10, backgroundColor: 'transparent', paddingHorizontal: 9, paddingTop: 15, overflow: 'visible' },
  collectionDisplayPlush: { width: '100%', alignSelf: 'stretch', backgroundColor: 'transparent', padding: 0, height: 430 },
  keyCollectionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  collectionKeyItem: { width: '31%', alignItems: 'center', marginBottom: 6 },
  collectionKeyPressable: { alignItems: 'center', outlineColor: 'transparent', outlineWidth: 0 },
  collectionKeySwing: { alignItems: 'center', transformOrigin: '50% 0%' },
  collectionKeyHook: { height: 29, alignItems: 'center' },
  collectionKeyHookOwned: { height: 0 },
  collectionKeyRing: { width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: '#77685D', backgroundColor: '#EFE1CC' },
  collectionKeyStem: { width: 3, height: 17, backgroundColor: '#77685D', borderRadius: 2, marginTop: -1 },
  collectionKeyBody: { width: 55, height: 70, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(91,64,75,0.28)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  collectionKeyBodyOwned: { width: 84, height: 100, borderRadius: 0, borderWidth: 0, borderColor: 'transparent', backgroundColor: 'transparent', overflow: 'visible' },
  collectionKeySelected: { transform: [{ scale: 1.06 }] },
  collectionKeyImage: { width: 84, height: 100 },
  collectionKeyName: { width: 64, color: '#604757', fontSize: 8, fontWeight: '900', textAlign: 'center', marginTop: 3 },
  collectionLocked: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(96,80,94,0.52)', alignItems: 'center', justifyContent: 'center' },
  collectionLockedText: { color: '#FFF7E6', fontSize: 27, fontWeight: '900' },
  plushCollectionShelf: { width: '84%', flex: 1, alignSelf: 'flex-start', marginLeft: '8%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', alignContent: 'flex-start', justifyContent: 'space-between', paddingTop: 80, paddingBottom: 0 },
  plushCollectionItem: { width: '31%', alignItems: 'center', marginBottom: 4 },
  plushCollectionBody: { width: 72, height: 88, borderRadius: 20, borderWidth: 1.4, borderColor: 'rgba(86,58,58,0.27)', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  plushCollectionBodyOwned: { width: 84, height: 90, borderRadius: 0, borderWidth: 0, borderColor: 'transparent', backgroundColor: 'transparent', overflow: 'visible' },
  plushCollectionSelected: { transform: [{ scale: 1.05 }] },
  plushCollectionImage: { width: 84, height: 88 },
  collectionPlushName: { color: '#FFF8EA', fontSize: 8, fontWeight: '900', textShadowColor: '#664233', textShadowRadius: 3, marginTop: 1 },
  collectionCountRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 19, marginTop: 8, backgroundColor: 'rgba(255,244,217,0.9)', borderWidth: 1, borderColor: '#E4C7A4' },
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
  timeHeader: { alignItems: 'center', paddingTop: 9, paddingBottom: 17 },
  bigTitle: { color: '#4D3455', fontSize: 29, fontWeight: '900', letterSpacing: 1.2, marginTop: 3 },
  timeHeaderSub: { color: '#946F7D', fontSize: 11, fontWeight: '800', marginTop: 4, textAlign: 'center' },
  bigTimer: { marginTop: 13, minWidth: 172, paddingHorizontal: 19, paddingVertical: 8, borderRadius: 18, backgroundColor: '#5B4672', alignItems: 'center' },
  bigTimerLabel: { color: '#E7D9E0', fontSize: 10, fontWeight: '800' },
  bigTimerValue: { color: '#FFF7EA', fontSize: 30, fontWeight: '900', letterSpacing: 2 },
  bigTimerUnit: { color: '#E7D9E0', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  encounterCard: { padding: 13, borderRadius: 24, backgroundColor: '#FFFDF6', borderWidth: 1.3, borderColor: '#E8D0B3', shadowColor: '#78535E', shadowOpacity: 0.12, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  encounterStepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  encounterStep: { alignItems: 'center', opacity: 0.48 },
  encounterStepActive: { alignItems: 'center' },
  stepNo: { color: '#8E687D', fontSize: 9, fontWeight: '900' },
  stepText: { color: '#5C3E54', fontSize: 10, fontWeight: '900', marginTop: 2 },
  stepLine: { width: 36, height: 1.5, backgroundColor: '#DFC7B0', marginHorizontal: 8, marginTop: 9 },
  encounterScene: { height: 280, borderRadius: 19, overflow: 'hidden', backgroundColor: '#E6D1BE', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  encounterGlow: { position: 'absolute', width: 245, height: 245, borderRadius: 130, backgroundColor: 'rgba(255,242,204,0.62)' },
  encounterSilhouette: { width: 154, height: 194, borderRadius: 75, alignItems: 'center', justifyContent: 'center', opacity: 0.64, borderWidth: 4, borderColor: 'rgba(67,55,69,0.26)' },
  silhouetteEyes: { color: '#5D5367', fontSize: 30, letterSpacing: 20, marginLeft: 17 },
  silhouetteQuestion: { color: '#5D5367', fontSize: 54, fontWeight: '900', marginTop: 13 },
  encounterImage: { width: 208, height: 246 },
  encounterBubble: { position: 'absolute', top: 13, right: 12, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 14, backgroundColor: '#FFFDF4', borderWidth: 1, borderColor: '#E3CBAF', transform: [{ rotate: '2deg' }] },
  encounterBubbleTitle: { color: '#8E5D84', fontSize: 14, fontWeight: '900' },
  encounterBubbleText: { color: '#6D5662', fontSize: 9, fontWeight: '800', marginTop: 2 },
  encounterCaption: { color: '#99777E', fontSize: 10, fontWeight: '700', textAlign: 'center', marginVertical: 10 },
  primaryButton: { minHeight: 49, borderRadius: 17, backgroundColor: '#6B547D', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 17 },
  primaryButtonDone: { backgroundColor: '#9A8491' },
  primaryButtonIcon: { width: 22, height: 22, marginRight: 5 },
  primaryButtonText: { color: '#FFF9EC', fontSize: 13, fontWeight: '900' },
  touchTop: { paddingTop: 7, paddingBottom: 12 },
  touchTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  touchSub: { color: '#987480', fontSize: 11, fontWeight: '700', marginTop: 3 },
  rarityBadge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, marginLeft: 6 },
  rarityBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  touchScreenBackground: { flex: 1 },
  touchScreenBackgroundImage: { opacity: 0.3 },
  touchScrollContent: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 105 },
  touchStage: { height: 500, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', position: 'relative', borderWidth: 1.4, borderColor: 'rgba(91,64,92,0.22)' },
  touchStageImage: { opacity: 0.98 },
  pullableWrap: { width: 332, height: 365, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  // PanResponder turns this view into an accessible button on web. Suppress
  // the browser's default focus ring so a completed pull does not leave a
  // harsh black rectangle over the parchment stage.
  pullableSlot: { width: 320, height: 344, alignItems: 'center', justifyContent: 'center', zIndex: 2, outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  pullableBody: { width: 320, height: 344 },
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
  tradeHeader: { paddingTop: 7, paddingBottom: 16 },
  tradeSub: { color: '#987480', fontSize: 11, fontWeight: '700', marginTop: 3 },
  tradeCard: { padding: 14, borderRadius: 23, backgroundColor: '#FFFDF6', borderWidth: 1.3, borderColor: '#E8D0B3', marginBottom: 13 },
  tradeCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tradeCardKicker: { color: '#A47887', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  tradeCardTitle: { color: '#5B3D54', fontSize: 17, fontWeight: '900', marginTop: 3 },
  liveDot: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, backgroundColor: '#F6DFDE' },
  liveDotCircle: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E37A84', marginRight: 4 },
  liveDotText: { color: '#A66070', fontSize: 9, fontWeight: '900' },
  qrStage: { height: 192, borderRadius: 17, marginTop: 13, backgroundColor: '#F5E9DC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EBD4B8' },
  qrPlaceholder: { alignItems: 'center' },
  qrPlaceholderIcon: { width: 48, height: 48, opacity: 0.72 },
  qrPlaceholderText: { color: '#967783', fontSize: 11, fontWeight: '800', marginTop: 8 },
  qrCode: { padding: 11, backgroundColor: '#FFF', borderRadius: 5, borderWidth: 1, borderColor: '#E2D8D1' },
  qrRow: { height: 5, flexDirection: 'row' },
  qrCell: { width: 5, height: 5, backgroundColor: '#FFF' },
  qrCellOn: { backgroundColor: '#3C3142' },
  qrExpiry: { color: '#AE8A8A', fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  tradeItemRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  tradeItem: { flex: 1, alignItems: 'center' },
  tradeItemImage: { width: 88, height: 93, borderRadius: 21, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tradeImage: { width: 84, height: 90 },
  tradeItemName: { color: '#5D3F56', fontSize: 10, fontWeight: '900', marginTop: 5, textAlign: 'center' },
  tradeItemOwner: { color: '#A57E83', fontSize: 9, fontWeight: '800', marginTop: 2 },
  exchangeArrow: { width: 37, height: 37, borderRadius: 19, backgroundColor: '#F2DFE3', alignItems: 'center', justifyContent: 'center', marginHorizontal: 7 },
  exchangeArrowText: { color: '#86617A', fontSize: 22 },
  partnerItem: { flex: 1, alignItems: 'center' },
  partnerImage: { width: 88, height: 93, borderRadius: 21, backgroundColor: '#EFE5DC', borderWidth: 1.5, borderColor: '#D8C3B5', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  partnerQuestion: { color: '#B59E9D', fontSize: 35, fontWeight: '900' },
  partnerName: { color: '#7B5D69', fontSize: 10, fontWeight: '900', marginTop: 5 },
  tradePicker: { flexDirection: 'row', justifyContent: 'center', marginTop: 13 },
  tradePickerDot: { width: 39, height: 39, borderRadius: 13, marginHorizontal: 3, backgroundColor: '#F0DED7', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8C7B7' },
  tradePickerDotSelected: { borderColor: '#76547D', borderWidth: 2.5, backgroundColor: '#F4E6EC' },
  tradePickerImage: { width: 35, height: 35 },
  secondaryButton: { minHeight: 45, borderRadius: 16, backgroundColor: '#F0D8D7', alignItems: 'center', justifyContent: 'center', marginTop: 13 },
  secondaryButtonText: { color: '#724E66', fontSize: 12, fontWeight: '900' },
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
