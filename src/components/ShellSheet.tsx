import type { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { Text } from '@/ui/layout/visualPrimitives';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobbyAssetButton } from '@/components/mobby-ui';
import { useGachaTheme } from '@/theme/GachaThemeContext';

export function SheetScreen({ title, children, footer, backgroundSource, closeImageSource }: { title: string; children: ReactNode; footer?: ReactNode; backgroundSource?: ImageSourcePropType; closeImageSource?: ImageSourcePropType }) {
  const { activeTheme } = useGachaTheme();
  const resolvedBackground = activeTheme?.assets.appBackground ?? backgroundSource;
  const resolvedCloseImage = activeTheme ? undefined : closeImageSource;
  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, resolvedBackground ? styles.safeWithBackground : null]}>
      {resolvedBackground ? <View pointerEvents="none" style={styles.backgroundImage}><Image accessibilityElementsHidden importantForAccessibility="no-hide-descendants" source={resolvedBackground} resizeMode="cover" style={styles.backgroundImageAsset} /></View> : null}
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {resolvedCloseImage ? <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}を閉じる`}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeImageButton, pressed && styles.closeImageButtonPressed]}
        >
          <Image accessible={false} source={resolvedCloseImage} resizeMode="contain" style={styles.closeImage} />
        </Pressable> : <MobbyAssetButton accessibilityLabel={`${title}を閉じる`} tone="cream" onPress={() => router.back()} style={styles.close} contentStyle={styles.closeContent}>
          <Text style={styles.closeText}>閉じる</Text>
        </MobbyAssetButton>}
      </View>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export const sheetStyles = StyleSheet.create({
  section: { gap: 10 },
  sectionTitle: { color: '#553B59', fontSize: 17, lineHeight: 24, fontWeight: '800' },
  body: { color: '#6E5864', fontSize: 16, lineHeight: 24 },
  secondary: { color: '#806B74', fontSize: 12, lineHeight: 18 },
  row: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center' },
  action: { minHeight: 48, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#FFF', fontSize: 16, lineHeight: 22, fontWeight: '800' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8EC' },
  safeWithBackground: { backgroundColor: 'transparent' },
  backgroundImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  backgroundImageAsset: { width: '100%', height: '100%' },
  header: { minHeight: 56, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#553B59', fontSize: 22, lineHeight: 30, fontWeight: '800', flexShrink: 1 },
  close: { minHeight: 44, minWidth: 72, overflow: 'hidden' },
  closeContent: { minHeight: 44, minWidth: 72, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  closeText: { color: '#A4485A', fontSize: 16, fontWeight: '700' },
  closeImageButton: { width: 92, height: 58, alignItems: 'center', justifyContent: 'center' },
  closeImageButtonPressed: { opacity: 0.76, transform: [{ scale: 0.96 }] },
  closeImage: { width: '100%', height: '100%' },
  content: { padding: 20, paddingTop: 8, gap: 24 },
  footer: { padding: 20, paddingTop: 10 },
});
