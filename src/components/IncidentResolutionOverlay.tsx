import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text as RNText, View, type ImageSourcePropType, type TextProps } from 'react-native';

import type { IncidentAllyActor } from '@/components/InvestigationScreen';
import type { EnemyCase } from '@/data/enemyCases';

export type IncidentResolutionEnemyReward = {
  name: string;
  role: string;
  method: string;
  image: ImageSourcePropType;
  affiliationLabel: string;
};

export type IncidentResolutionComicFrame = {
  panel: 1 | 2 | 3 | 4;
  caption: string;
  alt: string;
  image?: ImageSourcePropType;
};

export type IncidentResolutionComicReward = {
  title: string;
  targetName: string;
  image?: ImageSourcePropType;
  frames: readonly [IncidentResolutionComicFrame, IncidentResolutionComicFrame, IncidentResolutionComicFrame, IncidentResolutionComicFrame];
};

export type IncidentResolutionOverlayProps = {
  phase: 'returning' | 'resolved';
  caseData: EnemyCase;
  targetName: string;
  targetImage: ImageSourcePropType;
  rewardImage: ImageSourcePropType;
  allyActors?: readonly IncidentAllyActor[];
  newEnemy?: IncidentResolutionEnemyReward | null;
  newComic?: IncidentResolutionComicReward | null;
  onDismiss: () => void;
  onOpenCasebook?: () => void;
  onReturnComplete?: () => void;
  onUiSound?: (sound: 'reveal' | 'reward' | 'tap') => void;
  reduceMotion?: boolean;
};

type RewardStep = 'enemy' | 'comic' | 'done';

function Text(props: TextProps) {
  return <RNText maxFontSizeMultiplier={1.25} {...props} />;
}

function firstRewardStep(newEnemy?: IncidentResolutionEnemyReward | null, newComic?: IncidentResolutionComicReward | null): RewardStep {
  if (newEnemy) return 'enemy';
  if (newComic) return 'comic';
  return 'done';
}

export function IncidentResolutionOverlay({
  phase,
  caseData,
  targetName,
  targetImage,
  rewardImage,
  allyActors = [],
  newEnemy,
  newComic,
  onDismiss,
  onOpenCasebook,
  onReturnComplete,
  onUiSound,
  reduceMotion = false,
}: IncidentResolutionOverlayProps) {
  const [rewardStep, setRewardStep] = useState<RewardStep>(() => firstRewardStep(newEnemy, newComic));
  const returnMotion = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const revealMotion = useRef(new Animated.Value(reduceMotion || !newEnemy ? 1 : 0)).current;
  const soundKey = useRef('');
  const ally = allyActors.find((actor) => actor.slot === 'lead');
  const enemyRewardName = newEnemy?.name;
  const comicRewardTitle = newComic?.title;

  useEffect(() => {
    if (phase === 'resolved') setRewardStep(enemyRewardName ? 'enemy' : comicRewardTitle ? 'comic' : 'done');
  }, [comicRewardTitle, enemyRewardName, phase]);

  useEffect(() => {
    if (phase === 'returning') {
      returnMotion.stopAnimation();
      returnMotion.setValue(reduceMotion ? 1 : 0);
      Animated.timing(returnMotion, {
        toValue: 1,
        duration: reduceMotion ? 1 : 900,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onReturnComplete?.();
      });
    } else if (rewardStep === 'enemy') {
      revealMotion.stopAnimation();
      revealMotion.setValue(reduceMotion ? 1 : 0);
      Animated.timing(revealMotion, {
        toValue: 1,
        duration: reduceMotion ? 1 : 720,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      revealMotion.stopAnimation();
      revealMotion.setValue(1);
    }

    if (phase === 'resolved') {
      const nextSound = rewardStep === 'enemy' ? 'reveal' : rewardStep === 'comic' ? 'reward' : null;
      const nextKey = `${newEnemy?.name ?? ''}:${newComic?.title ?? ''}:${rewardStep}`;
      if (nextSound && soundKey.current !== nextKey) {
        soundKey.current = nextKey;
        onUiSound?.(nextSound);
      }
    }
    return () => {
      returnMotion.stopAnimation();
      revealMotion.stopAnimation();
    };
  }, [newComic?.title, newEnemy?.name, onReturnComplete, onUiSound, phase, reduceMotion, returnMotion, revealMotion, rewardStep]);

  const advanceReward = () => {
    onUiSound?.('tap');
    if (rewardStep === 'enemy') setRewardStep(newComic ? 'comic' : 'done');
    else if (rewardStep === 'comic') setRewardStep('done');
  };

  return <View
    style={styles.overlay}
    accessibilityViewIsModal
    accessibilityLiveRegion="assertive"
    onAccessibilityEscape={phase === 'resolved' ? onDismiss : undefined}
  >
    <View pointerEvents="none" style={styles.dim} />
    {phase === 'returning' ? <ReturningStage targetName={targetName} targetImage={targetImage} ally={ally} motion={returnMotion} reduceMotion={reduceMotion} /> : null}
    {phase === 'resolved' && rewardStep === 'enemy' && newEnemy ? <EnemyRevealStage enemy={newEnemy} motion={revealMotion} reduceMotion={reduceMotion} hasComic={Boolean(newComic)} onNext={advanceReward} /> : null}
    {phase === 'resolved' && rewardStep === 'comic' && newComic ? <ComicRewardStage comic={newComic} motion={revealMotion} onNext={advanceReward} /> : null}
    {phase === 'resolved' && rewardStep === 'done' ? <ResolvedStage caseData={caseData} targetName={targetName} rewardImage={rewardImage} motion={revealMotion} onDismiss={onDismiss} onOpenCasebook={onOpenCasebook} onUiSound={onUiSound} /> : null}
  </View>;
}

function ReturningStage({ targetName, targetImage, ally, motion, reduceMotion }: { targetName: string; targetImage: ImageSourcePropType; ally?: IncidentAllyActor; motion: Animated.Value; reduceMotion: boolean }) {
  return <View style={styles.stage} accessible accessibilityLabel={`${targetName}を救出。ホームへ帰還中です`}>
    <Text style={styles.progress}>4 / 4　救出</Text>
    <Text numberOfLines={2} style={styles.title}>見つけた。本物の{targetName}だ</Text>
    <Animated.View style={[styles.returnPair, { opacity: motion, transform: [{ translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 0 : 54, 0] }) }, { scale: motion.interpolate({ inputRange: [0, 1], outputRange: [.9, 1] }) }] }]}>
      {ally ? <View style={styles.actor}><Image source={ally.image} resizeMode="contain" style={styles.allyImage} /><Text style={styles.allyBadge}>協力モビー</Text><Text style={styles.actorName}>{ally.name}</Text></View> : null}
      <View style={styles.actor}><Image source={targetImage} resizeMode="contain" style={styles.targetImage} /><Text style={styles.targetBadge}>被害モビー・救出</Text><Text style={styles.actorName}>{targetName}</Text></View>
    </Animated.View>
    <Mission objective={`${targetName}を安全に連れ帰る`} completion="いつものホームへ到着する" />
    <View style={styles.auto}><Text style={styles.autoText}>ホームへ帰還中…</Text></View>
  </View>;
}

function EnemyRevealStage({ enemy, motion, reduceMotion, hasComic, onNext }: { enemy: IncidentResolutionEnemyReward; motion: Animated.Value; reduceMotion: boolean; hasComic: boolean; onNext: () => void }) {
  const affiliation = enemy.affiliationLabel.includes('敵対') ? enemy.affiliationLabel : `${enemy.affiliationLabel}・敵対`;
  return <View style={styles.stage} accessible accessibilityLabel={`新しい怪盗の正体判明。${enemy.name}。${affiliation}。役割、${enemy.role}。盗み方、${enemy.method}`}>
    <Text style={styles.progress}>事件報酬 1 / {hasComic ? 2 : 1}</Text>
    <View style={styles.updateBadge}><Text style={styles.updateBadgeText}>怪盗名簿 更新</Text></View>
    <Text style={styles.title}>怪盗の正体が明らかに</Text>
    <View style={styles.revealHero} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <GenericSilhouette />
      <Animated.Image source={enemy.image} resizeMode="contain" style={[styles.enemyImage, { opacity: motion, transform: [{ scale: motion.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 1 : .86, 1] }) }] }]} />
    </View>
    <Animated.View style={[styles.revealCopy, { opacity: motion }]}>
      <Text numberOfLines={1} style={styles.enemyName}>{enemy.name}</Text>
      <Text style={styles.enemyAffiliation}>◆ {affiliation}</Text>
      <Text numberOfLines={2} style={styles.enemyMethod}>{enemy.role}　／　{enemy.method}</Text>
    </Animated.View>
    <Pressable accessibilityRole="button" accessibilityLabel={hasComic ? '次へ、救出4コマを受け取る' : '怪盗名簿の更新を確認する'} onPress={onNext} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>{hasComic ? '次へ：救出4コマ' : '名簿更新を確認'}</Text></Pressable>
  </View>;
}

function ComicRewardStage({ comic, motion, onNext }: { comic: IncidentResolutionComicReward; motion: Animated.Value; onNext: () => void }) {
  return <View style={styles.stage} accessible accessibilityLabel={`救出4コマ獲得。${comic.title}。事件手帳に保存しました`}>
    <Text style={styles.progress}>事件報酬　救出4コマ</Text>
    <Text style={styles.title}>救出4コマを獲得！</Text>
    <Text style={styles.comicTarget}>{comic.targetName}との事件記録</Text>
    <Animated.View style={[styles.comicCanvas, { opacity: motion, transform: [{ scale: motion.interpolate({ inputRange: [0, 1], outputRange: [.94, 1] }) }] }]}>
      {comic.image ? <Image source={comic.image} resizeMode="contain" style={styles.comicFullImage} /> : <View style={styles.frameGrid}>{comic.frames.map((frame) => <RewardFrame key={frame.panel} frame={frame} />)}</View>}
    </Animated.View>
    <View style={styles.savedBadge}><Text style={styles.savedBadgeText}>✓ 事件手帳に記録保存済み</Text><Text style={styles.savedSubtext}>{comic.image ? comic.title : 'イラスト準備中・記録は読めます'}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel="事件の報酬を確認する" onPress={onNext} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>報酬を確認</Text></Pressable>
  </View>;
}

function RewardFrame({ frame }: { frame: IncidentResolutionComicFrame }) {
  return <View style={styles.frame}>
    <Text style={styles.frameNumber}>FRAME {frame.panel}</Text>
    {frame.image ? <Image source={frame.image} resizeMode="cover" style={styles.frameImage} /> : <View style={styles.framePlaceholder}><Text style={styles.frameSpark}>✦</Text><Text style={styles.preparing}>イラスト準備中</Text></View>}
    <Text numberOfLines={3} style={styles.frameCaption}>{frame.caption}</Text>
  </View>;
}

function ResolvedStage({ caseData, targetName, rewardImage, motion, onDismiss, onOpenCasebook, onUiSound }: { caseData: EnemyCase; targetName: string; rewardImage: ImageSourcePropType; motion: Animated.Value; onDismiss: () => void; onOpenCasebook?: () => void; onUiSound?: (sound: 'reveal' | 'reward' | 'tap') => void }) {
  const openCasebook = () => { onUiSound?.('tap'); onOpenCasebook?.(); };
  const dismiss = () => { onUiSound?.('tap'); onDismiss(); };
  return <View style={styles.stage} accessible accessibilityLabel={`事件解決。おかえり、${targetName}。${caseData.rewardTitle}`}>
    <Text style={styles.progress}>4 / 4　事件解決</Text>
    <Text style={styles.title}>おかえり、{targetName}</Text>
    <Animated.View style={[styles.rewardHalo, { opacity: motion, transform: [{ scale: motion.interpolate({ inputRange: [0, 1], outputRange: [.92, 1] }) }] }]}><Image source={rewardImage} resizeMode="contain" style={styles.reward} /></Animated.View>
    <View style={styles.identityRow}><Text style={styles.targetBadge}>被害モビー・救出済み</Text><Text style={styles.actorName}>{targetName}</Text></View>
    <View><Text numberOfLines={1} style={styles.rewardTitle}>{caseData.rewardTitle}</Text><Text numberOfLines={2} style={styles.rewardCopy}>{caseData.rewardCopy}</Text></View>
    {onOpenCasebook ? <Pressable accessibilityRole="button" accessibilityLabel="事件手帳で名簿と4コマを見る" onPress={openCasebook} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>事件手帳を見る</Text></Pressable> : null}
    <Pressable accessibilityRole="button" accessibilityLabel="ホームへ帰って事件を完了する" onPress={dismiss} style={({ pressed }) => [onOpenCasebook ? styles.secondaryButton : styles.button, pressed && styles.pressed]}><Text style={onOpenCasebook ? styles.secondaryButtonText : styles.buttonText}>ホームへ帰る</Text></Pressable>
  </View>;
}

function GenericSilhouette() {
  return <View style={styles.silhouette}><View style={styles.silhouetteHead} /><View style={styles.silhouetteBody} /></View>;
}

function Mission({ objective, completion }: { objective: string; completion: string }) {
  return <View style={styles.mission} accessible accessibilityLabel={`いまの目的、${objective}。できたら完了、${completion}`}>
    <View style={styles.missionColumn}><Text style={styles.missionLabel}>いまの目的</Text><Text numberOfLines={2} style={styles.missionText}>{objective}</Text></View><View style={styles.divider} /><View style={styles.missionColumn}><Text style={styles.doneLabel}>✓ できたら完了</Text><Text numberOfLines={2} style={styles.doneText}>{completion}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 180, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#100C17' },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,4,11,.94)' },
  stage: { width: '100%', height: '89%', maxHeight: 640, minHeight: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1C1323', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#6E4C60' },
  progress: { width: '100%', minHeight: 22, flexShrink: 0, color: '#F3DDE2', fontSize: 14, lineHeight: 18, fontWeight: '800' },
  title: { color: '#FFF8F2', fontSize: 25, lineHeight: 31, fontWeight: '900', textAlign: 'center' },
  returnPair: { width: '100%', flex: 1, minHeight: 140, maxHeight: 230, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  actor: { flex: 1, minWidth: 0, alignItems: 'center' },
  allyImage: { width: 158, height: 170 },
  targetImage: { width: 172, height: 184 },
  actorName: { color: '#FFF8F2', fontSize: 17, lineHeight: 22, fontWeight: '900', textAlign: 'center' },
  allyBadge: { color: '#3A354D', fontSize: 12, fontWeight: '900', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, overflow: 'hidden', backgroundColor: '#CDE8F7' },
  targetBadge: { color: '#452D35', fontSize: 12, fontWeight: '900', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, overflow: 'hidden', backgroundColor: '#FFD6D9' },
  identityRow: { alignItems: 'center', gap: 3 },
  updateBadge: { paddingHorizontal: 13, paddingVertical: 5, borderRadius: 13, backgroundColor: '#C74761' },
  updateBadgeText: { color: '#FFF', fontSize: 14, lineHeight: 18, fontWeight: '900' },
  revealHero: { flex: 1, minHeight: 148, maxHeight: 230, width: 240, alignItems: 'center', justifyContent: 'center' },
  silhouette: { position: 'absolute', width: 146, height: 200, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10 },
  silhouetteHead: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#504650' },
  silhouetteBody: { width: 132, height: 126, marginTop: -3, borderTopLeftRadius: 66, borderTopRightRadius: 66, backgroundColor: '#504650' },
  enemyImage: { position: 'absolute', width: 260, height: '108%' },
  revealCopy: { width: '100%', alignItems: 'center', gap: 3 },
  enemyName: { color: '#FFF8F2', fontSize: 25, lineHeight: 30, fontWeight: '900' },
  enemyAffiliation: { color: '#FFC5CF', fontSize: 14, lineHeight: 18, fontWeight: '900' },
  enemyMethod: { color: '#F3E5E2', fontSize: 17, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  comicTarget: { color: '#F6CCD5', fontSize: 17, lineHeight: 22, fontWeight: '800' },
  comicCanvas: { flex: 1, minHeight: 180, maxHeight: 290, width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFF', borderWidth: 2, borderColor: '#5A454E' },
  comicFullImage: { width: '100%', height: '100%' },
  frameGrid: { flex: 1, minHeight: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 4 },
  frame: { width: '49.3%', height: '49.3%', minHeight: 0, overflow: 'hidden', borderWidth: 1, borderColor: '#5B4A52', backgroundColor: '#FFFDF9' },
  frameNumber: { position: 'absolute', top: 3, left: 4, zIndex: 2, color: '#8B5D6B', fontSize: 10, lineHeight: 13, fontWeight: '900' },
  frameImage: { flex: 1, minHeight: 0, width: '100%' },
  framePlaceholder: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1E7EA' },
  frameSpark: { color: '#9B7080', fontSize: 21, lineHeight: 25, fontWeight: '900' },
  preparing: { color: '#715D65', fontSize: 11, lineHeight: 14, fontWeight: '800' },
  frameCaption: { minHeight: 61, color: '#493740', fontSize: 17, lineHeight: 19, fontWeight: '700', paddingHorizontal: 4, paddingVertical: 2 },
  savedBadge: { width: '100%', alignItems: 'center', paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(126,182,147,.15)' },
  savedBadgeText: { color: '#BCE2C9', fontSize: 17, lineHeight: 21, fontWeight: '900' },
  savedSubtext: { color: '#E5D9D5', fontSize: 13, lineHeight: 17, fontWeight: '700' },
  rewardHalo: { flex: 1, minHeight: 130, maxHeight: 205, width: 228, borderRadius: 110, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(244,192,119,.12)' },
  reward: { width: 220, height: '100%' },
  rewardTitle: { color: '#FFE4A7', fontSize: 21, lineHeight: 27, fontWeight: '900', textAlign: 'center' },
  rewardCopy: { color: '#F0E5E2', fontSize: 17, lineHeight: 22, fontWeight: '600', textAlign: 'center', marginTop: 3 },
  mission: { width: '100%', minHeight: 76, flexShrink: 0, flexDirection: 'row', borderRadius: 17, padding: 10, backgroundColor: 'rgba(255,248,242,.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,.16)' },
  missionColumn: { flex: 1, justifyContent: 'center' },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,.18)', marginHorizontal: 10 },
  missionLabel: { color: '#FFADB7', fontSize: 12, fontWeight: '900' },
  missionText: { color: '#FFF', fontSize: 17, lineHeight: 21, fontWeight: '700' },
  doneLabel: { color: '#FFD891', fontSize: 12, fontWeight: '900' },
  doneText: { color: '#FFF', fontSize: 17, lineHeight: 21, fontWeight: '700' },
  auto: { width: '100%', minHeight: 54, flexShrink: 0, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(214,78,100,.35)' },
  autoText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  button: { width: '100%', minHeight: 54, flexShrink: 0, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D64E64' },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  secondaryButton: { width: '100%', minHeight: 44, flexShrink: 0, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D8BAC2', backgroundColor: 'rgba(255,255,255,.08)' },
  secondaryButtonText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  pressed: { opacity: .8, transform: [{ scale: .98 }] },
});
