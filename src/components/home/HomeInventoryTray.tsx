import { Fragment, useMemo, useRef, useState } from 'react';
import { Image, ImageBackground, PanResponder, Pressable, ScrollView, StyleSheet, View, type PanResponderGestureState } from 'react-native';

import {
  collectibleImage,
  itemCharacterName,
  ownedCollectibleCount,
  type CollectibleVariant,
} from '@/data/collectibles';
import {
  ownedHomePlacementIds,
  resolveHomePlacement,
  type HomeLayoutV1,
  type HomePlacementId,
  type HomePlacementKind,
} from '@/domain/home/homeLayout';
import { BlackStarToggle } from '@/components/characters';
import { useGachaTheme } from '@/theme/GachaThemeContext';
import { Text } from '@/ui/layout/visualPrimitives';

const TRAY_SURFACE = require('../../../assets/generated-ui/inventory-tray-background-v1.png');
const TILE_SURFACE = require('../../../assets/generated-ui/surface-tile-square-v1.png');
const TILE_SELECTED_SURFACE = require('../../../assets/generated-ui/surface-tile-selected-v1.png');

const shortVariantLabel = (variant: CollectibleVariant) => variant === 'key-normal' ? '通常' : variant === 'key-small' ? 'S' : 'ぬい';
type KeyVariant = Exclude<CollectibleVariant, 'plush'>;

type TrayItemProps = {
  copyCount: number;
  dragEnabled: boolean;
  dragging: boolean;
  id: HomePlacementId;
  onDragCancel: (id: HomePlacementId) => void;
  onDragEnd: (id: HomePlacementId, pageX: number, pageY: number) => void;
  onDragMove: (id: HomePlacementId, pageX: number, pageY: number) => void;
  onDragStart: (id: HomePlacementId, pageX: number, pageY: number) => void;
  onSelect: (id: HomePlacementId) => void;
  placed: boolean;
  selected: boolean;
};

function TrayItem({
  copyCount,
  dragEnabled,
  dragging,
  id,
  onDragCancel,
  onDragEnd,
  onDragMove,
  onDragStart,
  onSelect,
  placed,
  selected,
}: TrayItemProps) {
  const { activeTheme } = useGachaTheme();
  const placement = resolveHomePlacement(id);
  const suppressPressRef = useRef(false);
  const axisRef = useRef<'pending' | 'horizontal' | 'vertical' | 'rejected'>('pending');
  const dragCallbacksRef = useRef({ onDragCancel, onDragEnd, onDragMove, onDragStart, onSelect });
  dragCallbacksRef.current = { onDragCancel, onDragEnd, onDragMove, onDragStart, onSelect };
  const panResponder = useMemo(() => {
    const shouldClaimDrag = (gesture: PanResponderGestureState) => {
      if (!dragEnabled) {
        axisRef.current = 'rejected';
        return false;
      }
      if (axisRef.current === 'vertical') return true;
      if (axisRef.current !== 'pending') return false;
      const absX = Math.abs(gesture.dx);
      const absY = Math.abs(gesture.dy);
      if (absX < 5 && absY < 5) return false;
      // Prefer an intentional upward lift even when the finger starts a little
      // diagonally. A clearly horizontal gesture still belongs to the tray.
      if (gesture.dy < -5 && absY >= absX * 0.75) {
        axisRef.current = 'vertical';
        return true;
      }
      if (absX >= 10 && absX > absY * 1.5) {
        axisRef.current = 'horizontal';
        return false;
      }
      if (gesture.dy > 10 && absY > absX * 1.2) axisRef.current = 'rejected';
      return false;
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => {
        // Before this view owns the responder, React Native may report an
        // inaccurate touch count. Axis detection is sufficient for gesture
        // arbitration across touch and mouse input.
        axisRef.current = dragEnabled ? 'pending' : 'rejected';
        return false;
      },
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_event, gesture) => shouldClaimDrag(gesture),
      onMoveShouldSetPanResponderCapture: (_event, gesture) => shouldClaimDrag(gesture),
      onPanResponderGrant: (event) => {
        suppressPressRef.current = true;
        dragCallbacksRef.current.onDragStart(id, event.nativeEvent.pageX, event.nativeEvent.pageY);
      },
      onPanResponderMove: (event) => {
        dragCallbacksRef.current.onDragMove(id, event.nativeEvent.pageX, event.nativeEvent.pageY);
      },
      onPanResponderRelease: (event) => {
        dragCallbacksRef.current.onDragEnd(id, event.nativeEvent.pageX, event.nativeEvent.pageY);
        axisRef.current = 'pending';
        setTimeout(() => { suppressPressRef.current = false; }, 0);
      },
      onPanResponderTerminate: () => {
        dragCallbacksRef.current.onDragCancel(id);
        axisRef.current = 'pending';
        suppressPressRef.current = false;
      },
      onPanResponderReject: () => { axisRef.current = 'pending'; },
      onPanResponderTerminationRequest: () => false,
    });
  }, [dragEnabled, id]);

  if (!placement) return null;
  const copyLabel = copyCount > 1 ? `、${placement.copyNumber}個目／${copyCount}個中` : '';
  const variantLabel = placement.variant === 'plush' ? 'ぬいぐるみ' : `${shortVariantLabel(placement.variant)}ぬいキー`;
  return <View accessible={false} {...(dragEnabled ? panResponder.panHandlers : {})} style={trayStyles.itemGestureWrapper}>
    <Pressable
      accessibilityHint={placed ? '現在ホームに飾られています。上へドラッグすると別の場所へ移動できます' : '選択せず、そのまま上へドラッグして飾れます'}
      accessibilityLabel={`${itemCharacterName(placement.item)} ${variantLabel}${copyLabel}。所持数${copyCount}。${placed ? '飾り中' : '未表示'}${selected ? '、移動先を選択中' : ''}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => { if (!dragging && !suppressPressRef.current) onSelect(id); }}
      style={({ pressed }) => [trayStyles.itemButton, placed && trayStyles.placedItem, dragging && trayStyles.draggingItem, pressed && !dragging && trayStyles.pressed]}
    >
      <ImageBackground source={activeTheme?.assets.card ?? (selected ? TILE_SELECTED_SURFACE : TILE_SURFACE)} resizeMode="stretch" style={trayStyles.tile} imageStyle={trayStyles.tileImage}>
        <View style={trayStyles.dragHandle}>
          <Image source={collectibleImage(placement.item, placement.variant)} resizeMode="contain" style={[trayStyles.itemImage, placement.variant === 'key-small' && trayStyles.itemImageSmall]} />
        </View>
        {placed ? <View pointerEvents="none" style={trayStyles.placedOverlay}><Text style={trayStyles.placedOverlayText}>✓ 飾り中</Text></View> : null}
        <View pointerEvents="none" style={trayStyles.ownedBadge}><Text style={trayStyles.ownedBadgeText}>所持×{copyCount}</Text></View>
      </ImageBackground>
      <Text numberOfLines={1} style={trayStyles.itemName}>{itemCharacterName(placement.item)}</Text>
      <Text style={trayStyles.itemVariant}>{shortVariantLabel(placement.variant)}{copyCount > 1 ? ` · ${placement.copyNumber}/${copyCount}` : ''}</Text>
    </Pressable>
  </View>;
}

export function HomeInventoryTray({
  activeKind,
  activeKeyVariant,
  draggingId,
  homeLayout,
  orderLayout,
  onChangeKind,
  onChangeKeyVariant,
  onDragCancel,
  onDragEnd,
  onDragMove,
  onDragStart,
  onSelect,
  owned,
  selectedId,
}: {
  activeKind: HomePlacementKind;
  activeKeyVariant: KeyVariant;
  draggingId?: HomePlacementId | null;
  homeLayout: HomeLayoutV1;
  orderLayout: HomeLayoutV1;
  onChangeKind: (kind: HomePlacementKind) => void;
  onChangeKeyVariant: (variant: KeyVariant) => void;
  onDragCancel: (id: HomePlacementId) => void;
  onDragEnd: (id: HomePlacementId, pageX: number, pageY: number) => void;
  onDragMove: (id: HomePlacementId, pageX: number, pageY: number) => void;
  onDragStart: (id: HomePlacementId, pageX: number, pageY: number) => void;
  onSelect: (id: HomePlacementId) => void;
  owned: Readonly<Record<string, number>>;
  selectedId: HomePlacementId | null;
}) {
  const { activeTheme } = useGachaTheme();
  const [showBlackStars, setShowBlackStars] = useState(false);
  const filteredIds = useMemo(() => ownedHomePlacementIds(owned, activeKind).filter((id) => {
    const placement = resolveHomePlacement(id);
    if (!placement || placement.item.faction !== (showBlackStars ? 'kuroboshi' : 'mobby')) return false;
    if (activeKind === 'plush') return true;
    return placement.variant === activeKeyVariant;
  }), [activeKeyVariant, activeKind, owned, showBlackStars]);
  const placedIds = useMemo(() => new Set([...homeLayout.wallSlots, ...homeLayout.shelfSlots].flatMap((slot) => {
    const placement = resolveHomePlacement(slot);
    return placement ? [placement.id] : [];
  })), [homeLayout]);
  const orderPlacedIds = useMemo(() => new Set([...orderLayout.wallSlots, ...orderLayout.shelfSlots].flatMap((slot) => {
    const placement = resolveHomePlacement(slot);
    return placement ? [placement.id] : [];
  })), [orderLayout]);
  const ids = useMemo(() => [
    ...filteredIds.filter((id) => !orderPlacedIds.has(id)),
    ...filteredIds.filter((id) => orderPlacedIds.has(id)),
  ], [filteredIds, orderPlacedIds]);
  const hiddenCount = ids.filter((id) => !placedIds.has(id)).length;
  const firstPlacedIndex = ids.findIndex((id) => orderPlacedIds.has(id));

  return <ImageBackground source={activeTheme?.assets.navigation ?? TRAY_SURFACE} resizeMode={activeTheme ? 'stretch' : 'cover'} style={trayStyles.surface} imageStyle={trayStyles.surfaceImage}>
    <View style={trayStyles.header}>
      <View style={trayStyles.headingCopy}>
        <Text style={trayStyles.eyebrow}>MY ITEMS</Text>
        <Text style={trayStyles.title}>所持アイテム</Text>
      </View>
      <View accessibilityRole="tablist" style={trayStyles.tabs}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeKind === 'wall' }}
          onPress={() => onChangeKind('wall')}
          style={[trayStyles.tab, activeKind === 'wall' && trayStyles.tabActive]}
        ><Text style={[trayStyles.tabText, activeKind === 'wall' && trayStyles.tabTextActive]}>ぬいキー</Text></Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeKind === 'plush' }}
          onPress={() => onChangeKind('plush')}
          style={[trayStyles.tab, activeKind === 'plush' && trayStyles.tabActive]}
        ><Text style={[trayStyles.tabText, activeKind === 'plush' && trayStyles.tabTextActive]}>ぬい</Text></Pressable>
      </View>
      <BlackStarToggle active={showBlackStars} onChange={setShowBlackStars} style={trayStyles.blackStarToggle} testID="inventory-black-star-toggle" />
      <Text style={trayStyles.count}>未表示 {hiddenCount} / 所持 {ids.length}</Text>
    </View>
    {activeKind === 'wall' ? <View accessibilityRole="tablist" style={trayStyles.sizeTabs}>
      <Text style={trayStyles.sizeLabel}>サイズ</Text>
      <Pressable
        accessibilityLabel="通常サイズ"
        accessibilityRole="tab"
        accessibilityState={{ selected: activeKeyVariant === 'key-normal' }}
        onPress={() => onChangeKeyVariant('key-normal')}
        style={[trayStyles.sizeTab, activeKeyVariant === 'key-normal' && trayStyles.sizeTabActive]}
      ><Text style={[trayStyles.sizeTabText, activeKeyVariant === 'key-normal' && trayStyles.sizeTabTextActive]}>通常</Text></Pressable>
      <Pressable
        accessibilityLabel="Sサイズ"
        accessibilityRole="tab"
        accessibilityState={{ selected: activeKeyVariant === 'key-small' }}
        onPress={() => onChangeKeyVariant('key-small')}
        style={[trayStyles.sizeTab, activeKeyVariant === 'key-small' && trayStyles.sizeTabActive]}
      ><Text style={[trayStyles.sizeTabText, activeKeyVariant === 'key-small' && trayStyles.sizeTabTextActive]}>S</Text></Pressable>
    </View> : null}
    <ScrollView
      contentContainerStyle={trayStyles.items}
      directionalLockEnabled
      horizontal
      nestedScrollEnabled
      scrollEnabled={!draggingId}
      showsHorizontalScrollIndicator={false}
      style={trayStyles.scroll}
    >
      {ids.map((id, index) => {
        const placement = resolveHomePlacement(id);
        if (!placement) return null;
        const placed = placedIds.has(id);
        const selected = selectedId === id;
        const copyCount = Math.max(1, ownedCollectibleCount(owned as Record<string, number>, placement.item.id, placement.variant));
        return <Fragment key={id}>
          {index === firstPlacedIndex && firstPlacedIndex > 0 ? <View accessibilityLabel="ここから飾り中のアイテム" style={trayStyles.placedDivider}>
            <View style={trayStyles.placedDividerLine} />
            <Text style={trayStyles.placedDividerText}>飾り中</Text>
          </View> : null}
          <TrayItem
            copyCount={copyCount}
            dragEnabled={!draggingId || draggingId === id}
            dragging={draggingId === id}
            id={id}
            onDragCancel={onDragCancel}
            onDragEnd={onDragEnd}
            onDragMove={onDragMove}
            onDragStart={onDragStart}
            onSelect={onSelect}
            placed={placed}
            selected={selected}
          />
        </Fragment>;
      })}
    </ScrollView>
  </ImageBackground>;
}

const trayStyles = StyleSheet.create({
  surface: { height: 178, paddingHorizontal: 13, paddingTop: 12, paddingBottom: 9, overflow: 'hidden' },
  surfaceImage: { borderRadius: 25 },
  header: { height: 34, flexDirection: 'row', alignItems: 'center' },
  headingCopy: { width: 105 },
  eyebrow: { color: '#B65D67', fontSize: 8, lineHeight: 9, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: '#593E57', fontSize: 14, lineHeight: 18, fontWeight: '900' },
  tabs: { flex: 1, height: 30, padding: 2, borderRadius: 15, flexDirection: 'row', backgroundColor: 'rgba(147,91,110,0.13)' },
  blackStarToggle: { minWidth: 68, width: 68, minHeight: 30, height: 30, paddingHorizontal: 7, paddingVertical: 3, marginLeft: 4, transform: [{ scale: 0.86 }] },
  tab: { flex: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: '#FFF6E9', borderWidth: 1, borderColor: '#D88994' },
  tabText: { color: '#8B6C7D', fontSize: 10, fontWeight: '900' },
  tabTextActive: { color: '#A94E62' },
  count: { width: 82, color: '#806375', fontSize: 8, lineHeight: 10, fontWeight: '900', textAlign: 'right' },
  sizeTabs: { height: 24, marginTop: 2, padding: 2, borderRadius: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(147,91,110,0.09)' },
  sizeLabel: { width: 48, color: '#806375', fontSize: 9, fontWeight: '900', textAlign: 'center' },
  sizeTab: { flex: 1, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sizeTabActive: { backgroundColor: '#FFF6E9', borderWidth: 1, borderColor: '#D88994' },
  sizeTabText: { color: '#8B6C7D', fontSize: 9, fontWeight: '900' },
  sizeTabTextActive: { color: '#A94E62' },
  scroll: { flex: 1, marginTop: 3 },
  items: { gap: 7, paddingHorizontal: 1, paddingRight: 14 },
  placedDivider: { width: 34, height: 84, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  placedDividerLine: { position: 'absolute', top: 5, bottom: 5, left: 16, width: 1, backgroundColor: 'rgba(112,89,105,0.35)' },
  placedDividerText: { zIndex: 1, paddingHorizontal: 3, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', backgroundColor: '#EEE5DF', color: '#735F6E', fontSize: 8, lineHeight: 10, fontWeight: '900', textAlign: 'center' },
  itemGestureWrapper: { width: 62 },
  itemButton: { width: 62, alignItems: 'center' },
  tile: { width: 58, height: 65, alignItems: 'center', justifyContent: 'center' },
  tileImage: { borderRadius: 14 },
  itemImage: { width: 48, height: 52 },
  itemImageSmall: { width: 41, height: 44 },
  dragHandle: { width: 50, height: 54, alignItems: 'center', justifyContent: 'center' },
  ownedBadge: { position: 'absolute', top: 2, left: 1, zIndex: 3, minWidth: 38, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: '#73556B', borderWidth: 1, borderColor: '#FFF5E7', alignItems: 'center', justifyContent: 'center' },
  ownedBadgeText: { color: '#FFF', fontSize: 8, lineHeight: 9, fontWeight: '900' },
  placedOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 2, borderRadius: 14, backgroundColor: 'rgba(75,73,77,0.58)', alignItems: 'center', justifyContent: 'center' },
  placedOverlayText: { marginTop: 15, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 9, overflow: 'hidden', backgroundColor: 'rgba(59,55,62,0.84)', color: '#FFF8EC', fontSize: 9, lineHeight: 11, fontWeight: '900' },
  itemName: { width: 62, color: '#664B5F', fontSize: 8, lineHeight: 10, fontWeight: '900', textAlign: 'center' },
  itemVariant: { color: '#A15C6A', fontSize: 8, lineHeight: 9, fontWeight: '900' },
  placedItem: { opacity: 0.78 },
  draggingItem: { opacity: 0.35 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
