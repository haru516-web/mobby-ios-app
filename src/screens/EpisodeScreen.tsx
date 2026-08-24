import { Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EpisodePlayer, type EpisodePlayerProps } from '@/components/EpisodePlayer';
import { useGachaTheme } from '@/theme/GachaThemeContext';

export type EpisodeScreenProps = EpisodePlayerProps;

/** Single full-screen host for every registered episode. */
export function EpisodeScreen(props: EpisodeScreenProps) {
  const { activeTheme } = useGachaTheme();
  return <SafeAreaView style={[styles.safe, activeTheme && styles.safeThemed]} accessibilityViewIsModal>
    {activeTheme ? <Image accessible={false} source={activeTheme.assets.appBackground} resizeMode="cover" style={styles.background} /> : null}
    <EpisodePlayer {...props} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#251B2D' },
  safeThemed: { backgroundColor: 'transparent' },
  background: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
});
