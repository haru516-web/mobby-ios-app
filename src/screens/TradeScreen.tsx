import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, ImageBackground, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import { MobbyAssetButton } from '@/components/mobby-ui';
import { BlackStarToggle } from '@/components/characters';
import { useGachaTheme } from '@/theme/GachaThemeContext';
import {
  COLLECTIBLE_VARIANTS,
  ITEMS,
  collectibleImage,
  collectibleName,
  collectibleVariantLabel,
  itemCharacterName,
  ownedCollectibleCount,
  type CollectibleVariant,
} from '@/data/collectibles';
import { Text } from '@/ui/layout/visualPrimitives';

const TRADE_BOARD = require('../../assets/backgrounds/trade-exchange-board-transparent-v1.png');
const TRADE_ICON = require('../../assets/home-ui/icons/nav-trade-v1.png');
const RESELECT_BUTTON = require('../../assets/generated-ui/button-exchange-reselect-v1.png');

const QR_PATTERN = [
  '1111111010101111111', '1000001011101000001', '1011101010101011101',
  '1011101001101011101', '1011101010101011101', '1000001011101000001',
  '1111111010101111111', '0000000011100000000', '1101011101011010111',
  '0011100011100101100', '1110111110111010101', '0101000101010111010',
  '1111111011011010101', '1000001000110011010', '1011101011011110111',
  '1011101001100011100', '1011101010111110101', '1000001011000101010',
  '1111111010111011111',
] as const;

const BOARD_ASPECT_RATIO = 2 / 3;
const TAB_BAR_CLEARANCE = 78;
const MAX_BOARD_WIDTH = 440;

const shortVariantLabel = (variant: CollectibleVariant) => variant === 'key-normal'
  ? '通常'
  : variant === 'key-small'
    ? 'S'
    : 'ぬい';

function QrCode({ size }: { size: number }) {
  return <View accessibilityLabel="交換用QRコード" accessibilityRole="image" style={[styles.qr, { width: size, height: size }]}>
    {QR_PATTERN.map((row, rowIndex) => <View key={rowIndex} style={styles.qrRow}>
      {row.split('').map((cell, columnIndex) => <View key={columnIndex} style={[styles.qrCell, cell === '1' && styles.qrCellOn]} />)}
    </View>)}
  </View>;
}

type TradeScreenProps = {
  collectibleInventory: Readonly<Record<string, number>>;
  isHydrated: boolean;
  reduceMotion: boolean;
};

export function TradeScreen({ collectibleInventory, isHydrated, reduceMotion }: TradeScreenProps) {
  const { activeTheme } = useGachaTheme();
  const focused = useIsFocused();
  const [stageSize, setStageSize] = useState({ width: MAX_BOARD_WIDTH + 16, height: 760 });
  const [variant, setVariant] = useState<CollectibleVariant>('key-normal');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showBlackStars, setShowBlackStars] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const boardDrop = useRef(new Animated.Value(0)).current;

  const allOwnedOptions = useMemo(() => COLLECTIBLE_VARIANTS.flatMap((candidateVariant) => ITEMS
    .filter((item) => ownedCollectibleCount(collectibleInventory, item.id, candidateVariant) > 0)
    .map((item) => ({
      item,
      variant: candidateVariant,
      count: ownedCollectibleCount(collectibleInventory, item.id, candidateVariant),
    }))), [collectibleInventory]);
  const ownedOptions = allOwnedOptions.filter((option) => option.item.faction === (showBlackStars ? 'kuroboshi' : 'mobby'));
  const filtered = ownedOptions.filter((option) => option.variant === variant);
  const selected = allOwnedOptions.find((option) => `${option.item.id}:${option.variant}` === selectedKey) ?? allOwnedOptions[0];

  const availableWidth = Math.max(1, stageSize.width - 16);
  const availableHeight = Math.max(1, stageSize.height - TAB_BAR_CLEARANCE - 8);
  const boardWidth = Math.min(MAX_BOARD_WIDTH, availableWidth, availableHeight * BOARD_ASPECT_RATIO);
  const boardHeight = boardWidth / BOARD_ASPECT_RATIO;
  const compact = boardWidth < 360;
  const qrSize = Math.round(Math.max(70, Math.min(94, boardWidth * 0.22)));

  useEffect(() => {
    if (!focused) return undefined;
    boardDrop.stopAnimation();
    boardDrop.setValue(reduceMotion ? 0.84 : 0);
    const animation = reduceMotion
      ? Animated.timing(boardDrop, { toValue: 1, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: typeof document === 'undefined' })
      : Animated.spring(boardDrop, { toValue: 1, speed: 8, bounciness: 6, useNativeDriver: typeof document === 'undefined' });
    animation.start();
    return () => animation.stop();
  }, [boardDrop, focused, reduceMotion]);

  const handleStageLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStageSize((current) => current.width === width && current.height === height ? current : { width, height });
  };
  const boardTranslateY = boardDrop.interpolate({ inputRange: [0, 0.78, 1], outputRange: [-260, 9, 0] });
  const boardScale = boardDrop.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });

  const openPicker = () => {
    setShowBlackStars(false);
    const firstMobby = allOwnedOptions.find((option) => option.item.faction !== 'kuroboshi');
    setVariant(firstMobby?.variant ?? 'key-normal');
    setSelectedKey(firstMobby ? `${firstMobby.item.id}:${firstMobby.variant}` : null);
    setPickerOpen(true);
  };

  const selectVariant = (nextVariant: CollectibleVariant) => {
    setVariant(nextVariant);
    setSelectedKey((currentKey) => {
      const currentOption = ownedOptions.find((option) => `${option.item.id}:${option.variant}` === currentKey);
      if (currentOption?.variant === nextVariant) return currentKey;
      const nextOption = ownedOptions.find((option) => option.variant === nextVariant);
      return nextOption ? `${nextOption.item.id}:${nextOption.variant}` : null;
    });
  };

  return <View style={styles.safe}>
    <View onLayout={handleStageLayout} style={styles.stage}>
      <Animated.View style={[styles.boardMotion, {
        width: boardWidth,
        height: boardHeight,
        transform: [{ translateY: boardTranslateY }, { scale: boardScale }],
      }]}>
        <ImageBackground imageStyle={styles.boardImage} source={activeTheme?.assets.card ?? TRADE_BOARD} resizeMode={activeTheme ? 'stretch' : 'contain'} style={styles.board}>
          {pickerOpen ? <>
            <View style={styles.topPanel}>
              <Text style={styles.eyebrow}>CHOOSE YOUR ITEM</Text>
              <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>交換する子を選ぶ</Text>
              <View accessibilityRole="tablist" accessibilityLabel="交換グッズの種類" style={styles.variantTabs}>
                {COLLECTIBLE_VARIANTS.map((value) => <Pressable
                  key={value}
                  accessibilityLabel={collectibleVariantLabel(value)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: value === variant }}
                  onPress={() => selectVariant(value)}
                  style={({ pressed }) => [
                    styles.variantTab,
                    compact && styles.variantTabCompact,
                    value === variant && styles.variantTabSelected,
                    pressed && styles.selectionPressed,
                  ]}
                >
                  <Text style={[styles.variantText, value === variant && styles.variantTextActive]}>{shortVariantLabel(value)}</Text>
                </Pressable>)}
              </View>
              <BlackStarToggle
                active={showBlackStars}
                onChange={(active) => {
                  setShowBlackStars(active);
                  const next = allOwnedOptions.find((option) => option.item.faction === (active ? 'kuroboshi' : 'mobby') && option.variant === variant)
                    ?? allOwnedOptions.find((option) => option.item.faction === (active ? 'kuroboshi' : 'mobby'));
                  if (next) {
                    setVariant(next.variant);
                    setSelectedKey(`${next.item.id}:${next.variant}`);
                  } else setSelectedKey(null);
                }}
                style={styles.blackStarToggle}
                testID="trade-black-star-toggle"
              />
              <Text style={styles.pickerHelp}>横にスライドして、交換するグッズを選んでね</Text>
            </View>
            <View style={styles.bottomPanel}>
              <ScrollView
                accessibilityLabel={`${collectibleVariantLabel(variant)}の所持アイテム`}
                contentContainerStyle={styles.itemRail}
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.itemScroll}
              >
                {filtered.map((option) => {
                  const key = `${option.item.id}:${option.variant}`;
                  const optionSelected = selectedKey === key;
                  return <View key={key} style={styles.optionWrap}>
                    <Pressable
                      accessibilityLabel={`${collectibleName(option.item, option.variant)}、${option.count}個`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: optionSelected }}
                      onPress={() => setSelectedKey(key)}
                      style={({ pressed }) => [
                        styles.optionTile,
                        compact && styles.optionTileCompact,
                        optionSelected && styles.optionTileSelected,
                        pressed && styles.selectionPressed,
                      ]}
                    >
                      <Image source={collectibleImage(option.item, option.variant)} resizeMode="contain" style={[styles.optionImage, compact && styles.optionImageCompact]} />
                      {optionSelected ? <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.optionCheck}>✓</Text> : null}
                    </Pressable>
                    <Text numberOfLines={1} style={styles.optionName}>{itemCharacterName(option.item)}</Text>
                    <Text style={[styles.optionCount, optionSelected && styles.optionCountSelected]}>所持 ×{option.count}</Text>
                  </View>;
                })}
                {isHydrated && filtered.length === 0 ? <View style={styles.emptyRail}><Text style={styles.empty}>この種類の交換できるグッズはまだありません</Text></View> : null}
              </ScrollView>
              <View style={styles.pickerActions}>
                <MobbyAssetButton accessibilityLabel="交換画面に戻る" tone="cream" onPress={() => setPickerOpen(false)} style={styles.actionButton} contentStyle={styles.actionButtonContent}>
                  <Text style={styles.secondaryText}>戻る</Text>
                </MobbyAssetButton>
                <MobbyAssetButton accessibilityLabel="このグッズに決定" disabled={!selectedKey} onPress={() => setPickerOpen(false)} style={styles.actionButton} contentStyle={styles.actionButtonContent}>
                  <Text style={styles.primaryText}>この子に決定</Text>
                </MobbyAssetButton>
              </View>
            </View>
          </> : <>
            <View style={styles.topPanel}>
              <Text style={styles.eyebrow}>MOBBY EXCHANGE</Text>
              <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>モビー交換会</Text>
              <View style={styles.qrArea}>
                <View style={styles.qrVisual}>
                  {qrVisible ? <QrCode size={qrSize} /> : <Image source={TRADE_ICON} resizeMode="contain" style={[styles.tradeIcon, { width: qrSize, height: qrSize }]} />}
                </View>
                <View style={styles.qrCopy}>
                  <Text style={styles.sectionTitle}>QRを見せあう</Text>
                  <Text style={styles.help}>{qrVisible ? '相手にこのコードを見せてね' : '近くの友だちとグッズ交換'}</Text>
                  <MobbyAssetButton
                    accessibilityLabel={qrVisible ? '交換用QRコードを閉じる' : '交換用QRコードを表示'}
                    accessibilityState={{ expanded: qrVisible }}
                    onPress={() => setQrVisible((value) => !value)}
                    style={styles.compactButton}
                    contentStyle={styles.compactButtonContent}
                  >
                    <Text style={styles.primaryText}>{qrVisible ? 'QRを閉じる' : 'QRを表示'}</Text>
                  </MobbyAssetButton>
                </View>
              </View>
            </View>
            <View style={styles.bottomPanel}>
              <Text style={styles.eyebrow}>YOUR ITEM</Text>
              <Text style={styles.sectionTitle}>交換する子</Text>
              {selected ? <View style={styles.selected}>
                <Image source={collectibleImage(selected.item, selected.variant)} resizeMode="contain" style={[styles.selectedImage, compact && styles.selectedImageCompact]} />
                <View style={styles.selectedCopy}>
                  <Text numberOfLines={2} style={[styles.selectedName, compact && styles.selectedNameCompact]}>{collectibleName(selected.item, selected.variant)}</Text>
                  <Text style={styles.selectedMeta}>{collectibleVariantLabel(selected.variant)}</Text>
                  <Text style={styles.selectedCount}>所持 ×{selected.count}</Text>
                </View>
              </View> : <View style={styles.emptySelection}><Text style={styles.empty}>{isHydrated ? '交換できるグッズはまだありません' : 'グッズを確認しています'}</Text></View>}
              <MobbyAssetButton accessibilityLabel="交換するモビーを選び直す" backgroundSource={RESELECT_BUTTON} backgroundResizeMode="stretch" disabled={!allOwnedOptions.length} onPress={openPicker} style={styles.chooseButton} contentStyle={styles.chooseButtonContent}>
                <Text style={styles.secondaryText}>交換するモビーを選び直す</Text>
              </MobbyAssetButton>
            </View>
          </>}
        </ImageBackground>
      </Animated.View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent', overflow: 'hidden' },
  stage: { flex: 1, paddingHorizontal: 8, paddingBottom: TAB_BAR_CLEARANCE, alignItems: 'center', justifyContent: 'center' },
  boardMotion: { position: 'relative', borderRadius: 30, overflow: 'hidden' },
  board: { width: '100%', height: '100%', borderRadius: 30, overflow: 'hidden' },
  boardImage: { borderRadius: 30 },
  topPanel: { position: 'absolute', top: '12.6%', left: '13%', right: '13%', height: '31%', alignItems: 'center', paddingTop: 6 },
  bottomPanel: { position: 'absolute', top: '46.5%', left: '13%', right: '13%', bottom: '7.2%', alignItems: 'center', paddingTop: 8, paddingBottom: 8 },
  eyebrow: { color: '#9D6873', fontSize: 9, lineHeight: 11, fontWeight: '900', letterSpacing: 1.4, textAlign: 'center' },
  title: { color: '#67465E', fontSize: 22, lineHeight: 28, fontWeight: '900', textAlign: 'center' },
  titleCompact: { fontSize: 19, lineHeight: 24 },
  sectionTitle: { color: '#66485D', fontSize: 17, lineHeight: 22, fontWeight: '900', textAlign: 'center' },
  help: { color: '#876C73', fontSize: 10, lineHeight: 14, fontWeight: '800', textAlign: 'center' },
  qrArea: { flex: 1, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 2 },
  qrVisual: { width: '38%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  tradeIcon: { opacity: 0.94 },
  qrCopy: { flex: 1, alignItems: 'stretch', justifyContent: 'center', gap: 3 },
  compactButton: { height: 40, marginTop: 3, overflow: 'hidden' },
  compactButtonContent: { minHeight: 40, paddingHorizontal: 10, paddingVertical: 5 },
  qr: { padding: 4, alignSelf: 'center', backgroundColor: '#FFFDF7', borderWidth: 2, borderColor: '#755365' },
  qrRow: { flex: 1, flexDirection: 'row' },
  qrCell: { flex: 1, backgroundColor: '#FFFDF7' },
  qrCellOn: { backgroundColor: '#332825' },
  selected: { flex: 1, width: '100%', minHeight: 124, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  selectedImage: { width: 128, height: 128 },
  selectedImageCompact: { width: 108, height: 108 },
  selectedCopy: { flex: 1, maxWidth: 168, gap: 3 },
  selectedName: { color: '#5E4058', fontSize: 16, lineHeight: 22, fontWeight: '900', textAlign: 'left' },
  selectedNameCompact: { fontSize: 14, lineHeight: 19 },
  selectedMeta: { color: '#8D6E78', fontSize: 11, lineHeight: 15, fontWeight: '800' },
  selectedCount: { color: '#A55465', fontSize: 13, lineHeight: 18, fontWeight: '900' },
  emptySelection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: '#7C626D', fontSize: 12, lineHeight: 18, fontWeight: '800', textAlign: 'center' },
  chooseButton: { width: '100%', height: 44, overflow: 'hidden' },
  chooseButtonContent: { minHeight: 44, paddingVertical: 7 },
  primaryText: { color: '#FFF9EC', fontSize: 13, lineHeight: 18, fontWeight: '900', textAlign: 'center' },
  secondaryText: { color: '#704B5F', fontSize: 13, lineHeight: 18, fontWeight: '900', textAlign: 'center' },
  variantTabs: { flex: 1, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 2 },
  blackStarToggle: { minWidth: 82, minHeight: 34, height: 34, paddingHorizontal: 10, paddingVertical: 3, transform: [{ scale: 0.82 }] },
  variantTab: { width: 66, height: 66, borderBottomWidth: 3, borderBottomColor: 'transparent', alignItems: 'center', justifyContent: 'center', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  variantTabCompact: { width: 58, height: 58 },
  variantTabSelected: { borderBottomColor: '#A64F62' },
  selectionPressed: { opacity: 0.62 },
  variantText: { color: '#76576B', fontSize: 11, lineHeight: 15, fontWeight: '900', textAlign: 'center' },
  variantTextActive: { color: '#A64F62' },
  pickerHelp: { color: '#846973', fontSize: 9, lineHeight: 12, fontWeight: '800', textAlign: 'center' },
  itemScroll: { width: '100%', flex: 1 },
  itemRail: { minWidth: '100%', paddingHorizontal: 4, paddingVertical: 8, gap: 10, alignItems: 'flex-start' },
  optionWrap: { width: 82, alignItems: 'center' },
  optionTile: { width: 78, height: 78, borderWidth: 2, borderColor: 'transparent', borderRadius: 16, alignItems: 'center', justifyContent: 'center', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  optionTileCompact: { width: 70, height: 70 },
  optionTileSelected: { borderColor: '#B35C6C' },
  optionCheck: { position: 'absolute', top: 1, right: 4, color: '#A64F62', fontSize: 13, lineHeight: 15, fontWeight: '900' },
  optionImage: { width: 66, height: 66 },
  optionImageCompact: { width: 58, height: 58 },
  optionName: { width: 82, color: '#64495B', fontSize: 9, lineHeight: 12, fontWeight: '900', textAlign: 'center' },
  optionCount: { color: '#8C7078', fontSize: 9, lineHeight: 12, fontWeight: '800', textAlign: 'center' },
  optionCountSelected: { color: '#A64F62' },
  emptyRail: { width: 250, minHeight: 118, alignItems: 'center', justifyContent: 'center' },
  pickerActions: { width: '100%', height: 42, flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, height: 42, overflow: 'hidden' },
  actionButtonContent: { minHeight: 42, paddingHorizontal: 8, paddingVertical: 6 },
});
