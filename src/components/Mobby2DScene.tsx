import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageBackground,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { PULL_ASSETS, type MobbyPullAsset, type PullFrame } from '@/data/mobbyPullAssets';
import { FURNITURE_ASSETS, ROOM_ASSETS, type FurnitureAssetId } from '@/data/roomAssets';
import type { InteractionKind, Mobby } from '@/data/mobies';
import type { FurniturePosition, FurniturePositions } from '@/game/MobbyGameContext';
import { MobbyPullMesh, SUPPORTS_PULL_MESH, type MobbyPullMeshHandle } from './MobbyPullMesh';

type Reaction = InteractionKind | 'welcome' | 'room';

type Mobby2DSceneProps = {
  mobby: Mobby;
  reaction: Reaction;
  animationKey: string;
  compact?: boolean;
  fullBleed?: boolean;
  sceneHeight?: number;
  characterLift?: number;
  /** Only the room peek mode enables this interaction. */
  enablePull?: boolean;
  roomItems?: FurnitureAssetId[];
  furniturePositions?: FurniturePositions;
  onFurnitureMove?: (id: FurnitureAssetId, position: FurniturePosition) => void;
  onPull?: () => void;
};

type GestureState = { moved: boolean; active: boolean; startX: number; startY: number; pointerId: number | null };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function reactionCopy(reaction: Reaction, pulling: boolean, released: boolean) {
  if (pulling) return 'ほっぺがのびてる…！';
  if (released) return 'ぷるんっ！';
  if (reaction === 'tease') return 'えっ、今つついた？';
  if (reaction === 'care') return 'そばにいてくれるの、うれしいな。';
  if (reaction === 'gift') return 'これ、わたしに？ 大切にするね。';
  if (reaction === 'move') return 'お部屋の景色が少し変わったよ。';
  return '今日は何をしているかな？';
}

function frameStyle(frame: PullFrame, asset: MobbyPullAsset, size: number) {
  const scale = size / asset.sourceSize;
  return {
    position: 'absolute' as const,
    left: frame.x * scale,
    top: frame.y * scale,
    width: frame.width * scale,
    height: frame.height * scale,
  };
}

/** Same 5-way eye/mouth selection used by mobby-main's pull lab. */
function selectExpression(asset: MobbyPullAsset, dx: number, dy: number, width: number, sectorRef: { current: number }, strongRef: { current: boolean }) {
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
  return { eyeIndex: eyePair[strongRef.current ? 1 : 0], mouthIndex: mouthPair[strongRef.current ? 1 : 0] };
}

function percentValue(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function defaultFurniturePosition(asset: (typeof FURNITURE_ASSETS)[number]): FurniturePosition {
  return { left: percentValue(asset.placement.left), bottom: percentValue(asset.placement.bottom) };
}

function DraggableFurniture({
  asset,
  roomWidth,
  roomHeight,
  position,
  onMove,
}: {
  asset: (typeof FURNITURE_ASSETS)[number];
  roomWidth: number;
  roomHeight: number;
  position: FurniturePosition;
  onMove?: (id: FurnitureAssetId, nextPosition: FurniturePosition) => void;
}) {
  const [currentPosition, setCurrentPosition] = useState(position);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const positionRef = useRef(position);
  const resolveAssetSource = (Image as unknown as {
    resolveAssetSource?: (source: unknown) => { width?: number; height?: number } | null;
  }).resolveAssetSource;
  const resolvedAsset = resolveAssetSource?.(asset.source);
  const assetAspectRatio = resolvedAsset?.width && resolvedAsset?.height ? resolvedAsset.width / resolvedAsset.height : 1;
  positionRef.current = currentPosition;

  useEffect(() => {
    const next = { left: position.left, bottom: position.bottom };
    setCurrentPosition(next);
    positionRef.current = next;
  }, [position.bottom, position.left]);

  const finishDrag = useCallback((dx: number, dy: number) => {
    const moved = Math.hypot(dx, dy) >= 3;
    const current = positionRef.current;
    if (onMove && moved && roomWidth > 0 && roomHeight > 0) {
      const widthPercent = percentValue(asset.placement.width);
      const next = {
        left: clamp(current.left + (dx / roomWidth) * 100, 0, Math.max(0, 100 - widthPercent)),
        bottom: clamp(current.bottom - (dy / roomHeight) * 100, 0, 96),
      };
      setCurrentPosition(next);
      positionRef.current = next;
      onMove(asset.id, next);
    }
    Animated.spring(dragOffset, { toValue: { x: 0, y: 0 }, useNativeDriver: true, speed: 24, bounciness: 7 }).start();
    setDragging(false);
  }, [asset.id, asset.placement.width, dragOffset, onMove, roomHeight, roomWidth]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      dragOffset.stopAnimation();
      dragOffset.setValue({ x: 0, y: 0 });
      setDragging(true);
    },
    onPanResponderMove: (_event, state) => dragOffset.setValue({ x: state.dx, y: state.dy }),
    onPanResponderRelease: (_event, state) => finishDrag(state.dx, state.dy),
    onPanResponderTerminate: () => {
      setDragging(false);
      Animated.spring(dragOffset, { toValue: { x: 0, y: 0 }, useNativeDriver: true, speed: 24, bounciness: 7 }).start();
    },
  }), [dragOffset, finishDrag]);

  return (
    <Animated.View
      {...(onMove ? responder.panHandlers : {})}
      pointerEvents={onMove ? 'auto' : 'none'}
      accessibilityLabel={onMove ? `${asset.label}をドラッグして配置` : asset.label}
      style={[styles.furniture, asset.placement, { aspectRatio: assetAspectRatio, left: `${currentPosition.left}%`, bottom: `${currentPosition.bottom}%`, zIndex: asset.placement.zIndex + (dragging ? 20 : 0) }, { transform: [{ translateX: dragOffset.x }, { translateY: dragOffset.y }] }]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <Image accessibilityLabel={asset.label} source={asset.source} resizeMode="contain" style={styles.furnitureImage} />
      </View>
    </Animated.View>
  );
}

function isCheekHit(locationX: number, locationY: number, size: number) {
  if (!Number.isFinite(locationX) || !Number.isFinite(locationY)) return true;
  const x = locationX / Math.max(size, 1);
  const y = locationY / Math.max(size, 1);
  const body = ((x - 0.5) / 0.47) ** 6 + ((y - 0.48) / 0.49) ** 6 <= 1.14;
  // Match mobby-main's coarse/touch cheek regions so a press near the edge
  // of the visible cheek is not lost to a one-pixel hit-test boundary.
  const left = ((x - 0.205) / 0.205) ** 2 + ((y - 0.52) / 0.285) ** 2 <= 1;
  const right = ((x - 0.795) / 0.205) ** 2 + ((y - 0.52) / 0.285) ** 2 <= 1;
  return body && (left || right);
}

function SingleMobby({
  mobby,
  compact,
  reaction,
  animationKey,
  characterLift = 0,
  enablePull = true,
  onPull,
}: {
  mobby: Mobby;
  compact: boolean;
  reaction: Reaction;
  animationKey: string;
  characterLift?: number;
  enablePull?: boolean;
  onPull?: () => void;
}) {
  const asset = PULL_ASSETS[mobby.id];
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [characterSize, setCharacterSize] = useState(compact ? 184 : 224);
  const [pulling, setPulling] = useState(false);
  const [released, setReleased] = useState(false);
  const [eyeIndex, setEyeIndex] = useState(-1);
  const [mouthIndex, setMouthIndex] = useState(-1);

  const bodyOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const bodyScaleX = useRef(new Animated.Value(1)).current;
  const bodyScaleY = useRef(new Animated.Value(1)).current;
  const bodyRotation = useRef(new Animated.Value(0)).current;
  const animationKeyRef = useRef(animationKey);
  const assetRef = useRef(asset);
  const gestureRef = useRef<GestureState>({ moved: false, active: false, startX: 0, startY: 0, pointerId: null });
  const eyeSectorRef = useRef(0);
  const eyeStrongRef = useRef(false);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pullMeshRef = useRef<MobbyPullMeshHandle>(null);
  assetRef.current = asset;

  const resetExpression = useCallback(() => {
    setEyeIndex(-1);
    setMouthIndex(-1);
    setReleased(false);
    eyeSectorRef.current = 0;
    eyeStrongRef.current = false;
  }, []);

  const resetBody = useCallback(() => {
    Animated.parallel([
      Animated.spring(bodyOffset.x, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 8 }),
      Animated.spring(bodyOffset.y, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 8 }),
      Animated.spring(bodyScaleX, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
      Animated.spring(bodyScaleY, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
      Animated.spring(bodyRotation, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 8 }),
    ]).start();
  }, [bodyOffset.x, bodyOffset.y, bodyRotation, bodyScaleX, bodyScaleY]);

  useEffect(() => {
    if (animationKeyRef.current === animationKey) return;
    animationKeyRef.current = animationKey;
    const pulse = reaction === 'gift' ? 1.08 : reaction === 'care' ? 1.04 : 1.02;
    Animated.sequence([
      Animated.spring(bodyScaleX, { toValue: pulse, useNativeDriver: true, speed: 24, bounciness: 10 }),
      Animated.spring(bodyScaleX, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 10 }),
    ]).start();
  }, [animationKey, bodyScaleX, reaction]);

  useEffect(() => {
    resetExpression();
    setPulling(false);
    resetBody();
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
  }, [mobby.id, resetBody, resetExpression]);

  useEffect(() => () => {
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
  }, []);

  const updateLayout = useCallback((width: number, height: number) => {
    setStageSize({ width, height });
    const availableHeight = Math.max(170, height - (compact ? 54 : 72));
    const maxWidth = compact ? 205 : 310;
    setCharacterSize(Math.max(compact ? 156 : 190, Math.min(maxWidth, width * (compact ? 0.67 : 0.8), availableHeight * 0.72)));
  }, [compact]);

  const updatePull = useCallback((dx: number, dy: number) => {
    // mobby-main keeps the sprite centred and deforms only the grabbed cheek.
    // Keep the native fallback within the same safe envelope as the web mesh.
    const maxDistance = Math.max(40, characterSize * 0.22);
    const distance = Math.hypot(dx, dy) || 1;
    const factor = Math.min(1, maxDistance / distance);
    const constrainedX = dx * factor;
    const constrainedY = dy * factor;
    bodyOffset.setValue({ x: constrainedX, y: constrainedY });
    bodyScaleX.setValue(1);
    bodyScaleY.setValue(1);
    bodyRotation.setValue(0);
    pullMeshRef.current?.update(dx, dy);

    if (Math.hypot(dx, dy) >= 4) {
      const expression = selectExpression(assetRef.current, dx, dy, Math.max(stageSize.width, 1), eyeSectorRef, eyeStrongRef);
      setEyeIndex(expression.eyeIndex);
      setMouthIndex(expression.mouthIndex);
    }
  }, [bodyOffset, bodyRotation, bodyScaleX, bodyScaleY, characterSize, stageSize.width]);

  const finishPull = useCallback((moved: boolean) => {
    setPulling(false);
    resetBody();
    pullMeshRef.current?.release();
    if (!moved) {
      resetExpression();
      return;
    }
    setReleased(true);
    onPull?.();
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = setTimeout(() => {
      resetExpression();
      releaseTimerRef.current = null;
    }, 550);
  }, [onPull, resetBody, resetExpression]);

  const endPullGesture = useCallback((pointerId: number | null = null, dx = 0, dy = 0) => {
    const gesture = gestureRef.current;
    if (!gesture.active) return;
    if (pointerId !== null && gesture.pointerId !== null && gesture.pointerId !== pointerId) return;
    gestureRef.current = { moved: false, active: false, startX: 0, startY: 0, pointerId: null };
    finishPull(gesture.moved || Math.hypot(dx, dy) >= 4);
  }, [finishPull]);

  useEffect(() => {
    if (!enablePull || Platform.OS !== 'web') return undefined;
    const releasePointer = (event: PointerEvent) => endPullGesture(event.pointerId);
    window.addEventListener('pointerup', releasePointer, true);
    window.addEventListener('pointercancel', releasePointer, true);
    return () => {
      window.removeEventListener('pointerup', releasePointer, true);
      window.removeEventListener('pointercancel', releasePointer, true);
    };
  }, [enablePull, endPullGesture]);

  const responder = useMemo(() => PanResponder.create({
    // A pull may only begin from an actual press. Starting from move events
    // makes React Native Web treat a hover over the cheek as a drag.
    onStartShouldSetPanResponder: () => enablePull,
    onMoveShouldSetPanResponder: () => false,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event: GestureResponderEvent) => {
      const active = enablePull && isCheekHit(event.nativeEvent.locationX, event.nativeEvent.locationY, characterSize);
      const nativePointer = event.nativeEvent as unknown as { pointerId?: number; identifier?: number };
      const pointerId = typeof nativePointer.pointerId === 'number'
        ? nativePointer.pointerId
        : typeof nativePointer.identifier === 'number' ? nativePointer.identifier : null;
      gestureRef.current = { moved: false, active, startX: event.nativeEvent.pageX, startY: event.nativeEvent.pageY, pointerId };
      if (!active) return;
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
      pullMeshRef.current?.begin(event.nativeEvent.locationX, event.nativeEvent.locationY);
      bodyOffset.x.stopAnimation();
      bodyOffset.y.stopAnimation();
      bodyScaleX.stopAnimation();
      bodyScaleY.stopAnimation();
      bodyRotation.stopAnimation();
      setReleased(false);
    },
    onPanResponderMove: (event, state) => {
      if (!gestureRef.current.active) return;
      const buttons = Number((event.nativeEvent as unknown as { buttons?: number }).buttons);
      if (Platform.OS === 'web' && Number.isFinite(buttons) && buttons === 0) {
        endPullGesture();
        return;
      }
      const moved = Math.hypot(state.dx, state.dy) >= 4;
      gestureRef.current.moved = gestureRef.current.moved || moved;
      if (!gestureRef.current.moved) return;
      setPulling(true);
      updatePull(state.dx, state.dy);
    },
    onPanResponderRelease: (event, state) => {
      const nativePointer = event.nativeEvent as unknown as { pointerId?: number; identifier?: number };
      const pointerId = typeof nativePointer.pointerId === 'number'
        ? nativePointer.pointerId
        : typeof nativePointer.identifier === 'number' ? nativePointer.identifier : null;
      endPullGesture(pointerId, state.dx, state.dy);
    },
    onPanResponderTerminate: () => {
      gestureRef.current = { moved: false, active: false, startX: 0, startY: 0, pointerId: null };
      setPulling(false);
      resetExpression();
      resetBody();
      pullMeshRef.current?.reset();
    },
  }), [bodyOffset.x, bodyOffset.y, bodyRotation, bodyScaleX, bodyScaleY, characterSize, enablePull, endPullGesture, resetBody, resetExpression, updatePull]);

  const defaultEye = asset.defaultEye ?? asset.eyes[0];
  const activeEye = eyeIndex >= 0 ? asset.eyes[eyeIndex] ?? defaultEye : defaultEye;
  const activeMouth = mouthIndex >= 0 ? asset.mouths[mouthIndex] : asset.mouths[0];
  const eyeFrame = eyeIndex >= 0 ? asset.eyeFrame : asset.defaultEyeFrame ?? asset.eyeFrame;

  return (
    <View style={styles.singleRoot} onLayout={(event) => updateLayout(event.nativeEvent.layout.width, event.nativeEvent.layout.height)}>
      <View style={[styles.characterStage, { bottom: 32 + characterLift }]} pointerEvents="box-none">
        <Animated.View
          {...(enablePull ? responder.panHandlers : {})}
          pointerEvents={enablePull ? 'auto' : 'none'}
          accessibilityLabel={enablePull ? `${mobby.name}のほっぺを引っ張る` : `${mobby.name}（模様替え中）`}
          style={[styles.characterSlot, { width: characterSize, height: characterSize, marginLeft: -characterSize / 2 }]}
        >
          <Animated.View pointerEvents="none" style={[styles.characterBodyLayer, SUPPORTS_PULL_MESH && (pulling || released) ? styles.meshBodyHidden : null, { transform: [{ scaleX: bodyScaleX }, { scaleY: bodyScaleY }] }]}>
            <Image accessibilityLabel={`${mobby.name}の姿`} source={asset.body} resizeMode="contain" style={styles.characterBody} />
          </Animated.View>
          <MobbyPullMesh ref={pullMeshRef} source={asset.body} size={characterSize} visible={pulling || released} />
          <View pointerEvents="none" style={styles.rigidFaceLayer}>
            <Image accessibilityLabel="モビーの目" source={activeEye} resizeMode="contain" style={frameStyle(eyeFrame, asset, characterSize)} />
            <Image accessibilityLabel="モビーの口" source={activeMouth} resizeMode="contain" style={frameStyle(asset.mouthFrame, asset, characterSize)} />
          </View>
        </Animated.View>
      </View>

      <View pointerEvents="none" style={styles.namePill}><Text style={[styles.namePillText, { color: mobby.color }]}>{mobby.name}</Text></View>
      {enablePull ? <View pointerEvents="none" style={styles.gestureHint}><Text style={styles.gestureArrow}>↔</Text><Text style={styles.gestureHintText}>ほっぺを引っ張って遊べるよ</Text></View> : null}
      <View pointerEvents="none" style={styles.reactionBubble}>
        <Text style={styles.reactionText} key={`${animationKey}-${eyeIndex}-${mouthIndex}-${released}`}>{reactionCopy(reaction, pulling, released)}</Text>
      </View>
    </View>
  );
}

export function Mobby2DScene({
  mobby,
  reaction,
  animationKey,
  compact = false,
  fullBleed = false,
  sceneHeight,
  characterLift = 0,
  enablePull = true,
  roomItems = [],
  furniturePositions = {},
  onFurnitureMove,
  onPull,
}: Mobby2DSceneProps) {
  const visibleFurniture = useMemo(() => roomItems
    .map((id) => FURNITURE_ASSETS.find((asset) => asset.id === id))
    .filter((asset) => asset && (!asset.characterId || asset.characterId === mobby.id)), [mobby.id, roomItems]);
  const [roomSize, setRoomSize] = useState({ width: 0, height: 0 });

  return (
    <View onLayout={(event) => setRoomSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })} style={[styles.scene, compact && styles.sceneCompact, fullBleed && styles.sceneFullBleed, sceneHeight !== undefined && { height: sceneHeight }]}>
      <ImageBackground accessibilityLabel="モビーの部屋" source={ROOM_ASSETS.sunnyStitch} resizeMode="cover" style={styles.roomBackground}>
        <View style={styles.roomGlow} pointerEvents="none" />
        {visibleFurniture.map((asset) => asset && (
          <DraggableFurniture key={asset.id} asset={asset} roomWidth={roomSize.width} roomHeight={roomSize.height} position={furniturePositions[asset.id] ?? defaultFurniturePosition(asset)} onMove={onFurnitureMove} />
        ))}
        <SingleMobby mobby={mobby} compact={compact} reaction={reaction} animationKey={animationKey} characterLift={characterLift} enablePull={enablePull} onPull={onPull} />
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { width: '100%', height: 390, overflow: 'hidden', borderRadius: 23, backgroundColor: '#EFCB96' },
  sceneCompact: { height: 235, borderRadius: 18 },
  sceneFullBleed: { flex: 1, height: undefined, borderRadius: 0 },
  roomBackground: { flex: 1, width: '100%', height: '100%' },
  roomGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,247,227,0.08)' },
  furniture: { position: 'absolute' },
  furnitureImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  singleRoot: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  characterStage: { position: 'absolute', top: 34, right: 0, bottom: 32, left: 0, alignItems: 'center', justifyContent: 'flex-end' },
  characterSlot: { position: 'absolute', bottom: 10, left: '50%', alignItems: 'center', justifyContent: 'center' },
  characterBodyLayer: { position: 'absolute', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  characterBody: { position: 'absolute', width: '100%', height: '100%' },
  meshBodyHidden: { opacity: 0 },
  rigidFaceLayer: { ...StyleSheet.absoluteFillObject },
  namePill: { position: 'absolute', bottom: 39, alignSelf: 'center', backgroundColor: 'rgba(255,249,235,0.95)', borderWidth: 1.5, borderColor: '#D69A62', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4 },
  namePillText: { fontSize: 12, fontWeight: '900' },
  gestureHint: { position: 'absolute', bottom: 7, alignSelf: 'center', alignItems: 'center' },
  gestureArrow: { color: '#A87353', fontSize: 18, fontWeight: '900', lineHeight: 18 },
  gestureHintText: { color: '#805A3D', fontSize: 10, fontWeight: '800' },
  reactionBubble: { position: 'absolute', top: 48, right: 12, maxWidth: '64%', backgroundColor: 'rgba(255,249,235,0.95)', borderColor: '#D69A62', borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7 },
  reactionText: { color: '#6B452C', fontSize: 11, lineHeight: 16, fontWeight: '800' },
});
