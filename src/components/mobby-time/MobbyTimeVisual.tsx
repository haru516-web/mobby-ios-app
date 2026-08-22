import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, ImageBackground, Pressable, View, type LayoutChangeEvent } from 'react-native';

import { ParticleBurst } from '@/components/effects';
import { MobbyAssetButton } from '@/components/mobby-ui';
import { collectibleImage, collectibleName, collectibleVariantLabel, type CollectibleVariant, type Item } from '@/data/collectibles';
import { styles } from '@/ui/layout/appStyles';
import { Text, useAppLayout } from '@/ui/layout/visualPrimitives';
import { useMobbyHaptics } from '@/hooks/useMobbyHaptics';

type MobbyTimeStage = 'arrived' | 'opening' | 'revealed' | 'placing' | 'placed';
type DailyMobbyTimeStatus = 'available' | 'carryover' | 'opened' | 'expired' | 'unavailable';

const MOBBY_TIME_BOARD = require('../../../assets/backgrounds/mobby-time-board.png');
const MOBBY_TIME_PACKAGE = require('../../../assets/mobby-time-package.png');
const MOBBY_TIME_TIMER_PLAQUE = require('../../../assets/mobby-time/timer-plaque.png');
const MOBBY_TIME_MESSAGE_PLAQUE = require('../../../assets/mobby-time/message-plaque.png');
const MOBBY_TIME_REWARD_SEAL = require('../../../assets/mobby-time/reward-seal.png');
const MOBBY_ICON = require('../../../assets/home-ui/icons/mobby.png');
const POPOVER_PANEL_ASPECT_RATIO = 978 / 1485;
const POPOVER_PANEL_MAX_WIDTH = 410;
const POPOVER_PANEL_MAX_HEIGHT = 680;
const POPOVER_PANEL_INSET = 32;
const POPOVER_VERTICAL_INSET = 48;
const POPOVER_GENERIC_HEADER_HEIGHT = 100;
const POPOVER_TIME_HEADER_HEIGHT = 86;

export function MobbyTimeVisual({
  today, todayVariant, stage, onOpen, onReveal, onPlace, onPlaced, secondsLeft,
  dailyStatus = 'available', dailyHydrated = true, rewardInProgress = false, reduceMotion = false,
  flow = 'daily', entryNonce = 0, presentation = 'screen',
}: {
  today: Item;
  todayVariant: CollectibleVariant;
  stage: MobbyTimeStage;
  onOpen: () => void;
  onReveal: () => void;
  onPlace: () => void;
  onPlaced: () => void;
  secondsLeft: number;
  dailyStatus?: DailyMobbyTimeStatus;
  dailyHydrated?: boolean;
  rewardInProgress?: boolean;
  reduceMotion?: boolean;
  flow?: 'daily' | 'onboarding';
  entryNonce?: number;
  presentation?: 'screen' | 'popover';
}) {
  const { width: appWidth, height: appHeight } = useAppLayout();
  const popover = presentation === 'popover';
  const [headerHeight, setHeaderHeight] = useState(popover ? POPOVER_TIME_HEADER_HEIGHT : 110);
  const onboardingFlow = flow === 'onboarding';
  const canOpen = dailyHydrated && secondsLeft > 0 && (dailyStatus === 'available' || dailyStatus === 'carryover');
  const active = canOpen || rewardInProgress;
  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');
  const opening = stage === 'opening';
  const placing = stage === 'placing';
  const revealed = stage === 'revealed' || placing || stage === 'placed';
  const placed = stage === 'placed';
  const packageMotion = useRef(new Animated.Value(0)).current;
  const revealMotion = useRef(new Animated.Value(0)).current;
  const rewardBounce = useRef(new Animated.Value(0)).current;
  const magicGlow = useRef(new Animated.Value(0)).current;
  const placementMotion = useRef(new Animated.Value(0)).current;
  const placementBurst = useRef(new Animated.Value(0)).current;
  const entryMotion = useRef(new Animated.Value(1)).current;
  const onRevealRef = useRef(onReveal);
  const onPlacedRef = useRef(onPlaced);
  const openingRunRef = useRef(0);
  const placementRunRef = useRef(0);
  const haptics = useMobbyHaptics();
  const previousStageRef = useRef(stage);

  useEffect(() => {
    entryMotion.stopAnimation();
    entryMotion.setValue(0);
    const animation = Animated.timing(entryMotion, {
      toValue: 1,
      duration: reduceMotion ? 420 : 320,
      useNativeDriver: typeof document === 'undefined',
    });
    animation.start();
    return () => animation.stop();
  }, [entryMotion, entryNonce, reduceMotion]);

  useEffect(() => {
    onRevealRef.current = onReveal;
  }, [onReveal]);

  useEffect(() => {
    onPlacedRef.current = onPlaced;
  }, [onPlaced]);

  useEffect(() => {
    const previous = previousStageRef.current;
    previousStageRef.current = stage;
    if (stage === 'opening' && previous !== 'opening') haptics.success();
    if (stage === 'revealed' && previous !== 'revealed') haptics.success();
  }, [haptics, stage]);

  useEffect(() => {
    const runId = ++openingRunRef.current;
    packageMotion.stopAnimation();
    packageMotion.setValue(0);
    magicGlow.stopAnimation();
    magicGlow.setValue(0);

    if (!opening && !revealed) {
      // While the package is still unopened, it gives a clear burst of
      // rattles, pauses, then repeats. This starts before hydration finishes
      // as well, so the package never appears frozen while the daily status
      // is being reconciled. The separate accessible CTA still owns whether
      // opening is actually allowed.
      const idleRattle = Animated.loop(Animated.sequence([
        Animated.delay(reduceMotion ? 260 : 360),
        Animated.timing(packageMotion, { toValue: reduceMotion ? 0.9 : 1, duration: reduceMotion ? 140 : 78, useNativeDriver: typeof document === 'undefined' }),
        Animated.timing(packageMotion, { toValue: reduceMotion ? -0.7 : -1, duration: reduceMotion ? 155 : 78, useNativeDriver: typeof document === 'undefined' }),
        Animated.timing(packageMotion, { toValue: reduceMotion ? 0.28 : 0.3, duration: reduceMotion ? 120 : 105, useNativeDriver: typeof document === 'undefined' }),
        Animated.timing(packageMotion, { toValue: 0, duration: reduceMotion ? 140 : 105, useNativeDriver: typeof document === 'undefined' }),
        Animated.delay(reduceMotion ? 360 : 760),
      ]));
      idleRattle.start();
      return () => {
        if (openingRunRef.current === runId) openingRunRef.current += 1;
        idleRattle.stop();
        packageMotion.stopAnimation();
        packageMotion.setValue(0);
      };
    }

    if (!opening) return undefined;

    const shake = reduceMotion
      ? Animated.sequence([
        Animated.timing(packageMotion, { toValue: 0.38, duration: 130, useNativeDriver: typeof document === 'undefined' }),
        Animated.timing(packageMotion, { toValue: -0.28, duration: 150, useNativeDriver: typeof document === 'undefined' }),
        Animated.timing(packageMotion, { toValue: 0, duration: 140, useNativeDriver: typeof document === 'undefined' }),
      ])
      : Animated.sequence([
          Animated.timing(packageMotion, { toValue: 1, duration: 120, useNativeDriver: typeof document === 'undefined' }),
          Animated.timing(packageMotion, { toValue: -1, duration: 120, useNativeDriver: typeof document === 'undefined' }),
          Animated.timing(packageMotion, { toValue: 1, duration: 110, useNativeDriver: typeof document === 'undefined' }),
          Animated.timing(packageMotion, { toValue: -1, duration: 110, useNativeDriver: typeof document === 'undefined' }),
          Animated.timing(packageMotion, { toValue: 1, duration: 100, useNativeDriver: typeof document === 'undefined' }),
          Animated.timing(packageMotion, { toValue: -1, duration: 100, useNativeDriver: typeof document === 'undefined' }),
          Animated.timing(packageMotion, { toValue: 0, duration: 80, useNativeDriver: typeof document === 'undefined' }),
        ]);
    const anticipationDuration = reduceMotion ? 800 : 1120;
    const animation = Animated.sequence([
      Animated.parallel([
        shake,
        Animated.timing(magicGlow, { toValue: 1, duration: anticipationDuration, useNativeDriver: typeof document === 'undefined' }),
      ]),
      Animated.delay(80),
    ]);
    animation.start(({ finished }) => {
      if (finished && openingRunRef.current === runId) onRevealRef.current();
    });
    return () => {
      if (openingRunRef.current === runId) openingRunRef.current += 1;
      animation.stop();
    };
  }, [canOpen, dailyHydrated, entryNonce, magicGlow, opening, packageMotion, reduceMotion, revealed]);

  useEffect(() => {
    if (!placing) {
      placementRunRef.current += 1;
      placementMotion.setValue(0);
      placementBurst.setValue(0);
      return;
    }
    const runId = ++placementRunRef.current;
    const animation = Animated.sequence([
      Animated.parallel([
        reduceMotion
          ? Animated.timing(placementMotion, { toValue: 1, duration: 220, useNativeDriver: typeof document === 'undefined' })
          : Animated.spring(placementMotion, { toValue: 1, speed: 8, bounciness: 12, useNativeDriver: typeof document === 'undefined' }),
        Animated.timing(placementBurst, { toValue: 1, duration: reduceMotion ? 180 : 650, useNativeDriver: typeof document === 'undefined' }),
      ]),
      Animated.delay(reduceMotion ? 80 : 380),
    ]);
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let completed = false;
    const completePlacement = () => {
      if (completed || placementRunRef.current !== runId) return;
      completed = true;
      placementRunRef.current += 1;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      onPlacedRef.current();
    };
    // Animated callbacks can be skipped when the web/native animation driver
    // is interrupted. Keep a bounded fallback so the placement action always
    // reaches the parent and can navigate to the home screen.
    fallbackTimer = setTimeout(completePlacement, reduceMotion ? 700 : 1800);
    animation.start(({ finished }) => {
      if (finished) completePlacement();
    });
    return () => {
      if (placementRunRef.current === runId) placementRunRef.current += 1;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      animation.stop();
    };
  }, [placementBurst, placementMotion, placing, reduceMotion]);

  useEffect(() => {
    if (!revealed) {
      revealMotion.setValue(0);
      return;
    }
    revealMotion.setValue(0.35);
    const animation = Animated.spring(revealMotion, {
      toValue: 1,
      speed: 10,
      bounciness: 15,
      useNativeDriver: typeof document === 'undefined',
    });
    animation.start();
    return () => animation.stop();
  }, [revealMotion, revealed]);

  useEffect(() => {
    rewardBounce.stopAnimation();
    rewardBounce.setValue(0);
    if (!revealed || placing || placed) return undefined;

    // After the reveal settles, the reward makes one small hop, pauses, and
    // repeats. The pause keeps the motion readable instead of becoming a
    // constant vibration.
    const bounceLoop = Animated.loop(Animated.sequence([
      Animated.delay(620),
      Animated.timing(rewardBounce, { toValue: reduceMotion ? 0.4 : 1, duration: reduceMotion ? 120 : 150, useNativeDriver: typeof document === 'undefined' }),
      Animated.timing(rewardBounce, { toValue: 0, duration: reduceMotion ? 160 : 230, useNativeDriver: typeof document === 'undefined' }),
      Animated.delay(reduceMotion ? 1100 : 900),
    ]));
    bounceLoop.start();
    return () => {
      bounceLoop.stop();
      rewardBounce.stopAnimation();
      rewardBounce.setValue(0);
    };
  }, [entryNonce, placed, placing, reduceMotion, revealed, rewardBounce]);

  const startOpening = () => {
    if (!canOpen || opening) return;
    onOpen();
  };
  const placement = todayVariant === 'plush' ? '棚' : '壁';
  const placementDistance = todayVariant === 'plush' ? 34 : -68;
  const rewardImage = collectibleImage(today, todayVariant);
  const rewardName = collectibleName(today, todayVariant);
  const encounterBoardBaseWidth = 370;
  const encounterBoardBaseHeight = 520;
  const popoverAvailableHeight = Math.max(0, Math.min(appHeight * 0.82, appHeight - POPOVER_VERTICAL_INSET, POPOVER_PANEL_MAX_HEIGHT));
  const popoverPanelWidth = Math.max(0, Math.min(
    appWidth - POPOVER_PANEL_INSET,
    POPOVER_PANEL_MAX_WIDTH,
    popoverAvailableHeight * POPOVER_PANEL_ASPECT_RATIO,
  ));
  const popoverPanelHeight = popoverPanelWidth / POPOVER_PANEL_ASPECT_RATIO;
  const popoverContentHeight = Math.max(0, popoverPanelHeight - POPOVER_GENERIC_HEADER_HEIGHT);
  const encounterBoardScale = popover
    ? Math.max(0, Math.min(
        1,
        (popoverPanelWidth - 28) / encounterBoardBaseWidth,
        (popoverContentHeight - headerHeight) / encounterBoardBaseHeight,
      ))
    : Math.min(
        1,
        (appWidth - 28) / encounterBoardBaseWidth,
        Math.max(390, appHeight - 74 - headerHeight - 105) / encounterBoardBaseHeight,
      );
  const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);
    setHeaderHeight((current) => current === nextHeight ? current : nextHeight);
  }, []);
  const packageTransform = {
    transform: [
      { translateX: packageMotion.interpolate({ inputRange: [-1, 0, 1], outputRange: [-9, 0, 9] }) },
      { translateY: packageMotion.interpolate({ inputRange: [-1, 0, 1], outputRange: [2.5, 0, -2.5] }) },
      { rotate: packageMotion.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-4deg', '0deg', '4deg'] }) },
      { scale: packageMotion.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.985, 1, 1.015] }) },
      { scale: magicGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
    ],
  };
  const rewardIdleTransform = {
    transform: [
      { translateY: rewardBounce.interpolate({ inputRange: [0, 1], outputRange: [0, -13] }) },
      { scale: rewardBounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }) },
    ],
  };
  const openingLightOpacity = magicGlow.interpolate({
    inputRange: [0, 0.22, 0.62, 1],
    outputRange: [0, 0.2, 0.72, 0.96],
  });
  const openingLightLift = magicGlow.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
  const openingLightScale = magicGlow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const openingLightBeamStyle = {
    opacity: openingLightOpacity,
    transform: [{ translateY: openingLightLift }, { scaleY: openingLightScale }],
  };
  const openingLightLeftRayStyle = {
    opacity: openingLightOpacity,
    transform: [{ translateY: openingLightLift }, { scaleY: openingLightScale }, { rotate: '-17deg' }],
  };
  const openingLightRightRayStyle = {
    opacity: openingLightOpacity,
    transform: [{ translateY: openingLightLift }, { scaleY: openingLightScale }, { rotate: '17deg' }],
  };
  const openButtonLabel = !canOpen
    ? onboardingFlow ? 'グッズを準備中' : 'また明日会おう'
    : opening ? '開封中…' : '箱をタップして開封しよう';
  const statusTitle = onboardingFlow
    ? !dailyHydrated ? '最初のグッズを準備中' : opening ? '開封演出中' : rewardInProgress ? '最初のグッズ' : 'はじめてのBOX'
    : !dailyHydrated ? '読み込み中' : opening ? '開封演出中' : rewardInProgress ? '今日のグッズ' : dailyStatus === 'opened' ? '今日は開封済み' : dailyStatus === 'expired' ? '受付終了' : dailyStatus === 'carryover' ? '持ち越しBOX' : dailyStatus === 'available' ? '開封できます' : '次のBOXを待っています';
  const statusMessage = onboardingFlow
    ? !dailyHydrated ? '最初のグッズを安全に保存しています' : opening ? '光が集まっています…' : rewardInProgress ? (placed ? '受け取りが完了しました' : '最初のグッズを安全に受け取れます') : '箱を開けて、最初の子に会おう'
    : !dailyHydrated ? 'デイリー情報を確認しています' : opening ? '光が集まっています…' : rewardInProgress ? (placed ? '受け取りが完了しました' : '同じグッズを安全に受け取れます') : dailyStatus === 'opened' ? '同じ日はもう一度開封できません' : dailyStatus === 'expired' ? '未開封分は翌日に1回だけ持ち越されます' : dailyStatus === 'carryover' ? '昨日の未開封分を開けられます' : dailyStatus === 'available' ? '箱を開けて、今日の子に会おう' : 'MOBBY TIMEが届くとここに表示されます';
  const packageArtwork = <Image source={MOBBY_TIME_PACKAGE} resizeMode="contain" style={styles.mobbyTimePackageAsset} />;
  return (
    <Animated.View style={[styles.timeScrollContent, { opacity: entryMotion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.86, 1] }), transform: [{ translateY: entryMotion.interpolate({ inputRange: [0, 1], outputRange: reduceMotion ? [18, 0] : [22, 0] }) }, { scale: entryMotion.interpolate({ inputRange: [0, 1], outputRange: reduceMotion ? [0.94, 1] : [0.965, 1] }) }] }]}>
        <View onLayout={handleHeaderLayout} style={[styles.timeHeader, popover && styles.timeHeaderPopover]}>{!popover ? <Text style={styles.timeTitle}>{onboardingFlow ? 'はじめてのBOX' : 'MOBBY TIME'}</Text> : null}<Text style={styles.timeHeaderSub}>{statusTitle}</Text><ImageBackground source={MOBBY_TIME_TIMER_PLAQUE} resizeMode="contain" style={styles.bigTimer}><Text style={styles.bigTimerLabel}>{onboardingFlow ? 'WELCOME' : canOpen ? 'あと' : '状態'}</Text><Text style={styles.bigTimerValue}>{onboardingFlow ? !dailyHydrated ? '準備中' : opening ? '開封中' : rewardInProgress ? '受取中' : 'BOX' : canOpen ? `${minutes}:${seconds}` : opening ? '開封中' : rewardInProgress ? '受取中' : !dailyHydrated ? '読込中' : dailyStatus === 'opened' ? '開封済' : dailyStatus === 'expired' ? '期限切れ' : '待機中'}</Text></ImageBackground></View>
      <View style={{ width: encounterBoardBaseWidth * encounterBoardScale, height: encounterBoardBaseHeight * encounterBoardScale }}>
      <ImageBackground source={MOBBY_TIME_BOARD} resizeMode="stretch" style={[styles.encounterCard, { width: encounterBoardBaseWidth, height: encounterBoardBaseHeight, transform: [{ scale: encounterBoardScale }], transformOrigin: 'top left' }]} imageStyle={styles.encounterCardImage}>
        <View style={styles.arrivalNotice}><Text style={styles.arrivalNoticeText}>{statusMessage}</Text></View>
        <View style={styles.encounterScene}>
          {opening ? (
            <View pointerEvents="none" style={styles.openingLightLayer}>
              <Animated.View style={[styles.openingLightBeam, openingLightBeamStyle]} />
              <Animated.View style={[styles.openingLightRay, styles.openingLightRayLeft, openingLightLeftRayStyle]} />
              <Animated.View style={[styles.openingLightRay, styles.openingLightRayRight, openingLightRightRayStyle]} />
            </View>
          ) : null}
          {opening ? (
            <Animated.View style={[styles.packageAnimationWrap, packageTransform]}>
              <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.revealPackageTouch}>
                {packageArtwork}
              </View>
            </Animated.View>
          ) : !revealed ? (
            <Animated.View style={[styles.packageAnimationWrap, packageTransform]}>
            <Pressable accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onPress={startOpening} disabled={!canOpen || opening} style={({ pressed }) => [styles.revealPackageTouch, pressed && styles.packagePressed]}>
              {packageArtwork}
            </Pressable>
            </Animated.View>
          ) : <>
            <Animated.View style={[styles.encounterRewardWrap, { transform: placing ? [{ translateY: placementMotion.interpolate({ inputRange: [0, 1], outputRange: [-20, placementDistance] }) }, { scale: placementMotion.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 1.16, 0.86] }) }, { rotate: placementMotion.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '-5deg', '0deg'] }) }] : placed ? [{ scale: revealMotion }] : [{ translateY: -20 }, { scale: revealMotion }] }]}>
              <Animated.View style={rewardIdleTransform}>
                <Image source={rewardImage} resizeMode="contain" style={[styles.encounterKeyImage, todayVariant === 'key-small' && styles.encounterSmallKeyImage, todayVariant === 'plush' && styles.encounterPlushImage]} />
              </Animated.View>
            </Animated.View>
          </>}
          {opening ? <View pointerEvents="none" style={styles.magicParticles}><Text style={styles.magicParticle}>✦</Text><Text style={styles.magicParticle}>✧</Text><Text style={styles.magicParticle}>✦</Text><Text style={styles.magicParticle}>✧</Text></View> : null}
          <ParticleBurst type="sparkle" count={reduceMotion ? 4 : opening ? 8 : 12} large={revealed} active={opening || (revealed && !placing && !placed)} burstKey={stage} seed={`${today.id}-${stage}`} style={styles.timeParticleBurst} />
          {placing ? <Animated.View pointerEvents="none" style={[styles.placementSparkles, { opacity: placementBurst }]}><Text style={styles.placementSparkle}>✦</Text><Text style={styles.placementSparkle}>✧</Text><Text style={styles.placementSparkle}>★</Text><Text style={styles.placementSparkle}>✦</Text><Text style={styles.placementSparkle}>✧</Text></Animated.View> : null}
          <ImageBackground source={MOBBY_TIME_MESSAGE_PLAQUE} resizeMode="contain" style={styles.encounterBubble}><Text style={styles.encounterBubbleTitle}>{!active ? onboardingFlow ? '準備中' : 'また明日' : placed ? '飾ったよ' : placing ? `${placement}へ移動中` : revealed ? rewardName : opening ? 'もうすぐ会えるよ' : '箱をタップ'}</Text><Text style={styles.encounterBubbleText}>{!active ? onboardingFlow ? 'グッズを安全に保存しています' : '次のMOBBY TIMEを待ってね' : placed ? `${collectibleVariantLabel(todayVariant)}が${placement}に仲間入り` : placing ? '大切に飾っています' : revealed ? `${onboardingFlow ? '最初' : '今日'}の${collectibleVariantLabel(todayVariant)}` : opening ? 'なにが入っているかな' : '開封しよう'}</Text></ImageBackground>
          {revealed && !placed && !placing ? <ImageBackground source={MOBBY_TIME_REWARD_SEAL} resizeMode="contain" style={styles.newBadge}><Text style={styles.newBadgeText}>NEW!</Text></ImageBackground> : null}
        </View>
        {!revealed ? <MobbyAssetButton accessibilityLabel={openButtonLabel} accessibilityState={{ disabled: !canOpen || opening }} disabled={!canOpen || opening} onPress={startOpening} style={[styles.encounterOpenButton, (!canOpen || opening) && styles.encounterOpenButtonDisabled]} contentStyle={styles.encounterOpenButtonAsset}><Text style={styles.encounterOpenButtonText}>{openButtonLabel}</Text></MobbyAssetButton> : null}
        {revealed ? <MobbyAssetButton accessibilityLabel={placed ? '配置完了' : `${placement}に追加する`} accessibilityState={{ disabled: placed || !active || placing }} onPress={onPlace} disabled={placed || !active || placing} tone="cream" style={[styles.timePrimaryButton, (placed || !active || placing) && styles.timePrimaryButtonInactive]} contentStyle={styles.assetButtonInner}><Image source={MOBBY_ICON} resizeMode="contain" style={styles.primaryButtonIcon} /><Text style={[styles.primaryButtonText, styles.timePrimaryButtonText]}>{placed ? '配置完了' : placing ? `${placement}へ飾り付け中…` : `${placement}に追加する`}</Text></MobbyAssetButton> : <View style={styles.packageCaptionSpacer} />}
      </ImageBackground>
      </View>
    </Animated.View>
  );
}
