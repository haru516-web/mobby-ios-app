import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { MobbyAssetButton, MobbyAssetCloseButton, MobbyAssetSurface, MobbyAssetTabButton } from '@/components/mobby-ui';
import {
  GACHA_CHARACTERS,
  GACHA_THEME_REWARDS,
  getGachaCharacter,
  getGachaReward,
  getGachaThemeAssetSource,
  type GachaCharacterId,
  type GachaThemeRewardId,
} from '@/data/gachaCatalog';
import {
  createInitialGachaState,
  equipGachaTheme,
  loadGachaState,
  subscribeGachaState,
  type GachaInventoryState,
} from '@/game/gachaStorage';
import { useMobbyHaptics } from '@/hooks/useMobbyHaptics';
import { Text } from '@/ui/layout/visualPrimitives';

const THEME_PANEL_ASPECT_RATIO = 950 / 1460;

/**
 * The home header opens the same owned-theme picker that the gacha screen
 * exposes, without forcing the user to leave the room.  The picker subscribes
 * to the shared gacha store, so equipping here immediately updates the
 * app-wide GachaThemeProvider background and assets.
 */
export function HomeThemePicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const haptics = useMobbyHaptics();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const [inventory, setInventory] = useState<GachaInventoryState>(() => createInitialGachaState());
  const [hydrated, setHydrated] = useState(false);
  const [equippingThemeId, setEquippingThemeId] = useState<GachaThemeRewardId | 'default' | null>(null);
  const [themeCharacterId, setThemeCharacterId] = useState<GachaCharacterId>(GACHA_THEME_REWARDS[0].characterId);
  const mountedRef = useRef(true);
  const panelHeight = Math.max(420, Math.min(viewportHeight - 48, viewportHeight * 0.86, 680));
  const panelWidth = Math.max(0, Math.min(viewportWidth - 32, 430, panelHeight * THEME_PANEL_ASPECT_RATIO));

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => subscribeGachaState((next) => {
    if (mountedRef.current) setInventory(next);
  }), []);

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

  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    setHydrated(false);
    void loadGachaState()
      .then((state) => {
        if (!cancelled) setInventory(state);
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => { cancelled = true; };
  }, [visible]);

  const close = useCallback(() => {
    if (equippingThemeId !== null) return;
    onClose();
  }, [equippingThemeId, onClose]);

  const handleEquipTheme = useCallback(async (themeId: GachaThemeRewardId | null) => {
    if (!hydrated || equippingThemeId !== null) return;
    setEquippingThemeId(themeId ?? 'default');
    haptics.light();
    try {
      const next = await equipGachaTheme(themeId);
      if (mountedRef.current) setInventory(next);
      haptics.success();
    } catch {
      haptics.error();
    } finally {
      if (mountedRef.current) setEquippingThemeId(null);
    }
  }, [equippingThemeId, haptics, hydrated]);

  return <Modal
    animationType="fade"
    onRequestClose={close}
    presentationStyle="overFullScreen"
    transparent
    visible={visible}
  >
    <View pointerEvents="box-none" style={styles.overlay}>
      <Pressable accessibilityLabel="着せ替えを閉じる" accessibilityRole="button" onPress={close} style={styles.backdrop} />
      <MobbyAssetSurface
        accessibilityViewIsModal
        accessibilityLabel="アプリ内背景の着せ替え"
        variant="modalPortrait"
        themeAssetSlot="dressUpPopup"
        style={[styles.panel, { width: panelWidth, height: panelHeight }]}
        contentStyle={styles.panelContent}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={styles.title}>着せ替え</Text>
          </View>
          <MobbyAssetCloseButton accessibilityLabel="着せ替えを閉じる" onPress={close} style={styles.close}>
            <Text style={styles.closeText}>×</Text>
          </MobbyAssetCloseButton>
        </View>

        <View style={styles.headingRow}>
          <Text style={styles.sectionTitle}>所持テーマ</Text>
          <MobbyAssetButton
            accessibilityLabel="標準テーマに戻す"
            disabled={!hydrated || equippingThemeId !== null || inventory.equippedThemeId === null}
            onPress={() => void handleEquipTheme(null)}
            tone="cream"
            themeAssetSlot="themeResetButton"
            style={styles.defaultButton}
            contentStyle={styles.defaultButtonContent}
          >
            <Text style={styles.defaultButtonText}>{equippingThemeId === 'default' ? '切替中…' : '標準に戻す'}</Text>
          </MobbyAssetButton>
        </View>

        {!hydrated ? <MobbyAssetSurface variant="statusWide" style={styles.statusCard} contentStyle={styles.statusCardContent}>
          <Text style={styles.statusTitle}>テーマを確認中…</Text>
        </MobbyAssetSurface> : inventory.ownedThemeIds.length === 0 ? <MobbyAssetSurface variant="statusWide" style={styles.statusCard} contentStyle={styles.statusCardContent}>
          <Text style={styles.statusTitle}>テーマはガチャで解放</Text>
          <Text style={styles.statusBody}>ガチャで手に入れたテーマを、ここからアプリ全体へ適用できます。</Text>
        </MobbyAssetSurface> : <>
          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.characterTabsContent} style={styles.characterTabs}>
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
            nestedScrollEnabled
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
                  <Image accessible={false} contentFit="contain" contentPosition="center" source={theme.previewImage} style={styles.themePreview} />
                </View>
                <MobbyAssetSurface
                  variant="labelPill"
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
        </>}
      </MobbyAssetSurface>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 24 },
  // Keep the room and its controls at their normal brightness while the
  // illustrated picker is open. The panel itself provides the visual focus.
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  panel: { minHeight: 0, borderRadius: 30, overflow: 'hidden', shadowColor: '#382330', shadowOpacity: 0.34, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 18 },
  // The modal artwork has a transparent margin above its parchment. Place
  // the title row inside the visible background instead of that margin.
  panelContent: { flex: 1, minHeight: 0, paddingHorizontal: 24, paddingTop: 58, paddingBottom: 18 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingBottom: 11 },
  headerCopy: { flex: 1 },
  title: { color: '#55394E', fontSize: 25, lineHeight: 31, fontWeight: '900' },
  close: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#7E4C60', fontSize: 30, lineHeight: 32, fontWeight: '900' },
  pressed: { opacity: 0.68, transform: [{ scale: 0.94 }] },
  headingRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  sectionTitle: { color: '#614559', fontSize: 16, lineHeight: 21, fontWeight: '900' },
  defaultButton: { minHeight: 38, borderRadius: 17, overflow: 'hidden' },
  defaultButtonContent: { minHeight: 38, paddingHorizontal: 12, paddingVertical: 6 },
  defaultButtonText: { color: '#6A4859', fontSize: 11, lineHeight: 14, fontWeight: '900' },
  statusCard: { minHeight: 104, borderRadius: 20, overflow: 'hidden' },
  statusCardContent: { minHeight: 104, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { color: '#614559', fontSize: 15, lineHeight: 19, fontWeight: '900', textAlign: 'center' },
  statusBody: { color: '#8A6878', fontSize: 12, lineHeight: 17, fontWeight: '700', textAlign: 'center', marginTop: 3 },
  themeList: { gap: 10, paddingHorizontal: 3, paddingBottom: 7 },
  characterTabs: { flexGrow: 0, marginBottom: 8 },
  characterTabsContent: { gap: 6, paddingHorizontal: 2 },
  characterTab: { width: 92, minHeight: 54 },
  characterTabContent: { minHeight: 54, paddingHorizontal: 5, paddingVertical: 4, gap: 2 },
  characterTabImage: { width: 24, height: 28 },
  characterTabText: { color: '#614559', fontSize: 10, lineHeight: 12, fontWeight: '900', textAlign: 'center' },
  themeCard: { position: 'relative', width: 164, height: 368, borderRadius: 21, borderWidth: 2, overflow: 'hidden' },
  themeCardSurface: { ...StyleSheet.absoluteFillObject },
  themeCardSurfaceContent: { flex: 1, minHeight: 0 },
  themeCardSelected: { borderWidth: 4, shadowColor: '#52384C', shadowOpacity: 0.24, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  themePressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  themePreviewFrame: { width: '100%', aspectRatio: 768 / 1365, overflow: 'hidden' },
  themePreview: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  themeCardCopy: { flex: 1, minHeight: 70, overflow: 'hidden' },
  themeCardCopyContent: { flex: 1, minHeight: 70, paddingHorizontal: 9, paddingVertical: 6 },
  themeCharacter: { color: '#583D50', fontSize: 12, lineHeight: 16, fontWeight: '900', textShadowColor: 'rgba(255,249,235,0.94)', textShadowRadius: 2 },
  themeStyle: { color: '#98717E', fontSize: 11, lineHeight: 14, fontWeight: '900', letterSpacing: 0.8, textShadowColor: 'rgba(255,249,235,0.94)', textShadowRadius: 2 },
  themeStatus: { color: '#7D5E6D', fontSize: 11, lineHeight: 14, fontWeight: '800', marginTop: 2, textShadowColor: 'rgba(255,249,235,0.94)', textShadowRadius: 2 },
});
