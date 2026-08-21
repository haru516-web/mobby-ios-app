import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EpisodePlayer, type EpisodePlayerProps } from '@/components/EpisodePlayer';

export type EpisodeScreenProps = EpisodePlayerProps;

/** Single full-screen host for every registered episode. */
export function EpisodeScreen(props: EpisodeScreenProps) {
  return <SafeAreaView style={styles.safe} accessibilityViewIsModal><EpisodePlayer {...props} /></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#251B2D' } });
