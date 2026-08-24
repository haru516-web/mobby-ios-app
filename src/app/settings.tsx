import { Image, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from '@/ui/layout/visualPrimitives';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMobbyAppShell } from '@/state/MobbyAppShell';
import { MobbyAssetSurface } from '@/components/mobby-ui';
import { useGachaTheme } from '@/theme/GachaThemeContext';

export default function SettingsRoute() {
  const shell = useMobbyAppShell();
  const { activeTheme } = useGachaTheme();
  return <SafeAreaView edges={['bottom']} style={[styles.safe, activeTheme && styles.safeThemed]}>
    {activeTheme ? <Image accessible={false} source={activeTheme.assets.appBackground} resizeMode="cover" style={styles.background} /> : null}
    <ScrollView contentContainerStyle={styles.content}>
    <View style={styles.section}><Text style={styles.heading}>サウンド</Text><MobbyAssetSurface variant="notice" style={styles.row} contentStyle={styles.rowContent}><View style={styles.copy}><Text style={styles.label}>音を鳴らす</Text><Text style={styles.detail}>BGMと効果音をまとめて切り替えます。</Text></View><Switch accessibilityLabel="音を鳴らす" value={shell.soundEnabled} onValueChange={shell.setSoundEnabled}/></MobbyAssetSurface></View>
    <View style={styles.section}><Text style={styles.heading}>アクセシビリティ</Text><MobbyAssetSurface variant="notice" style={styles.row} contentStyle={styles.rowContent}><View style={styles.copy}><Text style={styles.label}>低モーション</Text><Text style={styles.detail}>端末の「視差効果を減らす」設定に従います。アプリからは上書きしません。</Text><Text style={styles.status}>現在：{shell.reduceMotion ? 'オン' : 'オフ'}</Text></View></MobbyAssetSurface></View>
    <Text style={styles.note}>触覚だけを個別に切り替える保存設定は、現在のアプリにはありません。音の設定を触覚設定として流用しません。</Text>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#FFF8EC' }, safeThemed: { backgroundColor: 'transparent' }, background: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }, content: { padding: 20, gap: 24 }, section: { gap: 10 }, heading: { color: '#553B59', fontSize: 17, lineHeight: 24, fontWeight: '800' }, row: { minHeight: 72 }, rowContent: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 14 }, copy: { flex: 1, gap: 3 }, label: { color: '#553B59', fontSize: 16, lineHeight: 23, fontWeight: '700' }, detail: { color: '#6E5864', fontSize: 16, lineHeight: 23 }, status: { color: '#806B74', fontSize: 12, lineHeight: 18 }, note: { color: '#806B74', fontSize: 12, lineHeight: 18 } });
