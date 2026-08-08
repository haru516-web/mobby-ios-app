import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

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
  return (
    <View style={[styles.panel, tone === 'pink' && styles.panelPink, tone === 'olive' && styles.panelOlive, style]}>
      <View pointerEvents="none" style={styles.stitch} />
      {children}
    </View>
  );
}

export function Plaque({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.plaque, style]}>
      <View pointerEvents="none" style={styles.plaqueStitch} />
      {children}
    </View>
  );
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
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'olive' && styles.buttonOlive,
        tone === 'honey' && styles.buttonHoney,
        tone === 'cream' && styles.buttonCream,
        disabled && styles.buttonDisabled,
        pressed && styles.buttonPressed,
        style,
      ]}
    >
      {icon ? <Text style={styles.buttonIcon}>{icon}</Text> : null}
      <Text style={[styles.buttonText, tone === 'cream' && styles.buttonTextCream, textStyle]}>{children}</Text>
    </Pressable>
  );
}

export function MobbyBadge({ children, tone = 'honey' }: { children: ReactNode; tone?: 'honey' | 'olive' | 'coral' }) {
  return (
    <View style={[styles.badge, tone === 'olive' && styles.badgeOlive, tone === 'coral' && styles.badgeCoral]}>
      <Text style={styles.badgeText}>{children}</Text>
    </View>
  );
}

export function SectionTitle({ eyebrow, title, caption, right }: { eyebrow?: string; title: string; caption?: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
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
  panel: {
    backgroundColor: MobbyColors.paper,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E7BF88',
    padding: 16,
    overflow: 'hidden',
    shadowColor: MobbyColors.woodDark,
    shadowOpacity: 0.13,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  panelPink: { backgroundColor: MobbyColors.paperPink, borderColor: '#E7A993' },
  panelOlive: { backgroundColor: '#E6EBCF', borderColor: '#A7B784' },
  stitch: { position: 'absolute', top: 7, right: 7, bottom: 7, left: 7, borderWidth: 1.2, borderColor: '#E9BF83', borderStyle: 'dashed', borderRadius: 18 },
  plaque: {
    backgroundColor: '#FFF7E7',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#D9A96D',
    paddingHorizontal: 22,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: MobbyColors.woodDark,
    shadowOpacity: 0.17,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  plaqueStitch: { position: 'absolute', top: 6, right: 7, bottom: 6, left: 7, borderWidth: 1, borderColor: '#E7BF88', borderStyle: 'dashed', borderRadius: 16 },
  button: { minHeight: 52, borderRadius: 19, paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: MobbyColors.coral, borderWidth: 2, borderColor: '#D86553', shadowColor: '#8B4939', shadowOpacity: 0.22, shadowRadius: 4, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  buttonOlive: { backgroundColor: MobbyColors.olive, borderColor: MobbyColors.oliveDark },
  buttonHoney: { backgroundColor: MobbyColors.honey, borderColor: MobbyColors.honeyDark },
  buttonCream: { backgroundColor: MobbyColors.paper, borderColor: '#D6A36B' },
  buttonDisabled: { opacity: 0.55 },
  buttonPressed: { transform: [{ translateY: 2 }], opacity: 0.84 },
  buttonIcon: { color: MobbyColors.white, fontSize: 22, marginRight: 8 },
  buttonText: { color: MobbyColors.white, fontSize: 15, lineHeight: 20, fontWeight: '800', letterSpacing: 0.2 },
  buttonTextCream: { color: MobbyColors.ink },
  badge: { alignSelf: 'flex-start', borderRadius: 13, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#F9D27E', borderWidth: 1, borderColor: '#D9A354' },
  badgeOlive: { backgroundColor: '#D6E3B8', borderColor: '#9BB17A' },
  badgeCoral: { backgroundColor: '#FFD0C1', borderColor: '#E39B84' },
  badgeText: { color: MobbyColors.ink, fontSize: 11, fontWeight: '800' },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  sectionCopy: { flex: 1 },
  eyebrow: { color: MobbyColors.muted, fontSize: 10, lineHeight: 14, fontWeight: '900', letterSpacing: 1.8 },
  sectionTitle: { color: MobbyColors.ink, fontSize: 21, lineHeight: 27, fontWeight: '900', marginTop: 2 },
  sectionCaption: { color: '#9E7958', fontSize: 12, lineHeight: 18, marginTop: 3 },
  divider: { borderTopWidth: 1.5, borderTopColor: '#E5B87D', borderStyle: 'dashed', marginVertical: 14 },
});
