import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo, Animated, Easing, Image, ImageBackground, Platform, Pressable, View, findNodeHandle, type LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';

import { ParticleBurst } from '@/components/effects';
import { MobbyIdleMotion } from '@/components/mobby';
import { MobbyAssetButton, MobbyAssetSurface } from '@/components/mobby-ui';
import { PullableMobby } from '@/components/mobby/PullableMobby';
import { ReactionCollectionPopover } from '@/components/home/ReactionCollectionPopover';
import { EMPTY_OWNED, ITEMS, ITEM_MOBBY_IDS, collectibleImage, ownedCollectibleCount, type CollectibleVariant, type Item } from '@/data/collectibles';
import { getMobby, type MobbyId } from '@/data/mobies';
import { normalizeCollectedReactionIds, REACTION_COLLECTION_STORAGE_KEY } from '@/data/reactionCollection';
import type { DailyLoopState } from '@/game/dailyLoopStorage';
import { styles } from '@/ui/layout/appStyles';
import { Text, useAppLayout } from '@/ui/layout/visualPrimitives';
import type { TodayAction } from '@/screens/HomeScreen';

const HOME_GARLAND = require('../../../assets/backgrounds/home-garland-trimmed-v1.png');
const WOODEN_HOOK = require('../../../assets/backgrounds/hook-transparent.png');
const PLUSH_SHELF_BASE = require('../../../assets/backgrounds/plush-base-transparent.png');
const SPEECH_BUBBLE_PAPER = require('../../../assets/generated-ui/speech-bubble-paper-v1.png');

const PLUSH_VISIBLE_BOTTOM_RATIO: Record<string, number> = {
  'mobiyan-plush': 0.952,
  'mobibou-plush': 0.918,
  'mobiyura-plush': 0.909,
  'pote-plush': 0.888,
};
const PLUSH_CONTACT_REFERENCE = PLUSH_VISIBLE_BOTTOM_RATIO['mobiyan-plush'];

type HomeKeySwing = (notify?: boolean) => void;

function HomeWallKeychain({ item, variant, index, selectedId, ownedCount, incidentState, editSelected, editing, onPress, onEditPress, onSwing, registerSwing }: {
  item: Item;
  variant: Exclude<CollectibleVariant, 'plush'>;
  index: number;
  selectedId: string;
  ownedCount: number;
  incidentState: 'normal' | 'stolen' | 'returning' | 'placement-hidden';
  editSelected: boolean;
  editing: boolean;
  onPress?: () => void;
  onEditPress: () => void;
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
    const unregister = registerSwing?.(item.id, swing);
    return typeof unregister === 'function' ? unregister : undefined;
  }, [item.id, registerSwing, swing]);
  const name = item.name.replace(' ぬいキー', '').replace(' ぬい', '');
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={incidentState === 'stolen' ? `${name}のおはなしを続ける` : editing && owned && incidentState === 'normal' ? `${name}を並べ替え対象に選ぶ` : owned ? `${name}を揺らす` : `未所持の壁フック${index + 1}`}
    accessibilityState={{ selected: editSelected, disabled: incidentState !== 'stolen' && (!owned || (editing && incidentState !== 'normal')) }}
    disabled={incidentState !== 'stolen' && (!owned || (editing && incidentState !== 'normal'))}
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

export function HomeScreenVisual({ selected, owned = EMPTY_OWNED, incidentWallItemId, incidentWallState, placementHiddenWallItemId, onIncidentPress, wallItemIds, wallVariants, plushItemIds, onSwapWallItems, onSwapPlushItems, onUiTap, onInteract, onKeychainSwing, reaction, dailyState, dailyHydrated = true, onDailyPullRelease, onDailyReaction, todayAction, entryNonce = 0 }: {
  selected: Item;
  owned?: Record<string, number>;
  incidentWallItemId?: string;
  incidentWallState: 'none' | 'stolen' | 'returning';
  placementHiddenWallItemId?: string;
  onIncidentPress: () => void;
  wallItemIds: string[];
  wallVariants: Record<string, Exclude<CollectibleVariant, 'plush'>>;
  plushItemIds: string[];
  onSwapWallItems: (firstId: string, secondId: string) => void;
  onSwapPlushItems: (firstId: string, secondId: string) => void;
  onUiTap: () => void;
  onInteract: (kind: string) => number;
  onKeychainSwing: () => void;
  reaction: string;
  dailyState?: DailyLoopState;
  dailyHydrated?: boolean;
  onDailyPullRelease?: () => Promise<void>;
  onDailyReaction?: (reactionId: string) => void;
  todayAction: TodayAction;
  entryNonce?: number;
}) {
  const { height } = useAppLayout();
  const compact = height < 780;
  const [roomSize, setRoomSize] = useState({ width: 440, height: 646 });
  const [homeLayoutReady, setHomeLayoutReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reorderSelection, setReorderSelection] = useState<{ kind: 'wall' | 'plush'; id: string } | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const selectedMobby = getMobby(ITEM_MOBBY_IDS[selected.id] ?? 'mobichi');
  const [reactionBookOpen, setReactionBookOpen] = useState(false);
  const [reactionTabId, setReactionTabId] = useState<MobbyId>(selectedMobby.id);
  const [collectedReactionIds, setCollectedReactionIds] = useState<string[]>([]);
  const mainMobbyRef = useRef<View>(null);
  const entryMotion = useRef(new Animated.Value(0)).current;
  const entryPlayedRef = useRef<string | null>(null);
  const entryAnimationFinishedRef = useRef(false);
  const keySwingsRef = useRef<Record<string, HomeKeySwing>>({});
  const wallItems = wallItemIds.map((id) => ITEMS.find((item) => item.id === id)).filter((item): item is Item => Boolean(item));
  const plushItems = plushItemIds.map((id) => ITEMS.find((item) => item.id === id)).filter((item): item is Item => Boolean(item));
  const homeWallItemsRef = useRef(wallItems);
  const homeOwnedRef = useRef(owned);
  homeWallItemsRef.current = wallItems;
  homeOwnedRef.current = owned;
  useEffect(() => {
    setReactionTabId(selectedMobby.id);
  }, [selectedMobby.id]);
  useEffect(() => {
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
  const focusMain = () => {
    const node = findNodeHandle(mainMobbyRef.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  };
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

  const homeEntrySignature = useMemo(() => wallItems.map((item) => `${item.id}:${ownedCollectibleCount(owned, item.id, 'key-normal') + ownedCollectibleCount(owned, item.id, 'key-small')}`).join('|'), [owned, wallItems]);
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
      const ownedIds = homeWallItemsRef.current
        .filter((item) => ownedCollectibleCount(homeOwnedRef.current, item.id, 'key-normal') + ownedCollectibleCount(homeOwnedRef.current, item.id, 'key-small') > 0)
        .map((item) => item.id);
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
  const handleLayout = (event: LayoutChangeEvent) => {
    setRoomSize(event.nativeEvent.layout);
    setHomeLayoutReady(true);
  };
  const selectForReorder = (kind: 'wall' | 'plush', id: string) => {
    onUiTap();
    if (!reorderSelection || reorderSelection.kind !== kind) {
      setReorderSelection({ kind, id });
      return;
    }
    if (reorderSelection.id === id) {
      setReorderSelection(null);
      return;
    }
    if (kind === 'wall') onSwapWallItems(reorderSelection.id, id);
    else onSwapPlushItems(reorderSelection.id, id);
    setReorderSelection(null);
  };
  return <View style={styles.homeScreenBackground}>
    <View style={styles.homeRoom} onLayout={handleLayout}>
      <MobbyAssetButton tone={editing ? 'coral' : 'cream'} accessibilityLabel={editing ? '並べ替えを終了' : '壁と棚を並べ替え'} accessibilityState={{ expanded: editing }} onPress={() => { onUiTap(); setEditing((current) => !current); setReorderSelection(null); }} style={styles.homeReorderButton} contentStyle={styles.homeReorderButtonContent}>
        <Text style={[styles.homeReorderButtonText, editing && styles.homeReorderButtonTextActive]}>{editing ? '完了' : '並べ替え'}</Text>
      </MobbyAssetButton>
      <Image source={PLUSH_SHELF_BASE} resizeMode="contain" style={styles.homeShelfBase} />
      <View pointerEvents="none" style={styles.homeGarland}><Image source={HOME_GARLAND} resizeMode="contain" style={styles.homeDecorAsset} /></View>
      <View style={styles.homeWallKeys}>{wallItems.map((item, index) => <HomeWallKeychain
        key={item.id} item={item} variant={wallVariants[item.id] ?? 'key-normal'} index={index} selectedId={selected.id}
        ownedCount={ownedCollectibleCount(owned, item.id, 'key-normal') + ownedCollectibleCount(owned, item.id, 'key-small')}
        incidentState={item.id === incidentWallItemId && incidentWallState !== 'none' ? incidentWallState : item.id === placementHiddenWallItemId ? 'placement-hidden' : 'normal'}
        editing={editing} editSelected={reorderSelection?.kind === 'wall' && reorderSelection.id === item.id}
        onPress={onIncidentPress} onEditPress={() => selectForReorder('wall', item.id)} onSwing={onKeychainSwing} registerSwing={registerKeySwing}
      />)}</View>
      <View style={[styles.homePlushShelf, { top: shelfSurfaceY - roomSize.height * 0.18 }]}>{plushItems.map((item) => {
        const rendered = Math.min(plushImageSize.width, plushImageSize.height);
        const belowFeet = plushImageSize.height - ((plushImageSize.height - rendered) / 2 + rendered * (PLUSH_VISIBLE_BOTTOM_RATIO[item.id] ?? PLUSH_CONTACT_REFERENCE));
        const editSelected = reorderSelection?.kind === 'plush' && reorderSelection.id === item.id;
        return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={editing ? `${item.name}を並べ替え対象に選ぶ` : `${item.name}を揺らす`} accessibilityState={{ selected: editSelected }} onPress={editing ? () => selectForReorder('plush', item.id) : onKeychainSwing} style={[styles.homePlushItem, editSelected && styles.homeReorderSelected]}>
          <View style={styles.homePlushSwing}><Image source={item.image} resizeMode="contain" style={[styles.homePlushImage, plushImageSize, { bottom: -belowFeet }]} /></View>
        </Pressable>;
      })}</View>
      <View ref={mainMobbyRef} accessible accessibilityLabel={`${selectedMobby.name}。ほっぺを引っぱれます`} style={[styles.homeMainCharacter, styles.homeMainCharacterPullable, compact && styles.homeMainCharacterCompact]}>
        <Animated.View style={{ transform: [
          { translateY: entryMotion.interpolate({ inputRange: [0, 0.1, 0.3, 0.5, 0.7, 0.86, 1], outputRange: reduceMotion ? [0, 4, -32, -8, -20, -7, 0] : [0, 16, -88, -18, -48, -12, 0] }) },
          { scale: entryMotion.interpolate({ inputRange: [0, 0.1, 0.3, 0.5, 0.7, 0.86, 1], outputRange: reduceMotion ? [1, 0.94, 1.28, 1.04, 1.16, 1.05, 1] : [1, 0.82, 1.78, 1.08, 1.42, 1.1, 1] }) },
          { rotate: entryMotion.interpolate({ inputRange: [0, 0.1, 0.3, 0.5, 0.7, 0.86, 1], outputRange: reduceMotion ? ['0deg', '-3deg', '4deg', '-3deg', '2deg', '-1deg', '0deg'] : ['0deg', '-9deg', '13deg', '-8deg', '7deg', '-3deg', '0deg'] }) },
        ] }}>
          <MobbyIdleMotion enabled={!busy}><PullableMobby selected={selected} specialCentering size={compact ? 178 : 220} onPull={() => onInteract('ほっぺ')} onInteractionStateChange={setBusy} enabled={dailyHydrated} onValidRelease={onDailyPullRelease} onReaction={collectReaction} /></MobbyIdleMotion>
        </Animated.View>
        <MobbyAssetButton accessibilityLabel={`メインモビーを選ぶ（現在：${selectedMobby.name}）`} tone="cream" onPress={() => { onUiTap(); router.push('/mobby-picker'); }} style={[styles.characterPickerButton, styles.characterPickerButtonCompact]} contentStyle={styles.characterPickerButtonAsset}><Text style={styles.characterPickerCaption}>キャラ</Text><Text style={styles.characterPickerValue}>選択</Text></MobbyAssetButton>
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
      </View>
      <MobbyAssetButton
        accessibilityLabel="リアクション図鑑を開く"
        onPress={() => { onUiTap(); setReactionTabId(selectedMobby.id); setReactionBookOpen(true); }}
        tone="cream"
        style={[styles.reactionBookButton, compact && styles.reactionBookButtonCompact]}
        contentStyle={styles.reactionBookButtonContent}
      >
        <Text style={styles.reactionBookButtonLabel}>リアクション</Text>
        <Text style={styles.reactionBookButtonLabel}>図鑑</Text>
      </MobbyAssetButton>
      {reaction ? <ImageBackground
        accessible={false}
        accessibilityLiveRegion="polite"
        source={SPEECH_BUBBLE_PAPER}
        resizeMode="stretch"
        imageStyle={styles.homeReactionBubbleImage}
        style={[styles.homeReactionBubble, { pointerEvents: 'none', top: shelfSurfaceY + 4 }]}
      ><Text accessibilityRole="alert" style={styles.homeReactionBubbleText}>{reaction}</Text></ImageBackground> : null}
      {dailyState ? <>
        {todayAction.kind === 'status' ? <MobbyAssetSurface variant="notice" pointerEvents="none" style={[styles.dailyHomeToggle, !dailyHydrated && styles.dailyDisabled]} contentStyle={styles.dailyHomeToggleContent}><Text style={styles.dailyHomeToggleText}>{todayAction.label}</Text><Text style={styles.dailyPendingText}>{todayAction.detail}</Text></MobbyAssetSurface> : <MobbyAssetButton accessibilityLabel={`${todayAction.label}。${todayAction.detail}`} tone="cream" disabled={todayAction.disabled} onPress={todayAction.kind === 'cheek' ? focusMain : () => todayAction.onPress?.()} style={styles.dailyHomeToggle} contentStyle={styles.dailyHomeToggleContent}><Text style={styles.dailyHomeToggleText}>{todayAction.label}</Text><Text style={styles.dailyPendingText}>{todayAction.detail}</Text></MobbyAssetButton>}
        <ParticleBurst type="stamp-ink" active={false} style={styles.dailyHomeToggleBurst} />
      </> : null}
    </View>
    {reactionBookOpen ? <ReactionCollectionPopover
      collectedIds={collectedReactionIds}
      onClose={() => setReactionBookOpen(false)}
      onSelectMobby={setReactionTabId}
      selectedMobbyId={reactionTabId}
    /> : null}
  </View>;
}
