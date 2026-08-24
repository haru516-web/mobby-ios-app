import { useEffect, useState } from 'react';
import { Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type ImageSourcePropType } from 'react-native';

import { MobbyAssetButton } from '@/components/mobby-ui';
import { BlackStarToggle } from '@/components/characters';
import { Text } from '@/ui/layout/visualPrimitives';
import { useGachaTheme } from '@/theme/GachaThemeContext';

const CHARACTER_PICKER_POPUP_BACKGROUND = require('../../../assets/generated-ui/popup-character-picker-v1.png');
const CHARACTER_PICKER_PANEL_ASPECT_RATIO = 950 / 1460;
const CHARACTER_PICKER_BACKGROUND_SCALE = 1536 / 1460;

export type CharacterPickerCharacter = {
  id: string;
  name: string;
  image: ImageSourcePropType;
  owned: boolean;
  faction: 'mobby' | 'kuroboshi';
};

export function CharacterPickerPopover({ characters, selectedId, disabled, onConfirm, onClose, onUiTap }: {
  characters: readonly CharacterPickerCharacter[];
  selectedId: string;
  disabled?: boolean;
  onConfirm: (id: string) => void;
  onClose: () => void;
  onUiTap?: () => void;
}) {
  const [draftId, setDraftId] = useState(selectedId);
  const [showBlackStars, setShowBlackStars] = useState(false);
  const { activeTheme } = useGachaTheme();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const availableHeight = Math.max(0, Math.min(viewportHeight * 0.82, viewportHeight - 48, 680));
  const panelWidth = Math.max(0, Math.min(viewportWidth - 32, 410, availableHeight * CHARACTER_PICKER_PANEL_ASPECT_RATIO));
  const panelHeight = panelWidth / CHARACTER_PICKER_PANEL_ASPECT_RATIO;
  const visibleCharacters = characters.filter((character) => character.faction === (showBlackStars ? 'kuroboshi' : 'mobby'));

  useEffect(() => {
    setDraftId(selectedId);
  }, [selectedId]);

  const close = () => {
    onUiTap?.();
    onClose();
  };
  const confirm = () => {
    onUiTap?.();
    onConfirm(draftId);
  };

  return <Modal animationType="none" onRequestClose={close} presentationStyle="overFullScreen" transparent visible>
    <View pointerEvents="box-none" style={styles.overlay}>
      <Pressable accessibilityLabel="キャラ選択を閉じる" accessibilityRole="button" onPress={close} style={styles.backdrop} />
      <View accessibilityViewIsModal accessibilityLabel="メインモビーのキャラ選択" style={[styles.panel, { width: panelWidth, height: panelHeight }]}>
      <ImageBackground accessible={false} imageStyle={[styles.panelImage, !activeTheme && styles.backgroundImage]} resizeMode={activeTheme ? 'stretch' : 'cover'} source={activeTheme?.assets.popup ?? CHARACTER_PICKER_POPUP_BACKGROUND} style={styles.panelBackground}>
      <View style={styles.panelContent}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>MAIN MOBBY</Text>
          <Text accessibilityRole="header" style={styles.title}>キャラ選択</Text>
          <Text style={styles.subtitle}>お部屋でいっしょに過ごすモビーを選んでね</Text>
        </View>
        <Pressable accessibilityLabel="キャラ選択を閉じる" accessibilityRole="button" hitSlop={8} onPress={close} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>

      <BlackStarToggle
        active={showBlackStars}
        onChange={(active) => {
          setShowBlackStars(active);
          const candidates = characters.filter((character) => character.faction === (active ? 'kuroboshi' : 'mobby'));
          const next = candidates.find((character) => character.id === draftId) ?? candidates.find((character) => character.owned) ?? candidates[0];
          if (next) setDraftId(next.id);
        }}
        style={styles.blackStarToggle}
        testID="character-picker-black-star-toggle"
      />

      <ScrollView
        contentContainerStyle={styles.grid}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        style={styles.characterScroll}
      >
        {visibleCharacters.map((character) => {
          const selected = character.id === draftId;
          const unavailable = disabled || !character.owned;
          return <Pressable
            accessibilityLabel={`${character.name}${character.owned ? '' : '、まだお迎えしていません'}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled: unavailable, selected }}
            disabled={unavailable}
            key={character.id}
            onPress={() => {
              onUiTap?.();
              setDraftId(character.id);
            }}
            style={({ pressed }) => [styles.character, unavailable && styles.characterUnavailable, pressed && styles.characterPressed]}
          >
            <View style={[styles.characterImageWrap, selected && styles.characterImageWrapSelected]}>
              <Image accessible={false} source={character.image} resizeMode="contain" style={[styles.characterImage, !character.owned && character.faction === 'kuroboshi' && styles.characterSilhouette]} />
              {selected ? <Text pointerEvents="none" style={styles.selectedMark}>✓</Text> : null}
            </View>
            <Text numberOfLines={1} style={[styles.characterName, selected && styles.characterNameSelected]}>{character.name}</Text>
            {!character.owned ? <Text numberOfLines={1} style={styles.unowned}>未お迎え</Text> : null}
          </Pressable>;
        })}
      </ScrollView>

      <View style={styles.actions}>
        <MobbyAssetButton accessibilityLabel="キャラ選択をキャンセル" tone="cream" onPress={close} style={styles.action} contentStyle={styles.actionContent}>
          <Text style={styles.cancelText}>キャンセル</Text>
        </MobbyAssetButton>
        <MobbyAssetButton accessibilityLabel="選んだキャラに決定" disabled={disabled || draftId === selectedId} onPress={confirm} style={styles.action} contentStyle={styles.actionContent}>
          <Text style={styles.confirmText}>決定</Text>
        </MobbyAssetButton>
      </View>
      </View>
      </ImageBackground>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    zIndex: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  panel: {
    minHeight: 0,
    borderRadius: 28,
    backgroundColor: 'transparent',
    shadowColor: '#4F2D3A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 14,
  },
  panelBackground: { flex: 1, width: '100%', height: '100%', minHeight: 0, borderRadius: 28, overflow: 'hidden' },
  panelImage: { borderRadius: 28 },
  backgroundImage: { transform: [{ scale: CHARACTER_PICKER_BACKGROUND_SCALE }] },
  panelContent: { flex: 1, minHeight: 0, zIndex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 20, paddingHorizontal: 30, paddingBottom: 10 },
  headerCopy: { flex: 1 },
  eyebrow: { color: '#A45D68', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: '#593C5D', fontSize: 22, fontWeight: '900', marginTop: 2 },
  subtitle: { color: '#8A6C79', fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 3 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#7E4C60', fontSize: 30, lineHeight: 32, fontWeight: '900' },
  blackStarToggle: { alignSelf: 'flex-end', minWidth: 88, minHeight: 36, marginRight: 29, marginTop: -7, marginBottom: 2, transform: [{ scale: 0.86 }] },
  pressed: { opacity: 0.68, transform: [{ scale: 0.94 }] },
  characterScroll: { flex: 1, minHeight: 0 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 30,
    paddingTop: 8,
    paddingBottom: 16,
  },
  character: { width: '31%', alignItems: 'center', paddingVertical: 4 },
  characterUnavailable: { opacity: 0.38 },
  characterPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  characterImageWrap: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  characterImageWrapSelected: { borderColor: '#ED8A86' },
  characterImage: { width: '94%', height: '94%' },
  characterSilhouette: { tintColor: '#17131D', opacity: 0.72 },
  selectedMark: {
    position: 'absolute',
    top: 0,
    right: 2,
    color: '#D85F68',
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '900',
  },
  characterName: { color: '#806B74', fontSize: 12, lineHeight: 17, fontWeight: '800', textAlign: 'center', marginTop: 2 },
  characterNameSelected: { color: '#593C5D', fontWeight: '900' },
  unowned: { color: '#8F7A83', fontSize: 9, lineHeight: 12, fontWeight: '700', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 30, paddingTop: 10, paddingBottom: 18, borderTopWidth: 1, borderTopColor: 'rgba(89,60,93,0.10)' },
  action: { flex: 1, minHeight: 48 },
  actionContent: { minHeight: 48, paddingHorizontal: 10, paddingVertical: 7 },
  cancelText: { color: '#A4485A', fontSize: 15, fontWeight: '800' },
  confirmText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
});
