import type { ReactNode } from 'react';
import {
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useGachaTheme } from '@/theme/GachaThemeContext';
import { Text } from '@/ui/layout/visualPrimitives';

const DETAIL_POPUP_BACKGROUND = require('../../../assets/generated-ui/popup-settings-v1.png');
const DETAIL_PANEL_ASPECT_RATIO = 978 / 1485;
const DETAIL_BACKGROUND_SCALE_X = 1024 / 978;
const DETAIL_BACKGROUND_SCALE_Y = 1536 / 1485;

export function ShellDetailPopover({
  accessibilityLabel,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  scrollable = true,
  flush = false,
  contentContainerStyle,
  onBack,
  onClose,
}: {
  accessibilityLabel: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  scrollable?: boolean;
  flush?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  onBack?: () => void;
  onClose: () => void;
}) {
  const { activeTheme } = useGachaTheme();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const availableHeight = Math.max(0, Math.min(viewportHeight * 0.82, viewportHeight - 48, 680));
  const panelWidth = Math.max(0, Math.min(viewportWidth - 32, 410, availableHeight * DETAIL_PANEL_ASPECT_RATIO));
  const panelHeight = panelWidth / DETAIL_PANEL_ASPECT_RATIO;

  return <Modal
    animationType="none"
    onRequestClose={onBack ?? onClose}
    presentationStyle="overFullScreen"
    transparent
    visible
  >
    <View pointerEvents="box-none" style={styles.overlay}>
      <Pressable accessibilityLabel={`${accessibilityLabel}を閉じる`} accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
      <View accessibilityLabel={accessibilityLabel} accessibilityViewIsModal style={[styles.panel, { width: panelWidth, height: panelHeight }]}>
        <View style={styles.panelClip}>
          <ImageBackground
            accessible={false}
            imageStyle={[styles.panelImage, !activeTheme && styles.backgroundImage]}
            resizeMode="stretch"
            source={activeTheme?.assets.popup ?? DETAIL_POPUP_BACKGROUND}
            style={styles.panelBackground}
          >
            <View style={styles.panelContent}>
              <View style={styles.header}>
                <Text style={styles.eyebrow}>{eyebrow}</Text>
                <Text accessibilityRole="header" style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                {onBack ? <Pressable accessibilityLabel="お知らせに戻る" accessibilityRole="button" hitSlop={6} onPress={onBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
                  <Text style={styles.backText}>‹ お知らせに戻る</Text>
                </Pressable> : null}
              </View>
              <Pressable
                accessibilityLabel={`${accessibilityLabel}を閉じる`}
                accessibilityRole="button"
                hitSlop={8}
                onPress={onClose}
                style={({ pressed }) => [styles.close, pressed && styles.pressed]}
              />

              {scrollable ? <ScrollView
                contentContainerStyle={[styles.scrollContent, flush && styles.flushContent, contentContainerStyle]}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator
                style={styles.body}
              >
                {children}
              </ScrollView> : <View style={[styles.body, styles.staticContent, flush && styles.flushContent, contentContainerStyle]}>{children}</View>}
              {footer ? <View style={styles.footer}>{footer}</View> : null}
            </View>
          </ImageBackground>
        </View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, zIndex: 76, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 24 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  panel: {
    minHeight: 0,
    borderRadius: 30,
    backgroundColor: 'transparent',
    shadowColor: '#4F2D3A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 14,
  },
  panelClip: { flex: 1, minHeight: 0, borderRadius: 30, overflow: 'hidden' },
  panelBackground: { flex: 1, width: '100%', height: '100%', minHeight: 0 },
  panelImage: { borderRadius: 30 },
  backgroundImage: { transform: [{ scaleX: DETAIL_BACKGROUND_SCALE_X }, { scaleY: DETAIL_BACKGROUND_SCALE_Y }] },
  panelContent: { flex: 1, minHeight: 0, zIndex: 1 },
  header: { paddingTop: 26, paddingLeft: 66, paddingRight: 58, paddingBottom: 10 },
  eyebrow: { color: '#A45D68', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: '#593C5D', fontSize: 22, lineHeight: 29, fontWeight: '900', marginTop: 2 },
  subtitle: { color: '#8A6C79', fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 2 },
  back: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginTop: 3 },
  backText: { color: '#A45D68', fontSize: 12, lineHeight: 18, fontWeight: '900' },
  close: { position: 'absolute', top: 14, right: 2, width: 56, height: 56 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  body: { flex: 1, minHeight: 0 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 30, paddingTop: 8, paddingBottom: 24 },
  staticContent: { paddingHorizontal: 30, paddingTop: 8, paddingBottom: 24 },
  flushContent: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  footer: { paddingHorizontal: '14%', paddingTop: 10, paddingBottom: 28, borderTopWidth: 1, borderTopColor: 'rgba(89, 60, 93, 0.10)' },
});
