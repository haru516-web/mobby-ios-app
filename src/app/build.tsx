import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mobby2DScene } from '@/components/Mobby2DScene';
import { MobbyColors, PaperPanel, Plaque } from '@/components/mobby-ui';
import { getCharacterFurnitureAssets } from '@/data/characterFurnitureAssets';
import { FURNITURE_ASSETS } from '@/data/roomAssets';
import { useMobbyGame, type Furniture } from '@/game/MobbyGameContext';

type RoomMode = 'peek' | 'custom';

const SHARED_FURNITURE: { label: Furniture; caption: string; source: (typeof FURNITURE_ASSETS)[number]['source']; shortLabel: string }[] = FURNITURE_ASSETS
  .filter((asset) => !asset.characterId)
  .map((asset) => ({ label: asset.id, caption: asset.caption, source: asset.source, shortLabel: asset.label }));

export default function BuildScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<RoomMode>('peek');
  const { furniturePositions, houseName, interact, roomItems, selectedMobby, moment, setFurniturePosition, setHouseName, toggleFurniture } = useMobbyGame();
  const webTabInset = Platform.OS === 'web' ? 82 : 0;
  const dockInset = webTabInset + Math.max(0, insets.bottom);
  const characterFurniture = getCharacterFurnitureAssets(selectedMobby.id).map((asset, index) => ({
    label: asset.id,
    caption: asset.caption,
    source: asset.source,
    shortLabel: `#${String(index + 1).padStart(2, '0')}`,
  }));
  const furniturePalette = [...characterFurniture, ...SHARED_FURNITURE];
  const characterPlacedCount = characterFurniture.filter((item) => roomItems.includes(item.label)).length;
  const custom = mode === 'custom';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={[styles.screen, { paddingBottom: 4 + webTabInset + Math.max(0, insets.bottom) }]}>
        <Plaque style={styles.titlePlaque}>
          <Text style={styles.title}>モビーの部屋</Text>
          <Text style={styles.subtitle}>{custom ? '家具を動かして、暮らしをつくろう' : 'そっと覗いて、ほっぺを引っ張って遊ぼう'}</Text>
        </Plaque>

        <View style={styles.modeBar}>
          <ModeButton active={!custom} icon="◉" title="覗く" subtitle="暮らしを見る" onPress={() => setMode('peek')} />
          <ModeButton active={custom} icon="✦" title="模様替え" subtitle="内装をカスタム" onPress={() => setMode('custom')} />
        </View>

        {custom ? (
          <View style={styles.nameRow}>
            <View style={styles.nameCopy}><Text style={styles.eyebrow}>MY LITTLE ROOM</Text><Text style={styles.nameLabel}>部屋の名前</Text></View>
            <TextInput accessibilityLabel="部屋の名前" maxLength={18} onChangeText={setHouseName} placeholder="ひだまりの一部屋" placeholderTextColor="#B8946B" style={styles.nameInput} value={houseName} />
          </View>
        ) : null}

        <View style={[styles.sceneWrap, custom ? styles.sceneWrapCustom : styles.sceneWrapPeek]}>
          <Mobby2DScene
            fullBleed
            characterLift={custom ? 94 : 0}
            enablePull={!custom}
            mobby={selectedMobby}
            reaction={moment.kind}
            animationKey={`room-${mode}-${moment.id}`}
            roomItems={roomItems}
            furniturePositions={furniturePositions}
            onFurnitureMove={custom ? setFurniturePosition : undefined}
            onPull={!custom ? () => interact('tease') : undefined}
          />
          <View pointerEvents="none" style={styles.sceneOverlay}>
            <View style={styles.sceneOverlayCopy}>
              <Text style={styles.previewKicker}>{custom ? 'CUSTOM ROOM' : 'ROOM PEEK'}</Text>
              <Text style={styles.previewTitle}>{custom ? `${selectedMobby.name}専用家具` : `${selectedMobby.name}の今日`}</Text>
            </View>
          </View>
          {!custom ? <View pointerEvents="none" style={styles.peekHint}><Text style={styles.peekHintTitle}>ほっぺを引っ張ってみて</Text><Text style={styles.peekHintText}>方向で表情が変わるよ。離すとぷるんっ！</Text></View> : null}
        </View>

        {custom ? (
          <>
            <View style={[styles.sectionHeader, { bottom: dockInset + 146 }]}>
              <View><Text style={styles.sectionKicker}>FURNITURE KIT</Text><Text style={styles.sectionTitle}>{selectedMobby.name}専用家具を置く</Text></View>
              <Text style={styles.counter}>{characterPlacedCount}/30専用</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.furnitureScroll, { bottom: dockInset + 57 }]} contentContainerStyle={styles.furnitureRow}>
              {furniturePalette.map((item) => {
                const selected = roomItems.includes(item.label);
                return (
                  <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={`${item.shortLabel}を${selected ? '外す' : '置く'}`} onPress={() => toggleFurniture(item.label)} style={({ pressed }) => [styles.furnitureButton, selected ? styles.furnitureButtonSelected : styles.furnitureButtonIdle, pressed && styles.furniturePressed]}>
                    <Image source={item.source} resizeMode="contain" style={styles.furniturePreview} />
                    <Text style={[styles.furnitureLabel, selected && styles.furnitureLabelSelected]} numberOfLines={1}>{item.shortLabel}</Text>
                    <Text style={[styles.furnitureCaption, selected && styles.furnitureCaptionSelected]} numberOfLines={1}>{selected ? '配置中' : item.caption}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <PaperPanel tone="olive" style={[styles.tipPanel, { bottom: dockInset }]}>
              <Text style={styles.tipEmoji}>✦</Text><View style={styles.tipCopy}><Text style={styles.tipTitle}>家具はドラッグして配置</Text><Text style={styles.tipText} numberOfLines={2}>このモードではモビーを引っ張らず、家具の位置を自由に調整できます。</Text></View>
            </PaperPanel>
          </>
        ) : (
          <View style={styles.peekFooter}><Text style={styles.peekFooterText}>家具を動かしたいときは「模様替え」へ</Text><Pressable accessibilityRole="button" onPress={() => setMode('custom')} style={styles.customShortcut}><Text style={styles.customShortcutText}>内装をカスタム ›</Text></Pressable></View>
        )}
      </View>
    </SafeAreaView>
  );
}

function ModeButton({ active, icon, title, subtitle, onPress }: { active: boolean; icon: string; title: string; subtitle: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${title}モード`} onPress={onPress} style={({ pressed }) => [styles.modeButton, active && styles.modeButtonActive, pressed && styles.pressed]}><Text style={[styles.modeIcon, active && styles.modeIconActive]}>{icon}</Text><View><Text style={[styles.modeTitle, active && styles.modeTitleActive]}>{title}</Text><Text style={styles.modeSubtitle}>{subtitle}</Text></View></Pressable>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: MobbyColors.paperDeep },
  screen: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', paddingHorizontal: 12, paddingTop: 10, position: 'relative' },
  titlePlaque: { minHeight: 70, paddingVertical: 9 },
  title: { color: MobbyColors.ink, fontSize: 25, lineHeight: 30, fontWeight: '900' },
  subtitle: { color: MobbyColors.muted, fontSize: 11, marginTop: 2 },
  modeBar: { height: 64, flexDirection: 'row', gap: 7, marginTop: 8, zIndex: 8 },
  modeButton: { flex: 1, borderRadius: 17, borderWidth: 1.5, borderColor: '#D7B178', backgroundColor: 'rgba(255,247,226,0.94)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, gap: 8 },
  modeButtonActive: { backgroundColor: '#FFE1D6', borderColor: MobbyColors.coral },
  modeIcon: { color: MobbyColors.muted, fontSize: 22, fontWeight: '900' },
  modeIconActive: { color: MobbyColors.coralDark },
  modeTitle: { color: MobbyColors.ink, fontSize: 14, fontWeight: '900' },
  modeTitleActive: { color: MobbyColors.coralDark },
  modeSubtitle: { color: MobbyColors.muted, fontSize: 9, fontWeight: '700', marginTop: 1 },
  nameRow: { height: 53, flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(240,209,163,0.94)', borderRadius: 16, borderWidth: 1, borderColor: '#D29C5D', paddingHorizontal: 12 },
  nameCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: MobbyColors.woodDark, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  nameLabel: { color: MobbyColors.ink, fontSize: 13, fontWeight: '800', marginTop: 2 },
  nameInput: { width: 160, color: MobbyColors.ink, fontSize: 13, fontWeight: '800', textAlign: 'right', paddingVertical: 2 },
  sceneWrap: { overflow: 'hidden', borderRadius: 20, borderWidth: 1.5, borderColor: '#E1AA84', backgroundColor: '#EFCB96', position: 'relative' },
  sceneWrapPeek: { flex: 1, minHeight: 0, marginTop: 8 },
  sceneWrapCustom: { flex: 1, minHeight: 0, marginTop: 8 },
  sceneOverlay: { position: 'absolute', top: 12, left: 10, right: 10, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', zIndex: 4 },
  sceneOverlayCopy: { maxWidth: '74%', backgroundColor: 'rgba(255,249,235,0.88)', borderRadius: 13, paddingHorizontal: 9, paddingVertical: 6 },
  previewKicker: { color: '#AD7465', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  previewTitle: { color: MobbyColors.ink, fontSize: 14, fontWeight: '900', marginTop: 2 },
  peekHint: { position: 'absolute', left: 14, right: 14, bottom: 18, alignItems: 'center', paddingVertical: 8, borderRadius: 15, backgroundColor: 'rgba(255,249,235,0.88)', borderWidth: 1, borderColor: '#D6A36B' },
  peekHintTitle: { color: MobbyColors.ink, fontSize: 14, fontWeight: '900' },
  peekHintText: { color: MobbyColors.muted, fontSize: 10, fontWeight: '700', marginTop: 2 },
  peekFooter: { height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 7 },
  peekFooterText: { color: MobbyColors.muted, fontSize: 10, fontWeight: '800' },
  customShortcut: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: '#FFE2D6' },
  customShortcutText: { color: MobbyColors.coralDark, fontSize: 10, fontWeight: '900' },
  sectionHeader: { position: 'absolute', left: 12, right: 12, zIndex: 7, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 6, borderRadius: 14, backgroundColor: 'rgba(255,244,221,0.92)' },
  sectionKicker: { color: MobbyColors.woodDark, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  sectionTitle: { color: MobbyColors.ink, fontSize: 16, fontWeight: '900', marginTop: 1 },
  counter: { color: MobbyColors.oliveDark, fontSize: 12, fontWeight: '900' },
  furnitureScroll: { position: 'absolute', left: 12, right: 12, zIndex: 7, flexGrow: 0, flexShrink: 0, height: 89, borderRadius: 15, backgroundColor: 'rgba(255,249,235,0.88)' },
  furnitureRow: { gap: 8, paddingVertical: 3, paddingRight: 8 },
  furnitureButton: { width: 105, height: 83, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1.5, paddingHorizontal: 6 },
  furnitureButtonIdle: { backgroundColor: MobbyColors.paper, borderColor: '#D6A36B' },
  furnitureButtonSelected: { backgroundColor: MobbyColors.olive, borderColor: MobbyColors.oliveDark },
  furniturePressed: { transform: [{ translateY: 2 }], opacity: 0.86 },
  furniturePreview: { width: 72, height: 43 },
  furnitureLabel: { color: MobbyColors.ink, fontSize: 11, fontWeight: '900', marginTop: 2 },
  furnitureLabelSelected: { color: MobbyColors.white },
  furnitureCaption: { color: MobbyColors.muted, fontSize: 8, marginTop: 2 },
  furnitureCaptionSelected: { color: '#ECF3DD' },
  tipPanel: { position: 'absolute', left: 12, right: 12, zIndex: 7, minHeight: 50, flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 11, borderRadius: 16, marginTop: 7 },
  tipEmoji: { fontSize: 22, marginRight: 9 },
  tipCopy: { flex: 1, minWidth: 0 },
  tipTitle: { color: MobbyColors.oliveDark, fontSize: 12, fontWeight: '900' },
  tipText: { color: '#71815D', fontSize: 9, lineHeight: 14, marginTop: 2 },
  pressed: { opacity: 0.78, transform: [{ translateY: 1 }] },
});
