import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { useDailyLoop } from '@/game/DailyLoopContext';
import { isItemId } from '@/data/collectibles';
import { MobbyTimeVisual as MobbyTimeScreenImplementation } from '@/components/mobby-time/MobbyTimeVisual';

type MobbyTimeScreenProps = Omit<
  ComponentProps<typeof MobbyTimeScreenImplementation>,
  'dailyStatus' | 'dailyHydrated' | 'rewardInProgress' | 'flow'
> & {
  flow?: 'daily' | 'onboarding';
  entryNonce?: number;
};

export function MobbyTimeScreen(props: MobbyTimeScreenProps) {
  const flow = props.flow ?? 'daily';
  const isOnboarding = flow === 'onboarding';
  const {
    state: dailyState,
    isHydrated: dailyHydrated,
    grantMobbyTime,
    openMobbyTime,
    setMobbyTimeRewardPhase,
    reconcile,
  } = useDailyLoop();
  const [now, setNow] = useState(Date.now());
  const [onboardingStage, setOnboardingStage] = useState(props.stage);
  const grantAttemptedRef = useRef(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const entitlement = dailyState.mobbyTime;
  const reward = dailyState.mobbyTimeReward;
  useEffect(() => {
    if (isOnboarding) setOnboardingStage(props.stage);
  }, [isOnboarding, props.stage]);
  useEffect(() => {
    if (isOnboarding || !dailyHydrated || grantAttemptedRef.current || props.secondsLeft <= 0) return;
    grantAttemptedRef.current = true;
    void grantMobbyTime();
  }, [dailyHydrated, grantMobbyTime, isOnboarding, props.secondsLeft]);
  useEffect(() => {
    if (isOnboarding || !dailyHydrated || entitlement?.state !== 'available' || entitlement.expiresAt === null || entitlement.expiresAt > now) return;
    void reconcile();
  }, [dailyHydrated, entitlement, isOnboarding, now, reconcile]);
  const secondsLeft = !isOnboarding && entitlement
    ? entitlement.expiresAt === null ? 0 : Math.max(0, Math.ceil((entitlement.expiresAt - now) / 1000))
    : props.secondsLeft;
  const entitlementExpired = entitlement?.state === 'available' && entitlement.expiresAt !== null && entitlement.expiresAt <= now;
  const status = !isOnboarding && entitlement
    ? entitlementExpired ? 'expired' : entitlement.state === 'available' && entitlement.carriedFrom ? 'carryover' : entitlement.state
    : isOnboarding ? 'available' : 'unavailable';
  const onOpen = async () => {
    if (isOnboarding) {
      try {
        await props.onOpen();
        setOnboardingStage('opening');
      } catch {
        // Persistence owns the transition. Keep the closed package visible
        // when the onboarding phase write fails so a retry remains safe.
      }
      return;
    }
    if (!dailyHydrated || (status !== 'available' && status !== 'carryover')) return;
    try {
      if (isItemId(props.today.id) && await openMobbyTime({ itemId: props.today.id, variant: props.todayVariant })) props.onOpen();
    } catch {
      // The entitlement remains available because daily mutations publish
      // only after persistence succeeds.
    }
  };
  const onReveal = async () => {
    if (isOnboarding) {
      try {
        await props.onReveal();
        setOnboardingStage('revealed');
      } catch {
        // Stay in suspense until the persisted phase can advance.
      }
      return;
    }
    if (reward) {
      const transition = await setMobbyTimeRewardPhase(reward.eventId, 'opening', 'revealed');
      if (transition.committed) props.onReveal();
    }
  };
  const onPlace = async () => {
    if (isOnboarding) {
      try {
        await props.onPlace();
        setOnboardingStage('placing');
      } catch {
        // Keep the result actionable when placement persistence fails.
      }
      return;
    }
    if (reward) {
      const transition = await setMobbyTimeRewardPhase(reward.eventId, 'revealed', 'placing');
      if (transition.committed) props.onPlace();
    }
  };
  const onPlaced = async () => {
    if (isOnboarding) {
      try {
        await props.onPlaced();
        setOnboardingStage('placed');
      } catch {
        // The persisted placing phase will recover on remount.
      }
      return;
    }
    if (reward) {
      const transition = await setMobbyTimeRewardPhase(reward.eventId, 'placing', 'placed');
      if (transition.committed) props.onPlaced();
    }
  };
  const stage = isOnboarding
    ? onboardingStage
    : reward?.phase ?? ((status === 'available' || status === 'carryover') ? 'arrived' : props.stage);
  return <MobbyTimeScreenImplementation {...props} flow={flow} stage={stage} secondsLeft={secondsLeft} dailyStatus={status} dailyHydrated={isOnboarding || dailyHydrated} rewardInProgress={isOnboarding ? stage !== 'arrived' : Boolean(reward)} onOpen={onOpen} onReveal={() => void onReveal()} onPlace={() => void onPlace()} onPlaced={() => void onPlaced()} entryNonce={props.entryNonce} />;
}
