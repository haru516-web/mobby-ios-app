import { useMemo } from 'react';
import { Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { getMobby, type MobbyId } from '@/data/mobies';
import { REACTION_MOBBY_IDS, REACTION_STICKERS } from '@/data/reactionCollection';
import { Text } from '@/ui/layout/visualPrimitives';

const REACTION_COLLECTION_POPUP_BACKGROUND = require('../../../assets/generated-ui/popup-reaction-collection-v1.png');
const REACTION_COLLECTION_PANEL_ASPECT_RATIO = 957 / 1462;
const REACTION_COLLECTION_BACKGROUND_SCALE = 1536 / 1462;

export function ReactionCollectionPopover({ selectedMobbyId, collectedIds, onSelectMobby, onClose }: {
  selectedMobbyId: MobbyId;
  collectedIds: readonly string[];
  onSelectMobby: (id: MobbyId) => void;
  onClose: () => void;
}) {
  const mobby = getMobby(selectedMobbyId);
  const stickers = REACTION_STICKERS[selectedMobbyId] ?? [];
  const collected = useMemo(() => new Set(collectedIds), [collectedIds]);
  const collectedCount = stickers.reduce((count, sticker) => count + Number(collected.has(sticker.id)), 0);
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const availableHeight = Math.max(0, Math.min(viewportHeight * 0.82, viewportHeight - 48, 680));
  const panelWidth = Math.max(0, Math.min(viewportWidth - 32, 410, availableHeight * REACTION_COLLECTION_PANEL_ASPECT_RATIO));
  const panelHeight = panelWidth / REACTION_COLLECTION_PANEL_ASPECT_RATIO;
  return <Modal animationType="none" onRequestClose={onClose} presentationStyle="overFullScreen" transparent visible>
    <View pointerEvents="box-none" style={styles.overlay}>
      <Pressable accessibilityLabel="リアクション図鑑を閉じる" accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
      <View accessibilityViewIsModal accessibilityLabel={`${mobby.name}のリアクション図鑑`} style={[styles.panel, { width: panelWidth, height: panelHeight }]}>
      <ImageBackground accessible={false} imageStyle={[styles.panelImage, styles.backgroundImage]} resizeMode="cover" source={REACTION_COLLECTION_POPUP_BACKGROUND} style={styles.panelBackground}>
      <View style={styles.panelContent}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>REACTION STAMPS</Text>
          <Text accessibilityRole="header" style={styles.title}>リアクション図鑑</Text>
          <Text style={styles.subtitle}>{mobby.name}のリアクションを集めよう ・ {collectedCount}/{stickers.length}</Text>
        </View>
        <Pressable accessibilityLabel="リアクション図鑑を閉じる" accessibilityRole="button" hitSlop={8} onPress={onClose} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} style={styles.tabsScroll}>
        {REACTION_MOBBY_IDS.map((id) => {
          const tabMobby = getMobby(id);
          const selected = id === selectedMobbyId;
          return <Pressable
            accessibilityLabel={`${tabMobby.name}のリアクション`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={id}
            onPress={() => onSelectMobby(id)}
            style={({ pressed }) => [styles.tab, selected && styles.tabSelected, pressed && styles.pressed]}
          >
            <Image accessible={false} source={tabMobby.image} resizeMode="contain" style={styles.tabImage} />
            <Text numberOfLines={1} style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{tabMobby.name}</Text>
            {selected ? <View pointerEvents="none" style={styles.tabIndicator} /> : null}
          </Pressable>;
        })}
      </ScrollView>
      <ScrollView
        contentContainerStyle={styles.stickerScrollContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        style={styles.stickerScroll}
      >
        <View style={styles.grid}>
          {stickers.map((sticker) => {
            const owned = collected.has(sticker.id);
            return <View
              key={sticker.id}
              accessible
              accessibilityLabel={owned ? sticker.accessibilityLabel : '未収集のリアクション'}
              style={[styles.sticker, !owned && styles.stickerMissing]}
            >
              {owned
                ? <Image accessible={false} source={sticker.source} resizeMode="contain" style={styles.stickerImage} />
                : <>
                  <Image accessible={false} source={sticker.source} resizeMode="contain" tintColor="#514953" style={styles.stickerGhost} />
                  <View pointerEvents="none" style={styles.stickerHoleMark}><Text style={styles.stickerQuestion}>?</Text></View>
                </>}
            </View>;
          })}
        </View>
      </ScrollView>
      <Text style={styles.hint}>ほっぺを引っぱると、新しいリアクションが増えるよ</Text>
      </View>
      </ImageBackground>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, zIndex: 70, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 24 },
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
  backgroundImage: { transform: [{ scale: REACTION_COLLECTION_BACKGROUND_SCALE }] },
  panelContent: { flex: 1, minHeight: 0, zIndex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 20, paddingHorizontal: 30, paddingBottom: 10 },
  headerCopy: { flex: 1 },
  eyebrow: { color: '#A45D68', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: '#593C5D', fontSize: 22, fontWeight: '900', marginTop: 2 },
  subtitle: { color: '#8A6C79', fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 3 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#7E4C60', fontSize: 30, lineHeight: 32, fontWeight: '900' },
  tabsScroll: { flexGrow: 0, marginHorizontal: 26 },
  tabs: { gap: 8, paddingHorizontal: 4, paddingBottom: 9 },
  tab: { width: 58, minHeight: 62, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, paddingBottom: 5 },
  tabSelected: { transform: [{ scale: 1.04 }] },
  tabImage: { width: 38, height: 38 },
  tabLabel: { color: '#896D78', fontSize: 10, fontWeight: '800', marginTop: 2 },
  tabLabelSelected: { color: '#633D5D', fontWeight: '900' },
  tabIndicator: { position: 'absolute', bottom: 0, width: 28, height: 3, borderRadius: 2, backgroundColor: '#ED8A86' },
  stickerScroll: { flex: 1, minHeight: 0, marginTop: 2, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(89,60,93,0.10)' },
  stickerScrollContent: { paddingHorizontal: 30, paddingTop: 10, paddingBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 7 },
  sticker: { width: '22%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', overflow: 'visible', backgroundColor: 'transparent' },
  stickerMissing: { opacity: 0.64 },
  stickerImage: { width: '98%', height: '98%' },
  stickerGhost: { width: '96%', height: '96%', opacity: 0.16 },
  stickerHoleMark: { position: 'absolute', width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  stickerQuestion: { color: '#756A73', fontSize: 20, lineHeight: 22, fontWeight: '900' },
  hint: { color: '#987982', fontSize: 11, lineHeight: 16, fontWeight: '700', textAlign: 'center', paddingHorizontal: 30, paddingTop: 9, paddingBottom: 15 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
