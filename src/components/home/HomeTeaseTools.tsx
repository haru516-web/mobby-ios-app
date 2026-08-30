import { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MobbyAssetButton, MobbyAssetCloseButton, MobbyAssetSurface } from '@/components/mobby-ui';
import {
  GACHA_TOOL_REWARDS,
  type GachaStyleNumber,
  type GachaToolKind,
  type GachaToolReward,
} from '@/data/gachaCatalog';
import {
  createInitialGachaState,
  getGachaToolCount,
  loadGachaState,
  subscribeGachaState,
  type GachaInventoryState,
} from '@/game/gachaStorage';
import { Text } from '@/ui/layout/visualPrimitives';

export type HomeTeaseToolSelection = {
  kind: GachaToolKind;
  styleNumber: GachaStyleNumber;
  source: GachaToolReward['previewImage'];
  name: string;
};

export function HomeTeaseTools({ disabled = false, onUse }: {
  disabled?: boolean;
  onUse: (selection: HomeTeaseToolSelection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [inventory, setInventory] = useState<GachaInventoryState>(() => createInitialGachaState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadGachaState().then((state) => {
      if (!cancelled) setInventory(state);
    }).catch(() => undefined).finally(() => {
      if (!cancelled) setHydrated(true);
    });
    const unsubscribe = subscribeGachaState((state) => {
      if (!cancelled) setInventory(state);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const ownedCount = useMemo(() => GACHA_TOOL_REWARDS.reduce(
    (total, reward) => total + Number(getGachaToolCount(inventory, reward.toolKind, reward.styleNumber) > 0),
    0,
  ), [inventory]);

  const handleUseTool = (reward: GachaToolReward) => {
    if (getGachaToolCount(inventory, reward.toolKind, reward.styleNumber) <= 0) return;
    setOpen(false);
    onUse({ kind: reward.toolKind, styleNumber: reward.styleNumber, source: reward.previewImage, name: reward.name });
  };

  return <>
    <MobbyAssetButton
      accessibilityLabel={`いじめる道具を選ぶ。所持${ownedCount}種類`}
      accessibilityState={{ expanded: open }}
      disabled={disabled}
      pointerEvents={disabled ? 'none' : 'auto'}
      onPress={() => setOpen(true)}
      tone="cream"
      style={styles.openButton}
      contentStyle={styles.openButtonContent}
    >
      <Text style={styles.openButtonTitle}>道具</Text>
      <Text style={styles.openButtonCaption}>で遊ぶ</Text>
    </MobbyAssetButton>
    <Modal animationType="fade" onRequestClose={() => setOpen(false)} presentationStyle="overFullScreen" transparent visible={open}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="道具選択を閉じる" onPress={() => setOpen(false)} style={styles.backdrop} />
        <MobbyAssetSurface
          accessibilityViewIsModal
          variant="modalPortrait"
          style={styles.panel}
          contentStyle={styles.panelContent}
        >
          <View style={styles.headingRow}>
            <View style={styles.headingCopy}>
              <Text accessibilityRole="header" style={styles.title}>何で遊ぶ？</Text>
            </View>
            <MobbyAssetCloseButton accessibilityLabel="道具選択を閉じる" onPress={() => setOpen(false)} style={styles.close}>
              <Text style={styles.closeText}>×</Text>
            </MobbyAssetCloseButton>
          </View>
          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator>
            {GACHA_TOOL_REWARDS.map((reward) => {
              const count = getGachaToolCount(inventory, reward.toolKind, reward.styleNumber);
              const owned = count > 0;
              return <Pressable
                accessibilityLabel={`${reward.name}${owned ? `、所持${count}個` : '、未所持。ガチャで入手できます'}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: !owned }}
                disabled={!owned}
                key={reward.id}
                onPress={() => handleUseTool(reward)}
                style={({ pressed }) => [styles.tool, !owned && styles.toolLocked, pressed && styles.toolPressed]}
              >
                <Image accessible={false} contentFit="contain" source={reward.previewImage} style={[styles.toolImage, !owned && styles.toolImageLocked]} />
                {!owned ? <View pointerEvents="none" style={styles.lockedCover}><Text style={styles.lock}>🔒</Text></View> : null}
                <Text numberOfLines={2} style={styles.toolName}>{reward.name}</Text>
                <Text style={styles.toolMeta}>{reward.toolKind === 'poke' ? 'へこむ' : 'つぶれる'}{owned ? ` · ×${count}` : ''}</Text>
              </Pressable>;
            })}
          </ScrollView>
          {!hydrated ? <Text accessibilityLiveRegion="polite" style={styles.message}>所持道具を確認中…</Text> : ownedCount === 0 ? <Text style={styles.message}>ガチャで道具を手に入れると、ここから使えます</Text> : null}
        </MobbyAssetSurface>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  // Keep this above the character picker control. The former top: 74
  // overlapped that button on both compact and regular home layouts, so the
  // higher-z character picker intercepted every tool-button tap.
  openButton: { position: 'absolute', left: -68, top: 12, width: 68, height: 52, zIndex: 24 },
  openButtonContent: { minHeight: 52, paddingHorizontal: 5, paddingVertical: 5 },
  openButtonTitle: { color: '#6A495F', fontSize: 11, lineHeight: 13, fontWeight: '900' },
  openButtonCaption: { color: '#A05E70', fontSize: 8, lineHeight: 10, fontWeight: '900' },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 28 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(37,24,38,0.46)' },
  panel: { width: '100%', maxWidth: 410, height: '82%', maxHeight: 670, overflow: 'hidden' },
  panelContent: { flex: 1, minHeight: 0, paddingHorizontal: 27, paddingTop: 26, paddingBottom: 22 },
  headingRow: { minHeight: 75, flexDirection: 'row', gap: 8 },
  headingCopy: { flex: 1, minWidth: 0 },
  title: { color: '#593C5D', fontSize: 22, lineHeight: 28, fontWeight: '900' },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#7E4C60', fontSize: 29, lineHeight: 31, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, paddingVertical: 10 },
  tool: { width: '48%', minHeight: 158, alignItems: 'center', borderRadius: 19, paddingHorizontal: 8, paddingVertical: 8, borderWidth: 2, borderColor: 'rgba(184,103,121,0.3)', backgroundColor: 'rgba(255,248,234,0.72)' },
  toolLocked: { opacity: 0.55, borderColor: 'rgba(99,85,99,0.2)' },
  toolPressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  toolImage: { width: 105, height: 105 },
  toolImageLocked: { tintColor: '#28232C', opacity: 0.48 },
  lockedCover: { position: 'absolute', top: 38, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,248,234,0.84)' },
  lock: { fontSize: 17, lineHeight: 21 },
  toolName: { minHeight: 28, color: '#60455A', fontSize: 10, lineHeight: 14, fontWeight: '900', textAlign: 'center' },
  toolMeta: { color: '#A2596B', fontSize: 8, lineHeight: 11, fontWeight: '900', marginTop: 2 },
  message: { color: '#7E6472', fontSize: 10, lineHeight: 14, fontWeight: '800', textAlign: 'center', paddingTop: 8 },
});
