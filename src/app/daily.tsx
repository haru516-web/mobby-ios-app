import { Text } from '@/ui/layout/visualPrimitives';
import { router } from 'expo-router';
import { SheetScreen, sheetStyles as s } from '@/components/ShellSheet';
import { useDailyLoop } from '@/game/DailyLoopContext';
import { MobbyAssetButton } from '@/components/mobby-ui';
import { DailyRecordContent } from '@/components/daily/DailyRecordContent';

export default function DailyRoute() {
  const { state, isHydrated } = useDailyLoop();
  const goToMobbyTime = () => { router.back(); requestAnimationFrame(() => router.navigate('/mobby-time')); };
  return <SheetScreen title="きょうの記録" footer={<MobbyAssetButton accessibilityLabel="MOBBY TIMEを見る" disabled={!isHydrated} onPress={goToMobbyTime}><Text style={s.actionText}>MOBBY TIMEを見る</Text></MobbyAssetButton>}>
    <DailyRecordContent stampCount={state.stampCount} missions={state.missions} isHydrated={isHydrated} />
  </SheetScreen>;
}
