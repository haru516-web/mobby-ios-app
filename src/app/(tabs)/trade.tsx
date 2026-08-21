import { TradeScreen } from '@/screens/TradeScreen';
import { TabFocusTransition } from '@/components/ScreenTransition';
import { useMobbyAppShell } from '@/state/MobbyAppShell';

export default function TradeRoute() {
  const { reduceMotion } = useMobbyAppShell();
  return <TabFocusTransition reduceMotion={reduceMotion}><TradeScreen /></TabFocusTransition>;
}
