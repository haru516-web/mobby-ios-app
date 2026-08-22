import type { ReactNode } from 'react';
import { Image, ImageBackground, Pressable, StyleSheet, View, type AccessibilityRole, type AccessibilityState, type AccessibilityValue, type ImageSourcePropType, type ImageStyle, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { Text } from '@/ui/layout/visualPrimitives';
import { OutlinedText } from '@/ui/text/OutlinedText';

export type MobbyAssetSurfaceVariant = 'paper' | 'paperTall' | 'modalPortrait' | 'statusWide' | 'notice' | 'tile' | 'tileSelected' | 'dialogue' | 'darkCase' | 'darkCaseTall' | 'darkTopbar' | 'labelPill';

const SURFACE_SOURCES: Record<MobbyAssetSurfaceVariant, ImageSourcePropType> = {
  paper: require('../../assets/generated-ui/surface-paper-wide-v1.png'),
  paperTall: require('../../assets/generated-ui/surface-paper-tall-v1.png'),
  modalPortrait: require('../../assets/generated-ui/surface-modal-portrait-v1.png'),
  statusWide: require('../../assets/generated-ui/surface-status-wide-v1.png'),
  notice: require('../../assets/generated-ui/surface-row-notice-v1.png'),
  tile: require('../../assets/generated-ui/surface-tile-square-v1.png'),
  tileSelected: require('../../assets/generated-ui/surface-tile-selected-v1.png'),
  dialogue: require('../../assets/generated-ui/surface-dialogue-v1.png'),
  darkCase: require('../../assets/generated-ui/surface-dark-case-v1.png'),
  darkCaseTall: require('../../assets/generated-ui/surface-dark-case-tall-v1.png'),
  darkTopbar: require('../../assets/generated-ui/surface-dark-topbar-v1.png'),
  labelPill: require('../../assets/generated-ui/surface-label-pill-v1.png'),
};
const ASSET_BUTTON_SOURCES = {
  coral: require('../../assets/generated-ui/button-coral-v1.png'),
  cream: require('../../assets/generated-ui/button-cream-v1.png'),
} as const;
const HEADER_CIRCLE_PAPER = require('../../assets/generated-ui/header-circle-paper-v1.png');

function surfaceResizeMode(variant: MobbyAssetSurfaceVariant): 'contain' | 'cover' {
  return variant === 'paperTall' || variant === 'modalPortrait' || variant === 'darkCaseTall' ? 'contain' : 'cover';
}

export const MobbyColors = {
  ink: '#5A351F',
  muted: '#9A704C',
  paper: '#FFF4DD',
  paperDeep: '#F7E6C7',
  paperPink: '#FFE2D6',
  coral: '#F07E68',
  coralDark: '#C85D4E',
  honey: '#F2B83F',
  honeyDark: '#B87820',
  olive: '#7B9461',
  oliveDark: '#536D46',
  blue: '#A8C4C7',
  wood: '#B8794F',
  woodDark: '#74452F',
  line: '#D7A56A',
  white: '#FFFDF7',
} as const;

export function PaperPanel({ children, style, tone = 'cream' }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'cream' | 'pink' | 'olive' }) {
  const variant: MobbyAssetSurfaceVariant = tone === 'pink' ? 'darkCase' : tone === 'olive' ? 'notice' : 'paper';
  return <MobbyAssetSurface variant={variant} style={style}>{children}</MobbyAssetSurface>;
}

export function Plaque({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <MobbyAssetSurface variant="paper" style={style}>{children}</MobbyAssetSurface>;
}

export function MobbyButton({
  children,
  icon,
  tone = 'coral',
  onPress,
  style,
  textStyle,
  disabled = false,
}: {
  children: ReactNode;
  icon?: string;
  tone?: 'coral' | 'olive' | 'honey' | 'cream';
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}) {
  return <MobbyAssetButton
    accessibilityLabel={typeof children === 'string' ? children : 'ボタン'}
    tone={tone === 'cream' ? 'cream' : 'coral'}
    onPress={onPress}
    style={style}
    disabled={disabled}
  >
    {icon ? <Text style={styles.buttonIcon}>{icon}</Text> : null}
    <Text style={[styles.buttonText, tone === 'cream' && styles.buttonTextCream, textStyle]}>{children}</Text>
  </MobbyAssetButton>;
}

export function MobbyAssetButton({
  children,
  accessibilityLabel,
  accessibilityState,
  tone = 'coral',
  backgroundSource,
  backgroundResizeMode,
  onPress,
  style,
  contentStyle,
  disabled = false,
}: {
  children: ReactNode;
  accessibilityLabel: string;
  accessibilityState?: AccessibilityState;
  tone?: 'coral' | 'cream';
  backgroundSource?: ImageSourcePropType;
  backgroundResizeMode?: 'cover' | 'contain' | 'stretch';
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.assetButton,
        disabled && styles.buttonDisabled,
        pressed && styles.buttonPressed,
        style,
      ]}
    >
      <Image
        accessible={false}
        source={backgroundSource ?? ASSET_BUTTON_SOURCES[tone]}
        resizeMode={backgroundResizeMode ?? (backgroundSource ? 'stretch' : 'cover')}
        style={styles.assetButtonImage}
      />
      <View style={[styles.assetButtonContent, contentStyle]}>{children}</View>
    </Pressable>
  );
}

export function MobbyAssetIconButton({
  accessibilityLabel,
  icon,
  iconStyle,
  accessibilityState,
  onPress,
  style,
  badge,
  disabled = false,
}: {
  accessibilityLabel: string;
  icon: ImageSourcePropType;
  iconStyle?: StyleProp<ImageStyle>;
  accessibilityState?: AccessibilityState;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  badge?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, disabled && styles.buttonDisabled, pressed && styles.buttonPressed, style]}
    >
      <ImageBackground
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        resizeMode="cover"
        source={HEADER_CIRCLE_PAPER}
        style={styles.iconButtonSurface}
      >
        <Image accessible={false} source={icon} resizeMode="contain" style={[styles.iconButtonImage, iconStyle]} />
      </ImageBackground>
      {badge}
    </Pressable>
  );
}

export function MobbyAssetSurface({
  children,
  variant = 'paper',
  style,
  contentStyle,
  accessible,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  accessibilityValue,
  accessibilityLiveRegion,
  accessibilityViewIsModal,
  pointerEvents,
  testID,
}: {
  children: ReactNode;
  variant?: MobbyAssetSurfaceVariant;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  accessibilityValue?: AccessibilityValue;
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  accessibilityViewIsModal?: boolean;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  testID?: string;
}) {
  return (
    <View accessible={accessible} accessibilityLabel={accessibilityLabel} accessibilityRole={accessibilityRole} accessibilityState={accessibilityState} accessibilityValue={accessibilityValue} accessibilityLiveRegion={accessibilityLiveRegion} accessibilityViewIsModal={accessibilityViewIsModal} pointerEvents={pointerEvents} testID={testID} style={style}>
      <ImageBackground
        accessible={false}
        resizeMode={surfaceResizeMode(variant)}
        source={SURFACE_SOURCES[variant]}
        style={[styles.assetSurface, contentStyle]}
      >
        {children}
      </ImageBackground>
    </View>
  );
}

export function MobbyAssetSelectable({
  children,
  accessibilityLabel,
  accessibilityRole = 'radio',
  accessibilityState,
  selected = false,
  disabled = false,
  onPress,
  style,
  contentStyle,
  variant = 'tile',
  onPressIn,
  onPressOut,
}: {
  children: ReactNode;
  accessibilityLabel: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  variant?: 'tile' | 'notice' | 'dialogue' | 'darkCase' | 'paperTall' | 'modalPortrait' | 'statusWide' | 'darkCaseTall' | 'darkTopbar' | 'labelPill';
  onPressIn?: PressableProps['onPressIn'];
  onPressOut?: PressableProps['onPressOut'];
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ ...accessibilityState, disabled, selected, checked: accessibilityRole === 'radio' ? selected : accessibilityState?.checked }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [styles.assetSelectable, disabled && styles.buttonDisabled, pressed && styles.buttonPressed, style]}
    >
      <ImageBackground
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        resizeMode={surfaceResizeMode(variant === 'tile' && selected ? 'tileSelected' : variant)}
        source={SURFACE_SOURCES[variant === 'tile' && selected ? 'tileSelected' : variant]}
        style={[styles.assetSurface, contentStyle]}
      >
        {children}
      </ImageBackground>
    </Pressable>
  );
}

export function MobbyBadge({ children, tone = 'honey' }: { children: ReactNode; tone?: 'honey' | 'olive' | 'coral' }) {
  const variant: MobbyAssetSurfaceVariant = tone === 'coral' ? 'notice' : tone === 'olive' ? 'paper' : 'labelPill';
  return <MobbyAssetSurface variant={variant} pointerEvents="none" style={styles.badge} contentStyle={styles.badgeContent}><Text style={styles.badgeText}>{children}</Text></MobbyAssetSurface>;
}

export function SectionTitle({ eyebrow, title, caption, right }: { eyebrow?: string; title: string; caption?: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <OutlinedText color={MobbyColors.ink} fontSize={21} lineHeight={27} outlineColor={MobbyColors.paper} outlineWidth={1.6} style={styles.sectionTitleOutline}>{title}</OutlinedText>
        {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function StitchDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  buttonDisabled: { opacity: 0.55 },
  buttonPressed: { transform: [{ translateY: 2 }], opacity: 0.84 },
  assetButton: { minHeight: 48, borderRadius: 16, overflow: 'hidden' },
  assetButtonImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  assetButtonContent: { zIndex: 1, flex: 1, width: '100%', minHeight: 48, paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconButton: { width: 44, height: 44, overflow: 'hidden', position: 'relative' },
  iconButtonSurface: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  iconButtonImage: { width: 22, height: 22 },
  assetSurface: { width: '100%' },
  assetSelectable: { minHeight: 44 },
  buttonIcon: { color: MobbyColors.white, fontSize: 22, marginRight: 8 },
  buttonText: { color: MobbyColors.white, fontSize: 15, lineHeight: 20, fontWeight: '800', letterSpacing: 0.2 },
  buttonTextCream: { color: MobbyColors.ink },
  badge: { alignSelf: 'flex-start', minHeight: 30, overflow: 'hidden' },
  badgeContent: { minHeight: 30, paddingHorizontal: 10, paddingVertical: 5, justifyContent: 'center' },
  badgeText: { color: MobbyColors.ink, fontSize: 12, fontWeight: '800' },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  sectionCopy: { flex: 1 },
  eyebrow: { color: MobbyColors.muted, fontSize: 12, lineHeight: 14, fontWeight: '900', letterSpacing: 1.8 },
  sectionTitleOutline: { marginTop: 2 },
  sectionCaption: { color: '#9E7958', fontSize: 12, lineHeight: 18, marginTop: 3 },
  divider: { borderTopWidth: 1.5, borderTopColor: '#E5B87D', borderStyle: 'dashed', marginVertical: 14 },
});
