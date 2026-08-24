import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { MobbyAssetButton, MobbyAssetSurface } from '@/components/mobby-ui';
import {
  GACHA_CATALOG_COUNTS,
  GACHA_CATEGORY_RATES,
  GACHA_THEME_REWARDS,
  getGachaCharacter,
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

const GACHA_BACKDROP = require('../../assets/backgrounds/home-room-rich-v2.png');
const GACHA_PACKAGE = require('../../assets/mobby-time-package.png');
const TAB_BAR_CLEARANCE = 82;

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

function rewardIcon(reward: GachaReward) {
  if (reward.category === 'tool') return reward.toolKind === 'poke' ? '☝' : '▼';
  if (reward.category === 'theme') return '✦';
  return reward.variant === 'plush' ? '●' : '♢';
}

function RewardArtwork({ reward, compact = false }: { reward: GachaReward; compact?: boolean }) {
  const character = reward.category === 'tool' ? null : getGachaCharacter(reward.characterId);
  return <View style={[
    styles.artwork,
    compact && styles.artworkCompact,
    { borderColor: character?.accent ?? rarityColor(reward) },
  ]}>
    <Image
      accessible={false}
      resizeMode={reward.category === 'theme' ? 'cover' : 'contain'}
      source={reward.previewImage}
      style={styles.artworkImage}
    />
    <View pointerEvents="none" style={[styles.artworkTint, { backgroundColor: character?.accent ?? rarityColor(reward) }]} />
    <Text style={[styles.artworkIcon, compact && styles.artworkIconCompact]}>{rewardIcon(reward)}</Text>
  </View>;
}

function ResultBadge({ result }: { result: GachaPullResult }) {
  if (result.isNew) return <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>;
  return <View style={styles.countBadge}><Text style={styles.countBadgeText}>×{result.inventoryCount}</Text></View>;
}

function PullResultCard({ result, compact }: { result: GachaPullResult; compact: boolean }) {
  const rerolled = result.rerollReason !== 'none';
  return <MobbyAssetSurface
    accessible
    accessibilityLabel={`${result.reward.name}、${result.isNew ? '新しく獲得' : `所持数${result.inventoryCount}`}`}
    variant="paper"
    style={[styles.resultCard, compact && styles.resultCardCompact]}
    contentStyle={[styles.resultCardContent, compact && styles.resultCardContentCompact]}
  >
    <View style={styles.resultArtworkWrap}>
      <RewardArtwork reward={result.reward} compact={compact} />
      <ResultBadge result={result} />
    </View>
    <View style={[styles.rarityPill, { backgroundColor: rarityColor(result.reward) }]}>
      <Text style={styles.rarityText}>{result.reward.rarity}</Text>
    </View>
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
        <View pointerEvents="none" style={styles.modalGlow} />
        <View style={styles.modalHeadingRow}>
          <View>
            <Text style={styles.modalEyebrow}>GACHA RESULT</Text>
            <Text accessibilityRole="header" style={styles.modalTitle}>ガチャ結果</Text>
          </View>
          <View style={styles.freeSeal}><Text style={styles.freeSealText}>FREE</Text></View>
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
  const packageMotion = useRef(new Animated.Value(0)).current;
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

  const runPackageAnimation = useCallback(() => {
    packageMotion.setValue(0);
    lightMotion.setValue(0);
    return animateValue(Animated.parallel([
      Animated.sequence([
        Animated.timing(packageMotion, { toValue: 0.36, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(packageMotion, { toValue: 0.68, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(packageMotion, { toValue: 1, duration: 300, easing: Easing.out(Easing.back(1.7)), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(160),
        Animated.timing(lightMotion, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]));
  }, [lightMotion, packageMotion]);

  const handlePull = useCallback(async (size: GachaPullSize) => {
    if (!hydrated || pulling) return;
    setPulling(true);
    setError(null);
    haptics.medium();
    try {
      const [nextOutcome] = await Promise.all([performGachaPull(size), runPackageAnimation()]);
      if (!mountedRef.current) return;
      setInventory(nextOutcome.state);
      setOutcome(nextOutcome);
      try {
        onPullComplete?.(nextOutcome);
      } catch {
        // The inventory is already persisted; consumer UI errors must not
        // turn a successful free pull into a retry that grants it twice.
      }
      haptics.success();
    } catch {
      if (mountedRef.current) setError('ガチャを引けませんでした。もう一度お試しください。');
      haptics.error();
    } finally {
      if (mountedRef.current) setPulling(false);
    }
  }, [haptics, hydrated, onPullComplete, pulling, runPackageAnimation]);

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
  const totalStackableItems = useMemo(
    () => Object.values(inventory.stackableCounts).reduce((sum, count) => sum + (count ?? 0), 0),
    [inventory.stackableCounts],
  );
  const packageRotate = packageMotion.interpolate({
    inputRange: [0, 0.18, 0.36, 0.52, 0.68, 1],
    outputRange: ['0deg', '-7deg', '7deg', '-5deg', '4deg', '0deg'],
  });
  const packageScale = packageMotion.interpolate({
    inputRange: [0, 0.68, 1],
    outputRange: [1, 0.93, 1.08],
  });
  const lightScale = lightMotion.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.2] });
  const actionDisabled = !hydrated || pulling;

  return <View style={styles.root}>
    <ImageBackground source={activeTheme?.assets.appBackground ?? GACHA_BACKDROP} resizeMode="cover" style={styles.backdrop} imageStyle={styles.backdropImage}>
      <View pointerEvents="none" style={styles.backdropWash} />
      <ScrollView
        contentContainerStyle={[styles.content, isCompact && styles.contentCompact]}
        showsVerticalScrollIndicator={false}
      >
        <MobbyAssetSurface variant="darkTopbar" style={styles.headerCard} contentStyle={styles.headerCardContent}>
          <View>
            <Text style={styles.eyebrow}>MOBBY CAPSULE</Text>
            <Text accessibilityRole="header" style={styles.title}>ガチャ</Text>
            <Text style={styles.subtitle}>何度でも無料。テーマの重複はありません。</Text>
          </View>
          <View style={styles.headerFreeBadge}>
            <Text style={styles.headerFreeText}>ずっと無料</Text>
          </View>
        </MobbyAssetSurface>

        <View style={styles.progressRow}>
          <MobbyAssetSurface variant="labelPill" style={styles.progressCard} contentStyle={styles.progressCardContent}>
            <Text style={styles.progressValue}>{inventory.ownedThemeIds.length}<Text style={styles.progressUnit}> / {GACHA_CATALOG_COUNTS.themes}</Text></Text>
            <Text style={styles.progressLabel}>テーマ</Text>
          </MobbyAssetSurface>
          <MobbyAssetSurface variant="labelPill" style={styles.progressCard} contentStyle={styles.progressCardContent}>
            <Text style={styles.progressValue}>{collectedStackableKinds}<Text style={styles.progressUnit}>種</Text></Text>
            <Text style={styles.progressLabel}>道具・グッズ</Text>
          </MobbyAssetSurface>
          <MobbyAssetSurface variant="labelPill" style={styles.progressCard} contentStyle={styles.progressCardContent}>
            <Text style={styles.progressValue}>{inventory.totalPulls}<Text style={styles.progressUnit}>回</Text></Text>
            <Text style={styles.progressLabel}>引いた回数</Text>
          </MobbyAssetSurface>
        </View>

        <MobbyAssetSurface variant="paperTall" style={styles.machineCard} contentStyle={styles.machineCardContent}>
          <View style={styles.machineStage}>
            <Animated.View style={[styles.lightHalo, { opacity: lightMotion, transform: [{ scale: lightScale }] }]} />
            <View style={styles.sparkleRing}>
              <Text style={[styles.sparkle, styles.sparkleOne]}>✦</Text>
              <Text style={[styles.sparkle, styles.sparkleTwo]}>✧</Text>
              <Text style={[styles.sparkle, styles.sparkleThree]}>✦</Text>
              <Text style={[styles.sparkle, styles.sparkleFour]}>✧</Text>
            </View>
            <Animated.View style={{ transform: [{ rotate: packageRotate }, { scale: packageScale }] }}>
              <Image accessible={false} resizeMode="contain" source={GACHA_PACKAGE} style={styles.packageImage} />
            </Animated.View>
            <View style={styles.machinePlaque}>
              <Text style={styles.machineKicker}>{pulling ? 'OPENING...' : 'TAP TO OPEN'}</Text>
              <Text style={styles.machineTitle}>{pulling ? 'どきどき…' : '今日は何が出るかな？'}</Text>
            </View>
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
        </MobbyAssetSurface>

        <View style={styles.lineupHeader}>
          <Text style={styles.lineupEyebrow}>LINEUP</Text>
          <Text style={styles.lineupTitle}>ガチャの中身</Text>
          <Text style={styles.inventorySummary}>所持アイテム合計 {totalStackableItems + inventory.ownedThemeIds.length}個</Text>
        </View>
        <View style={styles.lineupRow}>
          {[
            { icon: '☝', count: GACHA_CATALOG_COUNTS.tools, rate: GACHA_CATEGORY_RATES.tool, label: 'ちょっかい道具', tone: '#D66E78' },
            { icon: '♢', count: GACHA_CATALOG_COUNTS.goods, rate: GACHA_CATEGORY_RATES.goods, label: 'ぬいグッズ', tone: '#BE874B' },
            { icon: '✦', count: GACHA_CATALOG_COUNTS.themes, rate: GACHA_CATEGORY_RATES.theme, label: '着せ替えテーマ', tone: '#796298' },
          ].map((item) => <View key={item.label} style={styles.lineupCard}>
            <View style={[styles.lineupIcon, { backgroundColor: item.tone }]}><Text style={styles.lineupIconText}>{item.icon}</Text></View>
            <Text style={styles.lineupLabel}>{item.label}</Text>
            <Text style={styles.lineupCount}>{item.count}種</Text>
            <Text style={styles.lineupRate}>提供割合 {item.rate}%</Text>
          </View>)}
        </View>
        <Text style={styles.disclaimer}>各カテゴリ内は同じ確率です。着せ替えテーマが重複した場合は、未所持テーマへ自動で再抽選します。</Text>

        <View style={styles.themeHeading}>
          <View>
            <Text style={styles.lineupEyebrow}>DRESS UP</Text>
            <Text style={styles.lineupTitle}>着せ替えテーマ</Text>
          </View>
          <Pressable
            accessibilityLabel="標準テーマに戻す"
            accessibilityRole="button"
            disabled={equippingThemeId !== null || inventory.equippedThemeId === null}
            onPress={() => void handleEquipTheme(null)}
            style={({ pressed }) => [styles.defaultThemeButton, pressed && styles.themePressed]}
          >
            <Text style={styles.defaultThemeButtonText}>{equippingThemeId === 'default' ? '切替中…' : '標準に戻す'}</Text>
          </Pressable>
        </View>
        {inventory.ownedThemeIds.length === 0 ? (
          <MobbyAssetSurface variant="paper" style={styles.emptyThemeCard} contentStyle={styles.emptyThemeCardContent}>
            <Text style={styles.emptyThemeTitle}>テーマはガチャで解放</Text>
            <Text style={styles.emptyThemeBody}>手に入れたテーマは、ここからアプリ全体へ着せ替えできます。</Text>
          </MobbyAssetSurface>
        ) : (
          <ScrollView
            contentContainerStyle={styles.themeList}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {GACHA_THEME_REWARDS.filter((theme) => inventory.ownedThemeIds.includes(theme.id)).map((theme) => {
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
                <Image resizeMode="cover" source={theme.previewImage} style={styles.themePreview} />
                <View pointerEvents="none" style={[styles.themePreviewTint, { backgroundColor: character.accent }]} />
                <View style={styles.themeCardCopy}>
                  <Text numberOfLines={1} style={styles.themeCharacter}>{character.name}</Text>
                  <Text style={styles.themeStyle}>STYLE {theme.styleNumber}</Text>
                  <Text style={[styles.themeStatus, selected && styles.themeStatusSelected]}>
                    {equippingThemeId === theme.id ? '切替中…' : selected ? '使用中' : 'このテーマを使う'}
                  </Text>
                </View>
              </Pressable>;
            })}
          </ScrollView>
        )}
      </ScrollView>
    </ImageBackground>
    <GachaResultModal outcome={outcome} onClose={() => setOutcome(null)} />
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, overflow: 'hidden' },
  backdrop: { flex: 1 },
  backdropImage: { opacity: 0.88 },
  backdropWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,247,228,0.68)' },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 14, paddingTop: 8, paddingBottom: TAB_BAR_CLEARANCE + 22 },
  contentCompact: { paddingHorizontal: 10 },
  headerCard: { minHeight: 94, overflow: 'hidden' },
  headerCardContent: { minHeight: 94, paddingHorizontal: 22, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#EAC5C8', fontSize: 12, lineHeight: 14, fontWeight: '900', letterSpacing: 2.2 },
  title: { color: '#FFF8E9', fontSize: 27, lineHeight: 32, fontWeight: '900', letterSpacing: 0.8 },
  subtitle: { color: '#F3DCDD', fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 1 },
  headerFreeBadge: { minWidth: 66, height: 32, paddingHorizontal: 10, borderRadius: 16, backgroundColor: '#FFF2B9', borderWidth: 2, borderColor: '#F3C95A', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '3deg' }] },
  headerFreeText: { color: '#735039', fontSize: 12, lineHeight: 15, fontWeight: '900' },
  progressRow: { flexDirection: 'row', gap: 7, marginTop: 8 },
  progressCard: { flex: 1, minWidth: 0, height: 56, overflow: 'hidden' },
  progressCardContent: { height: 56, paddingHorizontal: 5, paddingVertical: 7, alignItems: 'center', justifyContent: 'center' },
  progressValue: { color: '#5A3D50', fontSize: 17, lineHeight: 20, fontWeight: '900' },
  progressUnit: { color: '#886A79', fontSize: 12, fontWeight: '800' },
  progressLabel: { color: '#957382', fontSize: 12, lineHeight: 14, fontWeight: '800', marginTop: 1 },
  machineCard: { height: 396, marginTop: 8, overflow: 'hidden' },
  machineCardContent: { height: 396, paddingHorizontal: 23, paddingTop: 20, paddingBottom: 23, alignItems: 'center' },
  machineStage: { width: '100%', height: 274, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  lightHalo: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,231,121,0.48)', shadowColor: '#FFE06F', shadowOpacity: 0.9, shadowRadius: 28, shadowOffset: { width: 0, height: 0 }, elevation: 7 },
  sparkleRing: { ...StyleSheet.absoluteFillObject },
  sparkle: { position: 'absolute', color: '#D98791', fontSize: 24, lineHeight: 28, fontWeight: '900' },
  sparkleOne: { left: '13%', top: '26%', transform: [{ rotate: '-12deg' }] },
  sparkleTwo: { right: '14%', top: '19%', color: '#D6A63A' },
  sparkleThree: { left: '20%', bottom: '20%', color: '#806298' },
  sparkleFour: { right: '19%', bottom: '23%', transform: [{ rotate: '18deg' }] },
  packageImage: { width: 218, height: 218 },
  machinePlaque: { position: 'absolute', bottom: 6, minWidth: 220, paddingHorizontal: 18, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,249,232,0.92)', borderWidth: 1.5, borderColor: '#DDB781', alignItems: 'center' },
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
  errorText: { color: '#B54451', fontSize: 12, lineHeight: 17, fontWeight: '900', textAlign: 'center', marginTop: 5 },
  lineupHeader: { minHeight: 50, marginTop: 14, paddingHorizontal: 4, justifyContent: 'center' },
  lineupEyebrow: { color: '#9A7181', fontSize: 12, lineHeight: 13, fontWeight: '900', letterSpacing: 1.8 },
  lineupTitle: { color: '#54394D', fontSize: 19, lineHeight: 23, fontWeight: '900' },
  inventorySummary: { position: 'absolute', right: 4, bottom: 5, color: '#8E6B78', fontSize: 12, lineHeight: 15, fontWeight: '800' },
  lineupRow: { flexDirection: 'row', gap: 7 },
  lineupCard: { flex: 1, minWidth: 0, minHeight: 118, paddingHorizontal: 5, paddingVertical: 10, borderRadius: 18, backgroundColor: 'rgba(255,249,232,0.9)', borderWidth: 1.5, borderColor: '#DFC093', alignItems: 'center' },
  lineupIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  lineupIconText: { color: '#FFF9EA', fontSize: 19, lineHeight: 22, fontWeight: '900' },
  lineupLabel: { color: '#614559', fontSize: 12, lineHeight: 15, fontWeight: '900', textAlign: 'center', marginTop: 5 },
  lineupCount: { color: '#8A6878', fontSize: 12, lineHeight: 15, fontWeight: '800', marginTop: 1 },
  lineupRate: { color: '#A17E86', fontSize: 12, lineHeight: 14, fontWeight: '700', marginTop: 3, textAlign: 'center' },
  disclaimer: { color: '#82636F', fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 8, paddingHorizontal: 6 },
  themeHeading: { minHeight: 54, marginTop: 15, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  defaultThemeButton: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1.5, borderColor: '#B98C76', backgroundColor: 'rgba(255,249,232,0.94)', alignItems: 'center', justifyContent: 'center' },
  defaultThemeButtonText: { color: '#6A4859', fontSize: 12, lineHeight: 15, fontWeight: '900' },
  emptyThemeCard: { height: 94, overflow: 'hidden' },
  emptyThemeCardContent: { height: 94, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  emptyThemeTitle: { color: '#614559', fontSize: 15, lineHeight: 19, fontWeight: '900' },
  emptyThemeBody: { color: '#8A6878', fontSize: 12, lineHeight: 17, fontWeight: '700', textAlign: 'center', marginTop: 3 },
  themeList: { gap: 10, paddingHorizontal: 3, paddingBottom: 5 },
  themeCard: { position: 'relative', width: 160, height: 190, borderRadius: 21, borderWidth: 2, backgroundColor: '#FFF8E9', overflow: 'hidden' },
  themeCardSelected: { borderWidth: 4, shadowColor: '#52384C', shadowOpacity: 0.24, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  themePressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  themePreview: { width: '100%', height: 108 },
  themePreviewTint: { position: 'absolute', left: 0, right: 0, top: 0, height: 108, opacity: 0.12 },
  themeCardCopy: { flex: 1, paddingHorizontal: 10, paddingVertical: 7 },
  themeCharacter: { color: '#583D50', fontSize: 13, lineHeight: 17, fontWeight: '900' },
  themeStyle: { color: '#98717E', fontSize: 12, lineHeight: 14, fontWeight: '900', letterSpacing: 0.8 },
  themeStatus: { color: '#7D5E6D', fontSize: 12, lineHeight: 15, fontWeight: '800', marginTop: 3 },
  themeStatusSelected: { color: '#C15E6B' },
  modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 20 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(55,35,49,0.68)' },
  modalCard: { width: '100%', maxWidth: 400, maxHeight: '90%', minHeight: 488, borderRadius: 30, shadowColor: '#382330', shadowOpacity: 0.34, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 18, overflow: 'hidden' },
  modalCardTen: { maxWidth: 470, height: '90%' },
  modalCardContent: { minHeight: 488, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 18, overflow: 'hidden' },
  modalCardContentTen: { flex: 1, minHeight: 0 },
  modalGlow: { position: 'absolute', width: 300, height: 220, borderRadius: 150, top: -120, right: -80, backgroundColor: 'rgba(255,218,115,0.34)' },
  modalHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalEyebrow: { color: '#A46F78', fontSize: 12, lineHeight: 14, fontWeight: '900', letterSpacing: 1.8 },
  modalTitle: { color: '#55394E', fontSize: 24, lineHeight: 29, fontWeight: '900' },
  modalLead: { color: '#876374', fontSize: 13, lineHeight: 18, fontWeight: '800', marginTop: 4, marginBottom: 9 },
  freeSeal: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#D76F7D', borderWidth: 3, borderColor: '#FFF0B8', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '8deg' }] },
  freeSealText: { color: '#FFF8E8', fontSize: 12, lineHeight: 15, fontWeight: '900', letterSpacing: 0.6 },
  resultsScroll: { flexGrow: 0, flexShrink: 1 },
  results: { alignItems: 'center', paddingVertical: 5 },
  resultsTen: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', justifyContent: 'space-between', rowGap: 9 },
  resultCard: { width: '100%', maxWidth: 278, minHeight: 302, borderRadius: 22, overflow: 'hidden' },
  resultCardCompact: { width: '48.5%', minHeight: 210, borderRadius: 17 },
  resultCardContent: { minHeight: 302, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' },
  resultCardContentCompact: { minHeight: 210, paddingHorizontal: 7, paddingVertical: 9 },
  resultArtworkWrap: { position: 'relative' },
  artwork: { width: 178, height: 178, borderRadius: 25, borderWidth: 3, overflow: 'hidden', backgroundColor: '#F5E3C8', alignItems: 'center', justifyContent: 'center' },
  artworkCompact: { width: 104, height: 104, borderRadius: 17, borderWidth: 2 },
  artworkImage: { width: '100%', height: '100%' },
  artworkTint: { ...StyleSheet.absoluteFillObject, opacity: 0.08 },
  artworkIcon: { position: 'absolute', right: 8, bottom: 5, color: '#FFF7E3', fontSize: 28, lineHeight: 33, fontWeight: '900', textShadowColor: '#5D3D51', textShadowRadius: 4 },
  artworkIconCompact: { right: 5, bottom: 3, fontSize: 20, lineHeight: 24 },
  newBadge: { position: 'absolute', left: -9, top: -8, minWidth: 48, height: 25, paddingHorizontal: 6, borderRadius: 13, backgroundColor: '#D96373', borderWidth: 2, borderColor: '#FFF4D5', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-7deg' }] },
  newBadgeText: { color: '#FFF9E9', fontSize: 12, lineHeight: 14, fontWeight: '900', letterSpacing: 0.5 },
  countBadge: { position: 'absolute', right: -7, bottom: -6, minWidth: 40, height: 24, paddingHorizontal: 7, borderRadius: 12, backgroundColor: '#765A75', borderWidth: 2, borderColor: '#FFF4D5', alignItems: 'center', justifyContent: 'center' },
  countBadgeText: { color: '#FFF9E9', fontSize: 12, lineHeight: 14, fontWeight: '900' },
  rarityPill: { minWidth: 42, height: 22, paddingHorizontal: 8, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  rarityText: { color: '#FFF', fontSize: 12, lineHeight: 14, fontWeight: '900', letterSpacing: 0.8 },
  resultName: { color: '#54394B', fontSize: 16, lineHeight: 21, fontWeight: '900', textAlign: 'center', marginTop: 5 },
  resultNameCompact: { fontSize: 12, lineHeight: 16, marginTop: 4 },
  rerollText: { color: '#946D80', fontSize: 12, lineHeight: 14, fontWeight: '800', marginTop: 3 },
  closeButton: { width: '100%', height: 52, marginTop: 12 },
  closeButtonContent: { minHeight: 52 },
  closeButtonText: { color: '#FFF9E9', fontSize: 16, lineHeight: 21, fontWeight: '900' },
});
