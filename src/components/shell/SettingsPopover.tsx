import { ImageBackground } from 'expo-image';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  useWindowDimensions,
  View,
} from 'react-native';

import { useGachaTheme } from '@/theme/GachaThemeContext';
import { MobbyAssetCloseButton } from '@/components/mobby-ui';
import { Text } from '@/ui/layout/visualPrimitives';

const SETTINGS_POPUP_BACKGROUND = require('../../../assets/generated-ui/popup-settings-v1.png');
const SETTINGS_PANEL_ASPECT_RATIO = 978 / 1485;

export function SettingsPopover({
  soundEnabled,
  reduceMotion,
  onSoundEnabledChange,
  onClose,
}: {
  soundEnabled: boolean;
  reduceMotion: boolean;
  onSoundEnabledChange: (enabled: boolean) => void;
  onClose: () => void;
}) {
  const { activeTheme } = useGachaTheme();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const availableHeight = Math.max(0, Math.min(viewportHeight * 0.82, viewportHeight - 48, 680));
  const panelWidth = Math.max(0, Math.min(viewportWidth - 32, 410, availableHeight * SETTINGS_PANEL_ASPECT_RATIO));
  const panelHeight = panelWidth / SETTINGS_PANEL_ASPECT_RATIO;

  return <Modal animationType="none" onRequestClose={onClose} presentationStyle="overFullScreen" transparent visible>
    <View pointerEvents="box-none" style={styles.overlay}>
      <Pressable accessibilityLabel="設定を閉じる" accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
      <View
        accessibilityLabel="設定"
        accessibilityViewIsModal
        style={[styles.panel, { width: panelWidth, height: panelHeight }]}
      >
        <View style={styles.panelClip}>
          <ImageBackground
            accessible={false}
            imageStyle={styles.panelImage}
            contentFit="cover"
            source={activeTheme?.assets.popup ?? SETTINGS_POPUP_BACKGROUND}
            style={styles.panelBackground}
          >
            <View style={styles.panelContent}>
              <View style={styles.header}>
                <View style={styles.headerCopy}>
                  <Text accessibilityRole="header" style={styles.title}>設定</Text>
                </View>
                <MobbyAssetCloseButton accessibilityLabel="設定を閉じる" onPress={onClose} style={styles.close} />
              </View>

              <ScrollView
                contentContainerStyle={styles.content}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                style={styles.scroll}
              >
                <View style={styles.section}>
                  <Text style={styles.heading}>サウンド</Text>
                  <View style={styles.row}>
                    <View style={styles.copy}>
                      <Text style={styles.label}>音を鳴らす</Text>
                      <Text style={styles.detail}>BGMと効果音をまとめて切り替えます。</Text>
                    </View>
                    <Switch
                      accessibilityLabel="音を鳴らす"
                      onValueChange={onSoundEnabledChange}
                      value={soundEnabled}
                    />
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.heading}>アクセシビリティ</Text>
                  <View style={styles.row}>
                    <View style={styles.copy}>
                      <Text style={styles.label}>低モーション</Text>
                      <Text style={styles.detail}>端末の「視差効果を減らす」設定に従います。アプリからは上書きしません。</Text>
                      <Text style={styles.status}>現在：{reduceMotion ? 'オン' : 'オフ'}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.note}>触覚だけを個別に切り替える保存設定は、現在のアプリにはありません。音の設定を触覚設定として流用しません。</Text>
              </ScrollView>
            </View>
          </ImageBackground>
        </View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    zIndex: 74,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
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
  panelContent: { flex: 1, minHeight: 0, zIndex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 26,
    paddingHorizontal: 30,
    paddingBottom: 10,
  },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 42 },
  title: { color: '#593C5D', fontSize: 22, fontWeight: '900', marginTop: 2 },
  close: { position: 'absolute', top: 14, right: 2, width: 56, height: 56 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.94 }] },
  scroll: { flex: 1, minHeight: 0 },
  content: { flexGrow: 1, gap: 22, paddingHorizontal: 30, paddingTop: 8, paddingBottom: 30 },
  section: { gap: 10 },
  heading: { color: '#553B59', fontSize: 17, lineHeight: 24, fontWeight: '800' },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 2,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(89, 60, 93, 0.12)',
  },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  label: { color: '#553B59', fontSize: 16, lineHeight: 23, fontWeight: '700' },
  detail: { color: '#6E5864', fontSize: 16, lineHeight: 23 },
  status: { color: '#806B74', fontSize: 12, lineHeight: 18 },
  note: { color: '#806B74', fontSize: 12, lineHeight: 18 },
});
