import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from '@/ui/layout/visualPrimitives';
import { router } from 'expo-router';
import { SheetScreen, sheetStyles as s } from '@/components/ShellSheet';
import { useMobbyAppShell } from '@/state/MobbyAppShell';
import { MobbyAssetButton, MobbyAssetSelectable } from '@/components/mobby-ui';

const MOBBY_PICKER_BACKGROUND = require('../../assets/backgrounds/mobby-picker-background-v1.png');
const BACK_BUTTON = require('../../assets/generated-ui/button-back-v1.png');

export default function MobbyPickerRoute() {
  const shell = useMobbyAppShell();
  const [draft, setDraft] = useState(shell.favoriteId);
  useEffect(() => { if (shell.isHydrated) setDraft(shell.favoriteId); }, [shell.favoriteId, shell.isHydrated]);
  const done = () => { if (shell.setFavorite(draft)) router.back(); };
  return <SheetScreen title="メインモビー" backgroundSource={MOBBY_PICKER_BACKGROUND} closeImageSource={BACK_BUTTON} footer={<View style={styles.actions}><MobbyAssetButton accessibilityLabel="メインモビーの選択をキャンセル" tone="cream" onPress={() => router.back()} style={styles.done}><Text style={styles.cancelText}>キャンセル</Text></MobbyAssetButton><MobbyAssetButton accessibilityLabel="メインモビーの選択を完了" disabled={!shell.isHydrated || draft === shell.favoriteId} onPress={done} style={styles.done}><Text style={s.actionText}>完了</Text></MobbyAssetButton></View>}>
    <Text style={s.body}>お部屋でいっしょに過ごすモビーを選んでね。</Text>
    <View style={styles.grid}>{shell.characters.map((item) => <MobbyAssetSelectable key={item.id} accessibilityLabel={`${item.name}${item.owned ? '' : '、まだお迎えしていません'}`} selected={draft === item.id} disabled={!item.owned || !shell.isHydrated} onPress={() => setDraft(item.id)} style={styles.option} contentStyle={styles.optionContent}><Image source={item.image} resizeMode="contain" style={styles.image}/><Text style={styles.name} numberOfLines={1}>{item.name}</Text>{!item.owned ? <Text numberOfLines={1} ellipsizeMode="tail" style={[s.secondary, styles.unowned]}>まだお迎えしていません</Text> : null}</MobbyAssetSelectable>)}</View>
  </SheetScreen>;
}
const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12 }, option: { width: '47%', aspectRatio: 1, overflow: 'hidden' }, optionContent: { flex: 1, minHeight: 0, padding: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, image: { width: 72, height: 72 }, name: { color: '#553B59', fontSize: 16, lineHeight: 22, fontWeight: '800', textAlign: 'center' }, unowned: { fontSize: 11, lineHeight: 15, marginTop: 2 }, actions: { flexDirection: 'row', gap: 12 }, cancelText: { color: '#A4485A', fontSize: 16, fontWeight: '700' }, done: { flex: 1 } });
