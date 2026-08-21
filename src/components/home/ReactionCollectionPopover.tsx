import { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getMobby, type MobbyId } from '@/data/mobies';
import { REACTION_MOBBY_IDS, REACTION_STICKERS } from '@/data/reactionCollection';
import { MobbyAssetButton, MobbyAssetSelectable, MobbyAssetSurface } from '@/components/mobby-ui';
import { Text } from '@/ui/layout/visualPrimitives';

export function ReactionCollectionPopover({ selectedMobbyId, collectedIds, onSelectMobby, onClose }: {
  selectedMobbyId: MobbyId;
  collectedIds: readonly string[];
  onSelectMobby: (id: MobbyId) => void;
  onClose: () => void;
}) {
  const mobby = getMobby(selectedMobbyId);
  const stickers = REACTION_STICKERS[selectedMobbyId] ?? [];
  const collected = useMemo(() => new Set(collectedIds), [collectedIds]);
  return <View pointerEvents="box-none" style={styles.overlay}>
    <Pressable accessibilityLabel="リアクション図鑑を閉じる" accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
    <MobbyAssetSurface variant="modalPortrait" accessibilityViewIsModal accessibilityLabel={`${mobby.name}のリアクション図鑑`} style={styles.panel} contentStyle={styles.panelContent}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>REACTION STAMPS</Text>
          <Text style={styles.title}>リアクション図鑑</Text>
          <Text style={styles.subtitle}>{mobby.name}のリアクションを集めよう</Text>
        </View>
        <MobbyAssetButton accessibilityLabel="リアクション図鑑を閉じる" tone="cream" onPress={onClose} style={styles.close} contentStyle={styles.closeContent}>
          <Text style={styles.closeText}>×</Text>
        </MobbyAssetButton>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} style={styles.tabsScroll}>
        {REACTION_MOBBY_IDS.map((id) => {
          const tabMobby = getMobby(id);
          const selected = id === selectedMobbyId;
          return <MobbyAssetSelectable
            accessibilityLabel={`${tabMobby.name}のリアクション`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={id}
            onPress={() => onSelectMobby(id)}
            selected={selected}
            variant="tile"
            style={styles.tab}
            contentStyle={styles.tabContent}
          >
            <Image accessible={false} source={tabMobby.image} resizeMode="contain" style={styles.tabImage} />
            <Text numberOfLines={1} style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{tabMobby.name}</Text>
          </MobbyAssetSelectable>;
        })}
      </ScrollView>
      <View style={styles.grid}>
        {stickers.map((sticker) => {
          const owned = collected.has(sticker.id);
          return <MobbyAssetSurface
            key={sticker.id}
            accessible
            accessibilityLabel={owned ? sticker.accessibilityLabel : '未収集のリアクション'}
            variant={owned ? 'tileSelected' : 'tile'}
            style={[styles.sticker, !owned && styles.stickerMissing]}
            contentStyle={styles.stickerContent}
          >
            {owned
              ? <Image accessible={false} source={sticker.source} resizeMode="contain" style={styles.stickerImage} />
              : <>
                <Image accessible={false} source={sticker.source} resizeMode="contain" style={styles.stickerGhost} />
                <View pointerEvents="none" style={styles.stickerHoleMark}><Text style={styles.stickerQuestion}>?</Text></View>
              </>}
          </MobbyAssetSurface>;
        })}
      </View>
      <Text style={styles.hint}>ほっぺを引っぱると、新しいリアクションが増えるよ</Text>
    </MobbyAssetSurface>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 70, justifyContent: 'center', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(39,25,42,0.48)' },
  panel: { width: '92%', maxWidth: 410, maxHeight: '86%', overflow: 'hidden' },
  panelContent: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  headerCopy: { flex: 1 },
  eyebrow: { color: '#A45D68', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: '#593C5D', fontSize: 22, fontWeight: '900', marginTop: 2 },
  subtitle: { color: '#8A6C79', fontSize: 12, fontWeight: '700', marginTop: 3 },
  close: { width: 44, height: 44, minHeight: 44 },
  closeContent: { minHeight: 44, paddingHorizontal: 0, paddingVertical: 0 },
  closeText: { color: '#7E4C60', fontSize: 26, lineHeight: 28, fontWeight: '900' },
  tabsScroll: { flexGrow: 0, marginHorizontal: -4 },
  tabs: { gap: 6, paddingHorizontal: 4, paddingBottom: 10 },
  tab: { width: 64, minHeight: 62 },
  tabContent: { minHeight: 62, paddingHorizontal: 4, paddingVertical: 5, alignItems: 'center', justifyContent: 'center' },
  tabImage: { width: 34, height: 34 },
  tabLabel: { color: '#896D78', fontSize: 10, fontWeight: '800', marginTop: 2 },
  tabLabelSelected: { color: '#633D5D', fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, paddingTop: 4 },
  sticker: { width: '23.5%', aspectRatio: 1, overflow: 'hidden' },
  stickerContent: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  stickerMissing: { opacity: 0.72 },
  stickerImage: { width: '92%', height: '92%' },
  stickerGhost: { width: '90%', height: '90%', opacity: 0.16, tintColor: '#514953' },
  stickerHoleMark: { position: 'absolute', width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(86,76,84,0.2)', alignItems: 'center', justifyContent: 'center' },
  stickerQuestion: { color: '#756A73', fontSize: 16, fontWeight: '900' },
  hint: { color: '#987982', fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
