import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, ImageBackground, ScrollView, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Text } from '@/ui/layout/visualPrimitives';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  COLLECTIBLE_VARIANTS,
  ITEMS,
  collectibleImage,
  collectibleName,
  collectibleVariantLabel,
  ownedCollectibleCount,
  type CollectibleVariant,
} from '@/data/collectibles';
import { useMobbyAppShell } from '@/state/MobbyAppShell';
import { MobbyAssetButton, MobbyAssetSelectable, MobbyAssetSurface } from '@/components/mobby-ui';

const TRADE_BOARD = require('../../assets/backgrounds/trade-exchange-board.png');
const QR_PATTERN = [
  '1111111010101111111', '1000001011101000001', '1011101010101011101',
  '1011101001101011101', '1011101010101011101', '1000001011101000001',
  '1111111010101111111', '0000000011100000000', '1101011101011010111',
  '0011100011100101100', '1110111110111010101', '0101000101010111010',
  '1111111011011010101', '1000001000110011010', '1011101011011110111',
  '1011101001100011100', '1011101010111110101', '1000001011000101010',
  '1111111010111010111',
] as const;

function QrCode() {
  return <View accessibilityLabel="交換用QRコード" accessibilityRole="image" style={styles.qr}>
    {QR_PATTERN.map((row, rowIndex) => <View key={rowIndex} style={styles.qrRow}>
      {row.split('').map((cell, columnIndex) => <View key={columnIndex} style={[styles.qrCell, cell === '1' && styles.qrCellOn]} />)}
    </View>)}
  </View>;
}

export function TradeScreen() {
  const { collectibleInventory, isHydrated, reduceMotion } = useMobbyAppShell();
  const focused = useIsFocused();
  const ownedOptions = useMemo(() => COLLECTIBLE_VARIANTS.flatMap((variant) => ITEMS
    .filter((item) => ownedCollectibleCount(collectibleInventory, item.id, variant) > 0)
    .map((item) => ({ item, variant, count: ownedCollectibleCount(collectibleInventory, item.id, variant) }))), [collectibleInventory]);
  const [variant, setVariant] = useState<CollectibleVariant>('key-normal');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const boardDrop = useRef(new Animated.Value(0)).current;
  const rowSwap = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!focused) return undefined;
    boardDrop.stopAnimation();
    rowSwap.stopAnimation();
    if (reduceMotion) {
      boardDrop.setValue(0.82);
      rowSwap.setValue(0.78);
    } else {
      boardDrop.setValue(0);
      rowSwap.setValue(0);
    }
    const useNativeDriver = typeof document === 'undefined';
    const animation = reduceMotion
      ? Animated.parallel([
        Animated.timing(boardDrop, { toValue: 1, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver }),
        Animated.timing(rowSwap, { toValue: 1, duration: 180, easing: Easing.inOut(Easing.cubic), useNativeDriver }),
      ])
      : Animated.parallel([
        Animated.spring(boardDrop, { toValue: 1, speed: 7, bounciness: 6, useNativeDriver }),
        Animated.timing(rowSwap, { toValue: 1, duration: 360, easing: Easing.inOut(Easing.cubic), useNativeDriver }),
      ]);
    animation.start();
    return () => animation.stop();
  }, [boardDrop, focused, reduceMotion, rowSwap]);
  const filtered = ownedOptions.filter((option) => option.variant === variant);
  const selected = ownedOptions.find((option) => `${option.item.id}:${option.variant}` === selectedKey) ?? ownedOptions[0];
  const boardDropY = boardDrop.interpolate({ inputRange: [0, 0.78, 1], outputRange: [-360, 12, 0] });
  const boardDropScale = boardDrop.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
  const upperRowX = rowSwap.interpolate({ inputRange: [0, 1], outputRange: [-82, 0] });
  const upperRowY = rowSwap.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] });
  const lowerRowX = rowSwap.interpolate({ inputRange: [0, 1], outputRange: [82, 0] });
  const lowerRowY = rowSwap.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const rowScale = rowSwap.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });

  if (pickerOpen) return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
    <View style={styles.pickerHeader}><Text accessibilityRole="header" style={styles.pickerTitle}>交換する子を選ぶ</Text></View>
    <View accessibilityRole="tablist" accessibilityLabel="交換グッズの種類" style={styles.tabs}>{COLLECTIBLE_VARIANTS.map((value) => <MobbyAssetSelectable key={value} accessibilityRole="tab" accessibilityLabel={collectibleVariantLabel(value)} selected={value === variant} onPress={() => setVariant(value)} style={styles.variantTab} contentStyle={styles.variantTabContent}><Text style={[styles.variantText, value === variant && styles.variantTextActive]}>{collectibleVariantLabel(value)}</Text></MobbyAssetSelectable>)}</View>
    <ScrollView contentContainerStyle={styles.grid}>
      {filtered.map((option) => { const key = `${option.item.id}:${option.variant}`; return <MobbyAssetSelectable key={key} accessibilityRole="radio" accessibilityLabel={`${collectibleName(option.item, option.variant)}、${option.count}個`} selected={selectedKey === key} onPress={() => setSelectedKey(key)} style={styles.option} contentStyle={styles.optionContent}>
        <Image source={collectibleImage(option.item, option.variant)} resizeMode="contain" style={styles.optionImage} />
        <Text numberOfLines={2} style={styles.optionName}>{collectibleName(option.item, option.variant)}</Text><Text style={styles.count}>× {option.count}</Text>
      </MobbyAssetSelectable>; })}
      {isHydrated && filtered.length === 0 ? <Text style={styles.empty}>この種類の交換できるグッズはまだありません</Text> : null}
    </ScrollView>
    <View style={styles.actions}><MobbyAssetButton accessibilityLabel="交換画面に戻る" tone="cream" onPress={() => setPickerOpen(false)} style={styles.actionButton}><Text style={styles.secondaryText}>戻る</Text></MobbyAssetButton><MobbyAssetButton accessibilityLabel="このグッズに決定" disabled={!selectedKey} onPress={() => setPickerOpen(false)} style={styles.actionButton}><Text style={styles.primaryText}>このグッズに決定</Text></MobbyAssetButton></View>
  </SafeAreaView>;

  return <SafeAreaView edges={['left', 'right']} style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content}>
      <Animated.View style={[styles.boardMotion, { transform: [{ translateY: boardDropY }, { scale: boardDropScale }] }]}>
      <ImageBackground source={TRADE_BOARD} resizeMode="stretch" style={styles.board} imageStyle={styles.boardImage}>
        <Text accessibilityRole="header" style={styles.title}>モビー交換会</Text>
        <Animated.View style={[styles.tradeRowMotion, { transform: [{ translateX: upperRowX }, { translateY: upperRowY }, { scale: rowScale }] }]}>
          <MobbyAssetSurface style={styles.card} contentStyle={styles.cardContent}><Text style={styles.sectionTitle}>QRを見せあう</Text>{qrVisible ? <QrCode /> : <MobbyAssetSurface variant="paper" style={styles.qrPlaceholder} contentStyle={styles.qrPlaceholderContent}><Text style={styles.qrIcon}>⇄</Text><Text style={styles.help}>ここに交換用QRが現れます</Text></MobbyAssetSurface>}<MobbyAssetButton accessibilityLabel={qrVisible ? '交換用QRコードを閉じる' : '交換用QRコードを表示'} accessibilityState={{ expanded: qrVisible }} onPress={() => setQrVisible((value) => !value)}><Text style={styles.primaryText}>{qrVisible ? 'QRを閉じる' : 'QRを表示'}</Text></MobbyAssetButton></MobbyAssetSurface>
        </Animated.View>
        <Animated.View style={[styles.tradeRowMotion, { transform: [{ translateX: lowerRowX }, { translateY: lowerRowY }, { scale: rowScale }] }]}>
          <MobbyAssetSurface style={styles.card} contentStyle={styles.cardContent}><Text style={styles.sectionTitle}>交換する子を選ぶ</Text>{selected ? <View style={styles.selected}><Image source={collectibleImage(selected.item, selected.variant)} resizeMode="contain" style={styles.selectedImage} /><View style={styles.selectedCopy}><Text style={styles.selectedName}>{collectibleName(selected.item, selected.variant)}</Text><Text style={styles.help}>{collectibleVariantLabel(selected.variant)}　所持 {selected.count}</Text></View></View> : <Text style={styles.empty}>{isHydrated ? '交換できるグッズはまだありません' : 'グッズを確認しています'}</Text>}<MobbyAssetButton accessibilityLabel="交換するグッズを選び直す" tone="cream" disabled={!ownedOptions.length} onPress={() => { setVariant(selected?.variant ?? 'key-normal'); setSelectedKey(selected ? `${selected.item.id}:${selected.variant}` : null); setPickerOpen(true); }}><Text style={styles.secondaryText}>交換する子を選び直す</Text></MobbyAssetButton></MobbyAssetSurface>
        </Animated.View>
      </ImageBackground>
      </Animated.View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff7e9' }, content: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 10, paddingBottom: 24 },
  boardMotion: { width: '100%' }, tradeRowMotion: { width: '100%' },
  board: { width: '100%', minHeight: 690, paddingHorizontal: '9%', paddingTop: 38, paddingBottom: 46, gap: 18 }, boardImage: { borderRadius: 24 },
  title: { color: '#704335', fontSize: 26, lineHeight: 34, fontWeight: '900', textAlign: 'center' }, card: { minHeight: 180 }, cardContent: { padding: 20, gap: 12 },
  sectionTitle: { color: '#5d3d33', fontSize: 18, lineHeight: 24, fontWeight: '900', textAlign: 'center' }, help: { color: '#735c52', fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  qrPlaceholder: { height: 164 }, qrPlaceholderContent: { minHeight: 164, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12 }, qrIcon: { color: '#c55d69', fontSize: 48, fontWeight: '900' },
  qr: { width: 171, height: 171, padding: 5, alignSelf: 'center', backgroundColor: '#fff' }, qrRow: { flex: 1, flexDirection: 'row' }, qrCell: { flex: 1, backgroundColor: '#fff' }, qrCellOn: { backgroundColor: '#332825' },
  primary: { minHeight: 48, borderRadius: 16, overflow: 'hidden' }, primaryText: { color: '#fff', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  secondary: { minHeight: 48, borderRadius: 16, overflow: 'hidden' }, secondaryText: { color: '#72483b', fontSize: 15, fontWeight: '900', textAlign: 'center' }, disabled: { opacity: 0.45 },
  selected: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 12 }, selectedImage: { width: 92, height: 92 }, selectedCopy: { flex: 1, gap: 4 }, selectedName: { color: '#51372f', fontSize: 16, lineHeight: 22, fontWeight: '900' },
  pickerHeader: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }, pickerTitle: { color: '#51372f', fontSize: 25, lineHeight: 32, fontWeight: '900', textAlign: 'center' }, tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingBottom: 10 }, variantTab: { flex: 1, minHeight: 52 }, variantTabContent: { minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }, variantText: { color: '#6c5046', fontSize: 12, fontWeight: '800', textAlign: 'center' }, variantTextActive: { color: '#fff' },
  grid: { width: '100%', maxWidth: 520, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 10 }, option: { width: '31%', minWidth: 96, minHeight: 160, flexGrow: 1, maxWidth: 158 }, optionContent: { minHeight: 160, alignItems: 'center', justifyContent: 'center', padding: 12 }, optionImage: { width: 90, height: 90 }, optionName: { color: '#51372f', fontSize: 12, lineHeight: 16, fontWeight: '800', textAlign: 'center' }, count: { color: '#9a6556', fontSize: 12, fontWeight: '900' }, empty: { flex: 1, color: '#735c52', fontSize: 15, lineHeight: 22, fontWeight: '700', textAlign: 'center', padding: 20 }, actions: { flexDirection: 'row', gap: 10, padding: 12 }, actionButton: { flex: 1 },
});
