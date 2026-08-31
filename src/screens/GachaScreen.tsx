import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { MobbyAssetButton, MobbyAssetSurface, MobbyAssetTabButton } from '@/components/mobby-ui';
import {
  GACHA_CATALOG_COUNTS,
  GACHA_CATEGORY_RATES,
  GACHA_CHARACTERS,
  GACHA_GOODS_REWARDS,
  GACHA_THEME_REWARDS,
  GACHA_TOOL_REWARDS,
  getGachaCharacter,
  getGachaReward,
  getGachaThemeAssetSource,
  type GachaCharacterId,
  type GachaReward,
  type GachaThemeRewardId,
} from '@/data/gachaCatalog';
import {
  createInitialGachaState,
  equipGachaTheme,
  loadGachaState,
  performGachaPull,
  subscribeGachaState,
  type GachaInventoryState,
  type GachaPullOutcome,
  type GachaPullResult,
  type GachaPullSize,
} from '@/game/gachaStorage';
import { useMobbyHaptics } from '@/hooks/useMobbyHaptics';
import { useGachaTheme } from '@/theme/GachaThemeContext';
import { useResponsiveLayout } from '@/ui/layout/responsive';
import { Text } from '@/ui/layout/visualPrimitives';

const GACHA_MACHINE = require('../../assets/gacha/screen/gacha-machine-v1.png');
const GACHA_MACHINE_PANEL = require('../../assets/gacha/screen/gacha-machine-panel-v2.png');
const GACHA_SPARKLE_RING = require('../../assets/gacha/screen/gacha-sparkle-ring-v1.png');
const TAB_BAR_CLEARANCE = 82;

const GACHA_LINEUP_ITEMS = [
  {
    previewImage: GACHA_TOOL_REWARDS[0].previewImage,
    count: GACHA_CATALOG_COUNTS.tools,
    rate: GACHA_CATEGORY_RATES.tool,
    label: 'ちょっかい道具',
  },
  {
    previewImage: GACHA_GOODS_REWARDS[2].previewImage,
    count: GACHA_CATALOG_COUNTS.goods,
    rate: GACHA_CATEGORY_RATES.goods,
    label: 'ぬいグッズ',
  },
  {
    previewImage: GACHA_THEME_REWARDS[0].previewImage,
    count: GACHA_CATALOG_COUNTS.themes,
    rate: GACHA_CATEGORY_RATES.theme,
    label: '着せ替えテーマ',
  },
] as const;

export type GachaScreenProps = {
  entryNonce?: number;
  onPullComplete?: (outcome: GachaPullOutcome) => void;
};

function animateValue(animation: Animated.CompositeAnimation) {
  return new Promise<void>((resolve) => animation.start(() => resolve()));
}

function rarityColor(reward: GachaReward) {
  if (reward.rarity === 'SSR') return '#8C5DA9';
  if (reward.rarity === 'SR') return '#D78A36';
  return '#6D8B78';
}

function RewardArtwork({ reward, compact = false }: { reward: GachaReward; compact?: boolean }) {
  return <MobbyAssetSurface
    variant="tile"
    style={[styles.artwork, compact && styles.artworkCompact]}
    contentStyle={[styles.artworkSurface, compact && styles.artworkSurfaceCompact]}
  >
    <Image
      accessible={false}
      contentFit="contain"
      contentPosition="center"
      source={reward.previewImage}
      style={styles.artworkImage}
    />
  </MobbyAssetSurface>;
}

function ResultBadge({ result }: { result: GachaPullResult }) {
  const label = result.isNew ? 'NEW' : `×${result.inventoryCount}`;
  return <MobbyAssetSurface
    pointerEvents="none"
    variant="labelPill"
    style={[styles.resultBadge, result.isNew ? styles.newBadge : styles.countBadge]}
    contentStyle={styles.resultBadgeContent}
  >
    <Text style={styles.resultBadgeText}>{label}</Text>
  </MobbyAssetSurface>;
}

function PullResultCard({ result, compact }: { result: GachaPullResult; compact: boolean }) {
  const rerolled = result.rerollReason !== 'none';
  return <MobbyAssetSurface
    accessible
    accessibilityLabel={`${result.reward.name}、${result.isNew ? '新しく獲得' : `所持数${result.inventoryCount}`}`}
    variant="paperTall"
    style={[styles.resultCard, compact && styles.resultCardCompact]}
    contentStyle={[styles.resultCardContent, compact && styles.resultCardContentCompact]}
  >
    <View style={styles.resultArtworkWrap}>
      <RewardArtwork reward={result.reward} compact={compact} />
      <ResultBadge result={result} />
    </View>
    <MobbyAssetSurface
      pointerEvents="none"
      variant="labelPill"
      style={styles.rarityPill}
      contentStyle={styles.rarityPillContent}
    >
      <Text style={[styles.rarityText, { color: rarityColor(result.reward) }]}>{result.reward.rarity}</Text>
    </MobbyAssetSurface>
    <Text numberOfLines={compact ? 2 : 3} style={[styles.resultName, compact && styles.resultNameCompact]}>
      {result.reward.name}
    </Text>
    {rerolled ? <Text numberOfLines={1} style={styles.rerollText}>
      {result.rerollReason === 'duplicate-theme' ? '重複テーマを再抽選' : 'コンプリート振替'}
    </Text> : null}
  </MobbyAssetSurface>;
}

function GachaResultModal({ outcome, onClose }: { outcome: GachaPullOutcome | null; onClose: () => void }) {
  const tenPull = outcome?.size === 10;
  const singleResultIsNew = outcome?.results[0]?.isNew ?? false;
  return <Modal
    animationType="fade"
    onRequestClose={onClose}
    presentationStyle="overFullScreen"
    transparent
    visible={outcome !== null}
  >
    <View style={styles.modalRoot}>
      <Pressable accessibilityLabel="ガチャ結果を閉じる" onPress={onClose} style={styles.modalBackdrop} />
      <MobbyAssetSurface
        accessibilityViewIsModal
        variant="modalPortrait"
        style={[styles.modalCard, tenPull && styles.modalCardTen]}
        contentStyle={[styles.modalCardContent, tenPull && styles.modalCardContentTen]}
      >
        <View style={styles.modalHeadingRow}>
          <View>
            <Text accessibilityRole="header" style={styles.modalTitle}>ガチャ結果</Text>
          </View>
          <MobbyAssetSurface
            pointerEvents="none"
            variant="labelPill"
            style={styles.freeSeal}
            contentStyle={styles.freeSealContent}
          >
            <Text style={styles.freeSealText}>FREE</Text>
          </MobbyAssetSurface>
        </View>
        <Text accessibilityLiveRegion="polite" style={styles.modalLead}>
          {tenPull
            ? '10個のアイテムを受け取りました！'
            : singleResultIsNew
              ? '新しいアイテムを受け取りました！'
              : 'アイテムを受け取りました！'}
        </Text>
        <ScrollView
          contentContainerStyle={[styles.results, tenPull && styles.resultsTen]}
          showsVerticalScrollIndicator={false}
          style={styles.resultsScroll}
        >
          {outcome?.results.map((result, index) => <PullResultCard
            compact={Boolean(tenPull)}
            key={`${result.rewardId}:${index}`}
            result={result}
          />)}
        </ScrollView>
        <MobbyAssetButton
          accessibilityLabel="ガチャ結果を閉じる"
          onPress={onClose}
          style={styles.closeButton}
          contentStyle={styles.closeButtonContent}
        >
          <Text style={styles.closeButtonText}>受け取って閉じる</Text>
        </MobbyAssetButton>
      </MobbyAssetSurface>
    </View>
  </Modal>;
}

export function GachaScreen({ entryNonce = 0, onPullComplete }: GachaScreenProps) {
  const { isCompact } = useResponsiveLayout();
  const { activeTheme } = useGachaTheme();
  const haptics = useMobbyHaptics();
  const [inventory, setInventory] = useState<GachaInventoryState>(() => createInitialGachaState());
  const [hydrated, setHydrated] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [equippingThemeId, setEquippingThemeId] = useState<GachaThemeRewardId | 'default' | null>(null);
  const [outcome, setOutcome] = useState<GachaPullOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [themeCharacterId, setThemeCharacterId] = useState<GachaCharacterId>(GACHA_THEME_REWARDS[0].characterId);
  const machineMotion = useRef(new Animated.Value(0)).current;
  const lightMotion = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => subscribeGachaState((next) => {
    if (mountedRef.current) setInventory(next);
  }), []);

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    setOutcome(null);
    setError(null);
    void loadGachaState()
      .then((state) => {
        if (!cancelled) setInventory(state);
      })
      .catch(() => {
        if (!cancelled) setError('ガチャのデータを読み込めませんでした。');
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => { cancelled = true; };
  }, [entryNonce]);

  const runMachineAnimation = useCallback(() => {
    machineMotion.setValue(0);
    lightMotion.setValue(0);
    return animateValue(Animated.parallel([
      Animated.sequence([
        Animated.timing(machineMotion, { toValue: 0.36, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(machineMotion, { toValue: 0.68, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(machineMotion, { toValue: 1, duration: 300, easing: Easing.out(Easing.back(1.7)), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(160),
        Animated.timing(lightMotion, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]));
  }, [lightMotion, machineMotion]);

  const handlePull = useCallback(async (size: GachaPullSize) => {
    if (!hydrated || pulling) return;
    setPulling(true);
    setError(null);
    haptics.medium();
    try {
      const [nextOutcome] = await Promise.all([performGachaPull(size), runMachineAnimation()]);
      if (!mountedRef.current) return;
      setInventory(nextOutcome.state);
      setOutcome(nextOutcome);
      try {
        onPullComplete?.(nextOutcome);
      } catch {
        // The pull is already persisted. A consumer error must not allow a duplicate grant.
      }
      haptics.success();
    } catch {
      if (mountedRef.current) setError('ガチャを引けませんでした。もう一度お試しください。');
      haptics.error();
    } finally {
      if (mountedRef.current) setPulling(false);
    }
  }, [haptics, hydrated, onPullComplete, pulling, runMachineAnimation]);

  const handleEquipTheme = useCallback(async (themeId: GachaThemeRewardId | null) => {
    if (!hydrated || pulling || equippingThemeId !== null) return;
    setEquippingThemeId(themeId ?? 'default');
    setError(null);
    haptics.light();
    try {
      const next = await equipGachaTheme(themeId);
      if (mountedRef.current) setInventory(next);
      haptics.success();
    } catch {
      if (mountedRef.current) setError('テーマを切り替えられませんでした。');
      haptics.error();
    } finally {
      if (mountedRef.current) setEquippingThemeId(null);
    }
  }, [equippingThemeId, haptics, hydrated, pulling]);

  const collectedStackableKinds = Object.keys(inventory.stackableCounts).length;
  const ownedThemeCharacters = useMemo(
    () => GACHA_CHARACTERS.filter((character) => inventory.ownedThemeIds.some((id) => {
      const reward = getGachaReward(id);
      return reward.category === 'theme' && reward.characterId === character.id;
    })),
    [inventory.ownedThemeIds],
  );
  const visibleThemes = useMemo(
    () => GACHA_THEME_REWARDS.filter((theme) => theme.characterId === themeCharacterId && inventory.ownedThemeIds.includes(theme.id)),
    [inventory.ownedThemeIds, themeCharacterId],
  );
  useEffect(() => {
    const equippedReward = inventory.equippedThemeId ? getGachaReward(inventory.equippedThemeId) : null;
    const equippedCharacterId = equippedReward?.category === 'theme' ? equippedReward.characterId : null;
    setThemeCharacterId((current) => {
      if (equippedCharacterId && ownedThemeCharacters.some((character) => character.id === equippedCharacterId)) return equippedCharacterId;
      return ownedThemeCharacters.some((character) => character.id === current)
        ? current
        : ownedThemeCharacters[0]?.id ?? GACHA_THEME_REWARDS[0].characterId;
    });
  }, [inventory.equippedThemeId, ownedThemeCharacters]);
  const totalStackableItems = useMemo(
    () => Object.values(inventory.stackableCounts).reduce((sum, count) => sum + (count ?? 0), 0),
    [inventory.stackableCounts],
  );
  const machineRotate = machineMotion.interpolate({
    inputRange: [0, 0.18, 0.36, 0.52, 0.68, 1],
    outputRange: ['0deg', '-7deg', '7deg', '-5deg', '4deg', '0deg'],
  });
  const machineScale = machineMotion.interpolate({
    inputRange: [0, 0.68, 1],
    outputRange: [1, 0.93, 1.08],
  });
  const lightScale = lightMotion.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.2] });
  const sparkleScale = lightMotion.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] });
  const sparkleOpacity = lightMotion.interpolate({ inputRange: [0, 1], outputRange: [0.68, 1] });
  const actionDisabled = !hydrated || pulling;
  return <View style={styles.root}>
    <View style={styles.backdrop}>
      <ScrollView
        contentContainerStyle={[styles.content, isCompact && styles.contentCompact]}
        showsVerticalScrollIndicator={false}
      >
        <MobbyAssetSurface variant="darkTopbar" style={styles.headerCard} contentStyle={styles.headerCardContent}>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={styles.title}>ガチャ</Text>
          </View>
          <MobbyAssetSurface
            pointerEvents="none"
            variant="labelPill"
            style={styles.headerFreeBadge}
            contentStyle={styles.headerFreeBadgeContent}
          >
            <Text style={[styles.headerFreeText, activeTheme && styles.navigationText]}>ずっと無料</Text>
          </MobbyAssetSurface>
        </MobbyAssetSurface>

        <View style={styles.progressRow}>
          {[
            {
              label: 'テーマ',
              value: inventory.ownedThemeIds.length,
              unit: ` / ${GACHA_CATALOG_COUNTS.themes}`,
            },
            { label: '道具・グッズ', value: collectedStackableKinds, unit: '種' },
            { label: '引いた回数', value: inventory.totalPulls, unit: '回' },
          ].map((item) => <MobbyAssetSurface
            key={item.label}
            variant="labelPill"
            style={styles.progressCard}
            contentStyle={styles.progressCardContent}
          >
            <Text style={[styles.progressValue, activeTheme && styles.navigationText]}>
              {item.value}<Text style={[styles.progressUnit, activeTheme && styles.navigationSubText]}>{item.unit}</Text>
            </Text>
            <Text style={[styles.progressLabel, activeTheme && styles.navigationSubText]}>{item.label}</Text>
          </MobbyAssetSurface>)}
        </View>

        <View style={styles.machineCard}>
          <Image
            accessible={false}
            pointerEvents="none"
            contentFit="contain"
            contentPosition="center"
            source={GACHA_MACHINE_PANEL}
            style={styles.machinePanel}
          />
          <View style={styles.machineCardContent}>
            <View style={styles.machineStage}>
              <Animated.View style={[styles.lightHalo, { opacity: lightMotion, transform: [{ scale: lightScale }] }]} />
              <Animated.View
                pointerEvents="none"
                style={[styles.sparkleRing, { opacity: sparkleOpacity, transform: [{ scale: sparkleScale }] }]}
              >
                <Image
                  accessible={false}
                  contentFit="contain"
                  contentPosition="center"
                  source={GACHA_SPARKLE_RING}
                  style={styles.sparkleImage}
                />
              </Animated.View>
              <Animated.View style={{ transform: [{ rotate: machineRotate }, { scale: machineScale }] }}>
                <Image accessible={false} contentFit="contain" contentPosition="center" source={GACHA_MACHINE} style={styles.machineImage} />
              </Animated.View>
              <MobbyAssetSurface
                pointerEvents="none"
                variant="labelPill"
                style={styles.machinePlaque}
                contentStyle={styles.machinePlaqueContent}
              >
                <Text style={[styles.machineKicker, activeTheme && styles.navigationSubText]}>{pulling ? 'OPENING...' : 'TAP TO OPEN'}</Text>
                <Text style={[styles.machineTitle, activeTheme && styles.navigationText]}>{pulling ? 'どきどき…' : '今日は何が出るかな？'}</Text>
              </MobbyAssetSurface>
            </View>

            <View style={styles.buttonRow}>
              <MobbyAssetButton
                accessibilityLabel="無料ガチャを1回引く"
                accessibilityState={{ busy: pulling }}
                disabled={actionDisabled}
                onPress={() => void handlePull(1)}
                tone="cream"
                style={styles.pullButton}
                contentStyle={styles.pullButtonContent}
              >
                <View style={styles.pullButtonCopy}>
                  <Text style={styles.pullButtonSub}>FREE</Text>
                  <Text style={styles.pullButtonTextCream}>1回引く</Text>
                </View>
              </MobbyAssetButton>
              <MobbyAssetButton
                accessibilityLabel="無料ガチャを10回引く"
                accessibilityState={{ busy: pulling }}
                disabled={actionDisabled}
                onPress={() => void handlePull(10)}
                style={[styles.pullButton, styles.pullButtonTen]}
                contentStyle={styles.pullButtonContent}
              >
                <View style={styles.pullButtonCopy}>
                  <Text style={styles.pullButtonSubCoral}>FREE</Text>
                  <Text style={styles.pullButtonText}>10回引く</Text>
                </View>
              </MobbyAssetButton>
            </View>
            {error ? <Text accessibilityLiveRegion="assertive" style={styles.errorText}>{error}</Text> : null}
          </View>
        </View>

        <View style={styles.lineupHeader}>
          <Text style={styles.lineupTitle}>ガチャの中身</Text>
          <Text style={styles.inventorySummary}>所持アイテム合計 {totalStackableItems + inventory.ownedThemeIds.length}個</Text>
        </View>
        <View style={styles.lineupRow}>
          {GACHA_LINEUP_ITEMS.map((item) => <MobbyAssetSurface
            key={item.label}
            variant="tile"
            style={styles.lineupCard}
            contentStyle={styles.lineupCardContent}
          >
            <Image
              accessible={false}
              contentFit="contain"
              contentPosition="center"
              source={item.previewImage}
              style={styles.lineupArtwork}
            />
            <Text numberOfLines={1} style={styles.lineupLabel}>{item.label}</Text>
            <Text style={styles.lineupCount}>{item.count}種</Text>
            <Text style={styles.lineupRate}>提供割合 {item.rate}%</Text>
          </MobbyAssetSurface>)}
        </View>
        <Text style={styles.disclaimer}>各カテゴリ内は同じ確率です。着せ替えテーマが重複した場合は、未所持テーマへ自動で再抽選します。</Text>

        <View style={styles.themeHeading}>
          <View>
            <Text style={styles.lineupTitle}>着せ替えテーマ</Text>
          </View>
          <MobbyAssetButton
            accessibilityLabel="標準テーマに戻す"
            disabled={equippingThemeId !== null || inventory.equippedThemeId === null}
            onPress={() => void handleEquipTheme(null)}
            tone="cream"
            themeAssetSlot="themeResetButton"
            style={styles.defaultThemeButton}
            contentStyle={styles.defaultThemeButtonContent}
          >
            <Text style={styles.defaultThemeButtonText}>{equippingThemeId === 'default' ? '切替中…' : '標準に戻す'}</Text>
          </MobbyAssetButton>
        </View>
        {inventory.ownedThemeIds.length === 0 ? (
          <MobbyAssetSurface variant="statusWide" style={styles.emptyThemeCard} contentStyle={styles.emptyThemeCardContent}>
            <Text style={styles.emptyThemeTitle}>テーマはガチャで解放</Text>
            <Text style={styles.emptyThemeBody}>手に入れたテーマは、ここからアプリ全体へ着せ替えできます。</Text>
          </MobbyAssetSurface>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.characterTabsContent} style={styles.characterTabs}>
              {ownedThemeCharacters.map((character) => {
                const characterTheme = GACHA_THEME_REWARDS.find((theme) => theme.characterId === character.id && inventory.ownedThemeIds.includes(theme.id));
                return <MobbyAssetTabButton
                  key={character.id}
                  accessibilityLabel={`${character.name}の着せ替え`}
                  selected={themeCharacterId === character.id}
                  onPress={() => setThemeCharacterId(character.id)}
                  backgroundResizeMode="cover"
                  backgroundSource={characterTheme ? getGachaThemeAssetSource(characterTheme, 'themeCharacterTab') : undefined}
                  preferBackgroundSource
                  style={styles.characterTab}
                  contentStyle={styles.characterTabContent}
                >
                  <Image accessible={false} source={character.image} contentFit="contain" style={styles.characterTabImage} />
                  <Text numberOfLines={1} style={styles.characterTabText}>{character.name}</Text>
                </MobbyAssetTabButton>;
              })}
            </ScrollView>
            <ScrollView
              contentContainerStyle={styles.themeList}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
            {visibleThemes.map((theme) => {
              const selected = inventory.equippedThemeId === theme.id;
              const character = getGachaCharacter(theme.characterId);
              return <Pressable
                accessibilityLabel={`${theme.name}${selected ? '、使用中' : 'を使う'}`}
                accessibilityRole="button"
                accessibilityState={{ selected, busy: equippingThemeId === theme.id }}
                disabled={equippingThemeId !== null}
                key={theme.id}
                onPress={() => void handleEquipTheme(theme.id)}
                style={({ pressed }) => [
                  styles.themeCard,
                  { borderColor: character.accent },
                  selected && styles.themeCardSelected,
                  pressed && styles.themePressed,
                ]}
              >
                <MobbyAssetSurface
                  variant="paper"
                  backgroundSource={getGachaThemeAssetSource(theme, 'dressUpButton')}
                  backgroundResizeMode="cover"
                  style={styles.themeCardSurface}
                  contentStyle={styles.themeCardSurfaceContent}
                >
                  <View style={styles.themePreviewFrame}>
                    <Image
                      accessible={false}
                      contentFit="contain"
                      contentPosition="center"
                      source={theme.previewImage}
                      style={styles.themePreview}
                    />
                  </View>
                  <MobbyAssetSurface
                    pointerEvents="none"
                    variant="statusWide"
                    backgroundSource={getGachaThemeAssetSource(theme, 'themeActionLabel')}
                    backgroundResizeMode="cover"
                    style={styles.themeCardCopy}
                    contentStyle={styles.themeCardCopyContent}
                  >
                    <Text numberOfLines={1} style={styles.themeCharacter}>{character.name}</Text>
                    <Text style={[styles.themeStyle, { color: character.accent }]}>STYLE {theme.styleNumber}</Text>
                    <Text style={[styles.themeStatus, selected && { color: character.accent }]}>
                      {equippingThemeId === theme.id ? '切替中…' : selected ? '使用中' : 'このテーマを使う'}
                    </Text>
                  </MobbyAssetSurface>
                </MobbyAssetSurface>
              </Pressable>;
            })}
            </ScrollView>
          </>
        )}
      </ScrollView>
    </View>
    <GachaResultModal outcome={outcome} onClose={() => setOutcome(null)} />
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, overflow: 'hidden' },
  // The app shell supplies the shared room/theme background behind this screen.
  // Keep this layer transparent so a second, partial-size backdrop is not drawn.
  backdrop: { flex: 1, backgroundColor: 'transparent' },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 14, paddingTop: 8, paddingBottom: TAB_BAR_CLEARANCE + 66 },
  contentCompact: { paddingHorizontal: 10 },
  navigationText: { color: '#FFF8E9', textShadowColor: 'rgba(42,29,39,0.8)', textShadowRadius: 3 },
  navigationSubText: { color: '#F6E1DF', textShadowColor: 'rgba(42,29,39,0.8)', textShadowRadius: 3 },
  headerCard: { minHeight: 94, borderRadius: 24, overflow: 'hidden' },
  headerCardContent: { minHeight: 94, paddingHorizontal: 22, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 8 },
  title: { color: '#FFF8E9', fontSize: 27, lineHeight: 32, fontWeight: '900', letterSpacing: 0.8, textShadowColor: 'rgba(42,29,39,0.72)', textShadowRadius: 3 },
  headerFreeBadge: { minWidth: 76, height: 32, borderRadius: 16, overflow: 'hidden', transform: [{ rotate: '3deg' }] },
  headerFreeBadgeContent: { height: 32, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  headerFreeText: { color: '#735039', fontSize: 12, lineHeight: 15, fontWeight: '900' },
  progressRow: { flexDirection: 'row', gap: 7, marginTop: 8 },
  progressCard: { flex: 1, minWidth: 0, height: 56, borderRadius: 18, overflow: 'hidden' },
  progressCardContent: { height: 56, paddingHorizontal: 5, paddingVertical: 7, alignItems: 'center', justifyContent: 'center' },
  progressValue: { color: '#5A3D50', fontSize: 17, lineHeight: 20, fontWeight: '900' },
  progressUnit: { color: '#886A79', fontSize: 12, fontWeight: '800' },
  progressLabel: { color: '#957382', fontSize: 12, lineHeight: 14, fontWeight: '800', marginTop: 1 },
  machineCard: { height: 410, marginTop: 8, borderRadius: 30, overflow: 'hidden' },
  machinePanel: { ...StyleSheet.absoluteFillObject },
  machineCardContent: { height: 410, paddingHorizontal: 23, paddingTop: 20, paddingBottom: 23, alignItems: 'center', zIndex: 1 },
  machineStage: { width: '100%', height: 286, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  lightHalo: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,231,121,0.48)', shadowColor: '#FFE06F', shadowOpacity: 0.9, shadowRadius: 28, shadowOffset: { width: 0, height: 0 }, elevation: 7 },
  sparkleRing: { position: 'absolute', width: 278, height: 278, alignItems: 'center', justifyContent: 'center' },
  sparkleImage: { width: '100%', height: '100%' },
  machineImage: { width: 234, height: 234 },
  machinePlaque: { position: 'absolute', bottom: 4, width: 230, height: 50, borderRadius: 16, overflow: 'hidden' },
  machinePlaqueContent: { height: 50, paddingHorizontal: 18, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  machineKicker: { color: '#A07177', fontSize: 12, lineHeight: 13, fontWeight: '900', letterSpacing: 1.5 },
  machineTitle: { color: '#5B3F52', fontSize: 15, lineHeight: 20, fontWeight: '900' },
  buttonRow: { width: '100%', flexDirection: 'row', gap: 9, marginTop: 7 },
  pullButton: { flex: 1, height: 58 },
  pullButtonTen: { flex: 1.18 },
  pullButtonContent: { minHeight: 58, paddingHorizontal: 8, paddingVertical: 7 },
  pullButtonCopy: { alignItems: 'center', justifyContent: 'center' },
  pullButtonSub: { color: '#A2695E', fontSize: 12, lineHeight: 12, fontWeight: '900', letterSpacing: 1.3 },
  pullButtonSubCoral: { color: '#FFE1B2', fontSize: 12, lineHeight: 12, fontWeight: '900', letterSpacing: 1.3 },
  pullButtonText: { color: '#FFF9EC', fontSize: 17, lineHeight: 21, fontWeight: '900' },
  pullButtonTextCream: { color: '#6A4559', fontSize: 17, lineHeight: 21, fontWeight: '900' },
  errorText: { color: '#B54451', fontSize: 12, lineHeight: 17, fontWeight: '900', textAlign: 'center', marginTop: 5, textShadowColor: 'rgba(255,249,235,0.9)', textShadowRadius: 2 },
  lineupHeader: { minHeight: 50, marginTop: 14, paddingHorizontal: 4, justifyContent: 'center' },
  lineupTitle: { color: '#54394D', fontSize: 19, lineHeight: 23, fontWeight: '900', textShadowColor: 'rgba(255,249,235,0.94)', textShadowRadius: 2 },
  inventorySummary: { position: 'absolute', right: 4, bottom: 5, color: '#8E6B78', fontSize: 12, lineHeight: 15, fontWeight: '800', textShadowColor: 'rgba(255,249,235,0.94)', textShadowRadius: 2 },
  lineupRow: { flexDirection: 'row', gap: 7 },
  lineupCard: { flex: 1, minWidth: 0, aspectRatio: 1, borderRadius: 18, overflow: 'hidden' },
  lineupCardContent: { flex: 1, paddingHorizontal: 6, paddingVertical: 9, alignItems: 'center' },
  lineupArtwork: { flex: 1, width: '100%', minHeight: 38, maxHeight: 54 },
  lineupLabel: { color: '#614559', fontSize: 12, lineHeight: 15, fontWeight: '900', textAlign: 'center', marginTop: 2 },
  lineupCount: { color: '#8A6878', fontSize: 12, lineHeight: 15, fontWeight: '800', marginTop: 1 },
  lineupRate: { color: '#A17E86', fontSize: 12, lineHeight: 14, fontWeight: '700', marginTop: 3, textAlign: 'center' },
  disclaimer: { color: '#82636F', fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 8, paddingHorizontal: 6, textShadowColor: 'rgba(255,249,235,0.94)', textShadowRadius: 2 },
  themeHeading: { minHeight: 54, marginTop: 15, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  defaultThemeButton: { minHeight: 40, borderRadius: 18, overflow: 'hidden' },
  defaultThemeButtonContent: { minHeight: 40, paddingHorizontal: 14, paddingVertical: 7 },
  defaultThemeButtonText: { color: '#6A4859', fontSize: 12, lineHeight: 15, fontWeight: '900' },
  emptyThemeCard: { height: 94, borderRadius: 20, overflow: 'hidden' },
  emptyThemeCardContent: { height: 94, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  emptyThemeTitle: { color: '#614559', fontSize: 15, lineHeight: 19, fontWeight: '900' },
  emptyThemeBody: { color: '#8A6878', fontSize: 12, lineHeight: 17, fontWeight: '700', textAlign: 'center', marginTop: 3 },
  themeList: { gap: 10, paddingHorizontal: 3, paddingBottom: 7 },
  characterTabs: { flexGrow: 0, marginBottom: 8 },
  characterTabsContent: { gap: 6, paddingHorizontal: 2 },
  characterTab: { width: 92, minHeight: 54 },
  characterTabContent: { minHeight: 54, paddingHorizontal: 5, paddingVertical: 4, gap: 2 },
  characterTabImage: { width: 24, height: 28 },
  characterTabText: { color: '#614559', fontSize: 10, lineHeight: 12, fontWeight: '900', textAlign: 'center' },
  themeCard: { position: 'relative', width: 174, height: 396, borderRadius: 21, borderWidth: 2, overflow: 'hidden' },
  themeCardSurface: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  themeCardSurfaceContent: { flex: 1, minHeight: 0 },
  themeCardSelected: { borderWidth: 4, shadowColor: '#52384C', shadowOpacity: 0.24, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  themePressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  themePreviewFrame: { width: '100%', aspectRatio: 768 / 1365, overflow: 'hidden' },
  themePreview: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  themeCardCopy: { flex: 1, minHeight: 76, overflow: 'hidden' },
  themeCardCopyContent: { flex: 1, minHeight: 76, paddingHorizontal: 10, paddingVertical: 7 },
  themeCharacter: { color: '#583D50', fontSize: 13, lineHeight: 17, fontWeight: '900', textShadowColor: 'rgba(255,249,235,0.94)', textShadowRadius: 2 },
  themeStyle: { color: '#98717E', fontSize: 12, lineHeight: 14, fontWeight: '900', letterSpacing: 0.8, textShadowColor: 'rgba(255,249,235,0.94)', textShadowRadius: 2 },
  themeStatus: { color: '#7D5E6D', fontSize: 12, lineHeight: 15, fontWeight: '800', marginTop: 3, textShadowColor: 'rgba(255,249,235,0.94)', textShadowRadius: 2 },
  modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 20 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(55,35,49,0.68)' },
  modalCard: { width: '100%', maxWidth: 400, maxHeight: '90%', minHeight: 488, borderRadius: 30, shadowColor: '#382330', shadowOpacity: 0.34, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 18, overflow: 'hidden' },
  modalCardTen: { maxWidth: 470, height: '90%' },
  modalCardContent: { minHeight: 488, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 18, overflow: 'hidden' },
  modalCardContentTen: { flex: 1, minHeight: 0 },
  modalHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: '#55394E', fontSize: 24, lineHeight: 29, fontWeight: '900' },
  modalLead: { color: '#876374', fontSize: 13, lineHeight: 18, fontWeight: '800', marginTop: 4, marginBottom: 9 },
  freeSeal: { width: 64, height: 32, borderRadius: 16, overflow: 'hidden', transform: [{ rotate: '5deg' }] },
  freeSealContent: { height: 32, alignItems: 'center', justifyContent: 'center' },
  freeSealText: { color: '#FFF8E8', fontSize: 12, lineHeight: 15, fontWeight: '900', letterSpacing: 0.6, textShadowColor: 'rgba(42,29,39,0.72)', textShadowRadius: 2 },
  resultsScroll: { flexGrow: 0, flexShrink: 1 },
  results: { alignItems: 'center', paddingVertical: 5 },
  resultsTen: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', justifyContent: 'space-between', rowGap: 9 },
  resultCard: { width: '100%', maxWidth: 278, minHeight: 302, borderRadius: 22, overflow: 'hidden' },
  resultCardCompact: { width: '48.5%', minHeight: 210, borderRadius: 17 },
  resultCardContent: { minHeight: 302, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' },
  resultCardContentCompact: { minHeight: 210, paddingHorizontal: 7, paddingVertical: 9 },
  resultArtworkWrap: { position: 'relative' },
  artwork: { width: 178, height: 178, borderRadius: 25, overflow: 'hidden' },
  artworkCompact: { width: 104, height: 104, borderRadius: 17 },
  artworkSurface: { width: '100%', height: 178, padding: 12, alignItems: 'center', justifyContent: 'center' },
  artworkSurfaceCompact: { height: 104, padding: 7 },
  artworkImage: { flex: 1, width: '100%' },
  resultBadge: { position: 'absolute', minWidth: 48, height: 25, borderRadius: 13, overflow: 'hidden' },
  resultBadgeContent: { height: 25, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  resultBadgeText: { color: '#FFF9E9', fontSize: 12, lineHeight: 14, fontWeight: '900', letterSpacing: 0.5, textShadowColor: 'rgba(42,29,39,0.72)', textShadowRadius: 2 },
  newBadge: { left: -9, top: -8, transform: [{ rotate: '-7deg' }] },
  countBadge: { right: -7, bottom: -6 },
  rarityPill: { width: 54, height: 24, borderRadius: 12, overflow: 'hidden', marginTop: 10 },
  rarityPillContent: { height: 24, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  rarityText: { fontSize: 12, lineHeight: 14, fontWeight: '900', letterSpacing: 0.8, textShadowColor: 'rgba(255,249,235,0.94)', textShadowRadius: 2 },
  resultName: { color: '#54394B', fontSize: 16, lineHeight: 21, fontWeight: '900', textAlign: 'center', marginTop: 5 },
  resultNameCompact: { fontSize: 12, lineHeight: 16, marginTop: 4 },
  rerollText: { color: '#946D80', fontSize: 12, lineHeight: 14, fontWeight: '800', marginTop: 3 },
  closeButton: { width: '100%', height: 52, marginTop: 12 },
  closeButtonContent: { minHeight: 52 },
  closeButtonText: { color: '#FFF9E9', fontSize: 16, lineHeight: 21, fontWeight: '900' },
});
