import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  View,
  type GestureResponderEvent,
  type TextProps,
} from 'react-native';

import {
  claimGate,
  getEpisodeProgress,
  normalizePlaybackState,
  shouldAnimateEpisodeTransition,
} from '@/data/episodes/playback';
import { resolveEpisodeAsset } from '@/data/episodes/registry';
import type {
  CompletionResult,
  Cue,
  EpisodeData,
  PlaybackState,
  Scene,
  SwipeInteraction,
} from '@/data/episodes/types';

export type EpisodePlayerProps = {
  episode: EpisodeData;
  initialState?: Partial<PlaybackState>;
  reduceMotion?: boolean;
  onCue?: (cue: Cue) => void;
  onProgress?: (state: PlaybackState) => void;
  onInterrupt?: (state: PlaybackState) => void;
  onComplete: (result: CompletionResult) => void;
};

function Text(props: TextProps) {
  return <RNText {...props} />;
}

const isMotionCue = (cue: Cue) => cue.startsWith('zoom-') || cue.startsWith('transition-');

export function EpisodePlayer({
  episode,
  initialState,
  reduceMotion = false,
  onCue,
  onProgress,
  onInterrupt,
  onComplete,
}: EpisodePlayerProps) {
  const sceneMap = useMemo(() => new Map(episode.scenes.map((scene) => [scene.id, scene])), [episode]);
  const [state, setState] = useState<PlaybackState>(() => normalizePlaybackState(episode, initialState));
  const [feedback, setFeedback] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isInterrupted, setIsInterrupted] = useState(false);
  const transition = useRef(new Animated.Value(1)).current;
  const stateRef = useRef(state);
  const episodeRef = useRef(episode);
  const completionGate = useRef(false);
  const interruptGate = useRef(false);
  const lifecycle = useRef({ generation: 0 }).current;
  const onCueRef = useRef(onCue);
  const onProgressRef = useRef(onProgress);
  const onInterruptRef = useRef(onInterrupt);
  const onCompleteRef = useRef(onComplete);
  onCueRef.current = onCue;
  onProgressRef.current = onProgress;
  onInterruptRef.current = onInterrupt;
  onCompleteRef.current = onComplete;

  const commitState = useCallback((update: (current: PlaybackState) => PlaybackState) => {
    const current = stateRef.current;
    const next = update(current);
    if (next === current) return;
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    if (episodeRef.current === episode) return;
    episodeRef.current = episode;
    const next = normalizePlaybackState(episode, initialState);
    completionGate.current = false;
    interruptGate.current = false;
    stateRef.current = next;
    setState(next);
    setFeedback('');
    setIsCompleted(false);
    setIsInterrupted(false);
  }, [episode, initialState]);

  useEffect(() => {
    if (state.episodeId === episode.id && state.contentVersion === episode.contentVersion) {
      onProgressRef.current?.(state);
    }
  }, [episode.contentVersion, episode.id, state]);

  useEffect(() => {
    const generation = ++lifecycle.generation;
    return () => {
      // Deferring distinguishes a real unmount from Strict Mode's effect replay.
      Promise.resolve().then(() => {
        if (lifecycle.generation !== generation || completionGate.current || !claimGate(interruptGate)) return;
        onInterruptRef.current?.(stateRef.current);
      });
    };
  }, [lifecycle]);

  const emitCue = useCallback((cue: Cue) => {
    if (reduceMotion && isMotionCue(cue)) return;
    onCueRef.current?.(cue);
  }, [reduceMotion]);

  const scene = sceneMap.get(state.sceneId) ?? episode.scenes[0];
  const safeLineIndex = Math.min(state.lineIndex, Math.max(0, (scene?.lines.length ?? 1) - 1));
  const line = scene?.lines[safeLineIndex];
  const interactionDone = Boolean(scene?.interaction && state.completedInteractionIds.includes(scene.interaction.id));
  const routeProgress = useMemo(() => getEpisodeProgress(episode, scene?.id ?? episode.entrySceneId), [episode, scene?.id]);
  const playerLocked = isCompleted || isInterrupted;

  useEffect(() => {
    if (!scene) return;
    setFeedback('');
    scene.cues?.forEach(emitCue);
    if (!shouldAnimateEpisodeTransition(reduceMotion)) return;
    transition.stopAnimation();
    transition.setValue(0);
    Animated.timing(transition, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [emitCue, reduceMotion, scene, transition]);

  useEffect(() => {
    if (line?.cue) emitCue(line.cue);
  }, [emitCue, line?.cue]);

  const updateScene = useCallback((nextSceneId: string) => {
    if (!sceneMap.has(nextSceneId)) return;
    commitState((current) => ({
      ...current,
      sceneId: nextSceneId,
      lineIndex: 0,
      visitedSceneIds: current.visitedSceneIds.includes(nextSceneId)
        ? current.visitedSceneIds
        : [...current.visitedSceneIds, nextSceneId],
    }));
  }, [commitState, sceneMap]);

  const finishInteraction = useCallback(() => {
    if (playerLocked) return;
    const current = stateRef.current;
    const activeScene = sceneMap.get(current.sceneId);
    const interaction = activeScene?.interaction;
    if (!interaction || interaction.kind === 'tap' || interaction.kind === 'choice' || current.completedInteractionIds.includes(interaction.id)) return;
    emitCue(interaction.cue ?? 'vibrate-light');
    setFeedback(interaction.successText);
    commitState((latest) => latest.completedInteractionIds.includes(interaction.id) ? latest : ({
      ...latest,
      completedInteractionIds: [...latest.completedInteractionIds, interaction.id],
    }));
  }, [commitState, emitCue, playerLocked, sceneMap]);

  const recordTap = useCallback(() => {
    if (playerLocked) return;
    const current = stateRef.current;
    const activeScene = sceneMap.get(current.sceneId);
    const interaction = activeScene?.interaction;
    if (!interaction || interaction.kind !== 'tap' || current.completedInteractionIds.includes(interaction.id)) return;
    const requiredTaps = interaction.requiredTaps ?? 1;
    const tapCount = Math.min(requiredTaps, (current.interactionProgress[interaction.id] ?? 0) + 1);
    const completed = tapCount >= requiredTaps;
    const next: PlaybackState = {
      ...current,
      interactionProgress: { ...current.interactionProgress, [interaction.id]: tapCount },
      completedInteractionIds: completed
        ? [...current.completedInteractionIds, interaction.id]
        : current.completedInteractionIds,
    };
    stateRef.current = next;
    setState(next);
    if (completed) {
      emitCue(interaction.cue ?? 'vibrate-light');
      setFeedback(interaction.successText);
    } else setFeedback(`${tapCount} / ${requiredTaps}`);
  }, [emitCue, playerLocked, sceneMap]);

  const selectChoice = useCallback((optionId: string) => {
    if (playerLocked) return;
    const current = stateRef.current;
    const activeScene = sceneMap.get(current.sceneId);
    const interaction = activeScene?.interaction;
    if (!interaction || interaction.kind !== 'choice') return;
    const option = interaction.options.find((candidate) => candidate.id === optionId);
    if (!option || !sceneMap.has(option.nextSceneId)) return;
    emitCue(interaction.cue ?? 'vibrate-light');
    const completedInteractionIds = current.completedInteractionIds.includes(interaction.id)
      ? current.completedInteractionIds
      : [...current.completedInteractionIds, interaction.id];
    commitState((latest) => ({
      ...latest,
      sceneId: option.nextSceneId,
      lineIndex: 0,
      completedInteractionIds,
      choices: { ...latest.choices, [interaction.id]: option.id },
      visitedSceneIds: latest.visitedSceneIds.includes(option.nextSceneId)
        ? latest.visitedSceneIds
        : [...latest.visitedSceneIds, option.nextSceneId],
    }));
  }, [commitState, emitCue, playerLocked, sceneMap]);

  const advance = useCallback(() => {
    if (playerLocked) return;
    const current = stateRef.current;
    const activeScene = sceneMap.get(current.sceneId);
    if (!activeScene) return;
    const lastLineIndex = Math.max(0, activeScene.lines.length - 1);
    if (current.lineIndex < lastLineIndex) {
      commitState((latest) => ({ ...latest, lineIndex: Math.min(lastLineIndex, latest.lineIndex + 1) }));
      return;
    }
    if (activeScene.interaction && !current.completedInteractionIds.includes(activeScene.interaction.id)) return;
    if (activeScene.kind === 'after-credits') {
      if (!claimGate(completionGate)) return;
      setIsCompleted(true);
      const finalState = { ...current, lineIndex: lastLineIndex };
      stateRef.current = finalState;
      setState(finalState);
      onCompleteRef.current({
        episodeId: episode.id,
        contentVersion: episode.contentVersion,
        completedAt: new Date().toISOString(),
        finalState,
        enemyId: episode.enemyId,
        featuredMobbyId: episode.featuredMobbyId,
      });
      return;
    }
    if (activeScene.nextSceneId) updateScene(activeScene.nextSceneId);
  }, [commitState, episode.contentVersion, episode.enemyId, episode.featuredMobbyId, episode.id, playerLocked, sceneMap, updateScene]);

  const interrupt = useCallback(() => {
    if (completionGate.current || !claimGate(interruptGate)) return;
    setIsInterrupted(true);
    onInterruptRef.current?.(stateRef.current);
  }, []);

  if (!scene || !line) {
    return <View style={styles.fallback}><Text style={styles.fallbackText}>エピソードを表示できません</Text></View>;
  }

  const background = resolveEpisodeAsset(scene.backgroundAssetId);
  const canAdvance = !playerLocked && (safeLineIndex < scene.lines.length - 1 || !scene.interaction || interactionDone);
  const tapCount = scene.interaction?.kind === 'tap' ? state.interactionProgress[scene.interaction.id] ?? 0 : 0;
  const finalLine = scene.kind === 'after-credits' && safeLineIndex === scene.lines.length - 1;

  const stage = (
    <ScrollView
      contentContainerStyle={styles.stageContent}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.stage}
    >
      <View style={styles.topbar}>
        <View style={styles.heading}>
          <Text style={styles.chapter}>{episode.chapter} · {scene.title ?? episode.title}</Text>
          <Text accessibilityLabel={`場面 ${routeProgress.current}、全${routeProgress.total}場面`} style={styles.progress}>{routeProgress.current}/{routeProgress.total}</Text>
        </View>
        <Pressable
          accessibilityLabel={isInterrupted ? '中断済み' : 'エピソードを中断'}
          accessibilityRole="button"
          accessibilityState={{ disabled: playerLocked }}
          disabled={playerLocked}
          hitSlop={8}
          onPress={interrupt}
          style={[styles.close, playerLocked && styles.disabled]}
        >
          <Text style={styles.closeText}>{isInterrupted ? '中断済み' : '中断'}</Text>
        </Pressable>
      </View>
      <View style={styles.actors}>
        {scene.actors?.map((actor) => <ActorView key={actor.id} actor={actor} />)}
        {scene.visualOverlay
          ? <View accessibilityLabel={scene.visualOverlay.accessibilityLabel} accessible style={styles.visualOverlay}><Text style={styles.visualOverlayText}>{scene.visualOverlay.text}</Text></View>
          : null}
      </View>
      <InteractionView
        completed={interactionDone}
        disabled={playerLocked}
        feedback={feedback}
        onChoice={selectChoice}
        onComplete={finishInteraction}
        onTap={recordTap}
        scene={scene}
        tapCount={tapCount}
      />
      <Pressable
        accessibilityLabel={isCompleted ? 'エピソード完了済み' : canAdvance ? finalLine ? 'エピソードを完了' : '次の台詞へ' : scene.interaction?.prompt}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canAdvance }}
        disabled={!canAdvance}
        onPress={advance}
        style={({ pressed }) => [styles.dialogue, !canAdvance && styles.dialogueWaiting, pressed && canAdvance && styles.pressed]}
      >
        <Text style={styles.speaker}>{line.speaker}</Text>
        <Text style={styles.line}>{line.text}</Text>
        <Text style={styles.next}>{isCompleted ? '完了しました' : canAdvance ? finalLine ? '完了' : 'タップして進む ›' : scene.interaction?.prompt}</Text>
      </Pressable>
    </ScrollView>
  );

  return (
    <View accessibilityLabel={`${episode.chapter} ${episode.title}`} style={styles.root}>
      {background
        ? <Image accessibilityLabel={background.accessibilityLabel} resizeMode="cover" source={background.source} style={StyleSheet.absoluteFill} />
        : <View style={[StyleSheet.absoluteFill, styles.missing]}><Text style={styles.missingText}>背景：{scene.backgroundAssetId}</Text></View>}
      <View style={styles.scrim} />
      {reduceMotion
        ? <View style={styles.stageFrame}>{stage}</View>
        : <Animated.View style={[styles.stageFrame, { opacity: transition, transform: [{ scale: transition.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }] }]}>{stage}</Animated.View>}
    </View>
  );
}

function ActorView({ actor }: { actor: NonNullable<Scene['actors']>[number] }) {
  const asset = resolveEpisodeAsset(actor.assetId);
  const sideStyle = actor.side === 'left' ? styles.actorLeft : actor.side === 'right' ? styles.actorRight : styles.actorCenter;
  return (
    <View style={[styles.actor, sideStyle, { transform: [{ scale: actor.scale ?? 1 }, { scaleX: actor.mirrored ? -1 : 1 }] }]}>
      {asset
        ? <Image accessibilityLabel={asset.accessibilityLabel} resizeMode="contain" source={asset.source} style={styles.actorImage} />
        : <View style={styles.actorFallback}><Text style={styles.actorFallbackText}>{actor.name}</Text></View>}
    </View>
  );
}

type InteractionViewProps = {
  scene: Scene;
  completed: boolean;
  disabled: boolean;
  feedback: string;
  tapCount: number;
  onComplete: () => void;
  onTap: () => void;
  onChoice: (id: string) => void;
};

function InteractionView({ scene, completed, disabled, feedback, tapCount, onComplete, onTap, onChoice }: InteractionViewProps) {
  const interaction = scene.interaction;
  if (!interaction || completed) {
    return feedback
      ? <View accessibilityLiveRegion="polite" style={styles.feedback}><Text style={styles.feedbackText}>✓ {feedback}</Text></View>
      : null;
  }
  if (interaction.kind === 'choice') {
    return (
      <View style={styles.interaction}>
        <Text style={styles.prompt}>{interaction.prompt}</Text>
        {interaction.options.map((option) => (
          <Pressable
            accessibilityState={{ disabled }}
            accessibilityRole="button"
            disabled={disabled}
            key={option.id}
            onPress={() => onChoice(option.id)}
            style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
          >
            <Text style={styles.choiceText}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  }
  if (interaction.kind === 'hold') return <HoldControl disabled={disabled} durationMs={interaction.durationMs} onComplete={onComplete} prompt={interaction.prompt} />;
  if (interaction.kind === 'swipe') return <SwipeControl disabled={disabled} interaction={interaction} onComplete={onComplete} />;
  const requiredTaps = interaction.requiredTaps ?? 1;
  return (
    <View style={styles.interaction}>
      <Pressable
        accessibilityLabel={`${interaction.prompt}、${tapCount}/${requiredTaps}`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onTap}
        style={({ pressed }) => [styles.gestureButton, pressed && styles.pressed]}
      >
        <Text style={styles.gestureText}>◎ {interaction.prompt}（{tapCount}/{requiredTaps}）</Text>
      </Pressable>
    </View>
  );
}

function HoldControl({ disabled, prompt, durationMs, onComplete }: { disabled: boolean; prompt: string; durationMs: number; onComplete: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => cancel, []);
  return (
    <View style={styles.interaction}>
      <Pressable
        accessibilityLabel={`${prompt}、${Math.ceil(durationMs / 100) / 10}秒`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPressIn={() => { cancel(); timer.current = setTimeout(onComplete, durationMs); }}
        onPressOut={cancel}
        style={({ pressed }) => [styles.gestureButton, pressed && styles.holding]}
      >
        <Text style={styles.gestureText}>● {prompt}</Text>
      </Pressable>
      <Pressable accessibilityLabel="長押し操作の代替ボタン" accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onComplete} style={styles.alternative}>
        <Text style={styles.alternativeText}>操作が難しいときはここをタップ</Text>
      </Pressable>
    </View>
  );
}

function SwipeControl({ disabled, interaction, onComplete }: { disabled: boolean; interaction: SwipeInteraction; onComplete: () => void }) {
  const start = useRef({ x: 0, y: 0 });
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: (event: GestureResponderEvent) => {
      start.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
    },
    onPanResponderRelease: (event: GestureResponderEvent) => {
      if (disabled) return;
      const dx = event.nativeEvent.pageX - start.current.x;
      const dy = event.nativeEvent.pageY - start.current.y;
      const threshold = interaction.threshold ?? 48;
      const accepted = interaction.direction === 'left'
        ? dx < -threshold
        : interaction.direction === 'right'
          ? dx > threshold
          : interaction.direction === 'up' ? dy < -threshold : dy > threshold;
      if (accepted) onComplete();
    },
  }), [disabled, interaction.direction, interaction.threshold, onComplete]);
  return (
    <View style={styles.interaction}>
      <View accessibilityLabel={interaction.prompt} accessibilityRole="button" accessibilityState={{ disabled }} accessible style={styles.swipePad} {...pan.panHandlers}>
        <Text style={styles.gestureText}>↔ {interaction.prompt}</Text>
      </View>
      <Pressable accessibilityLabel={`${interaction.prompt}の代替ボタン`} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onComplete} style={styles.alternative}>
        <Text style={styles.alternativeText}>スワイプの代わりにタップ</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 520, backgroundColor: '#251B2D', overflow: 'hidden' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25,14,31,0.38)' },
  stageFrame: { flex: 1 },
  stage: { flex: 1 },
  stageContent: { flexGrow: 1, padding: 16, paddingTop: 20 },
  topbar: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, zIndex: 5 },
  heading: { flex: 1, minHeight: 44, backgroundColor: 'rgba(35,22,40,0.82)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  chapter: { flex: 1, flexShrink: 1, color: '#FFF7E8', fontWeight: '900', fontSize: 14 },
  progress: { color: '#FFD6BC', fontWeight: '800' },
  close: { minWidth: 56, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: 'rgba(35,22,40,0.82)', paddingHorizontal: 8 },
  closeText: { color: '#FFF7E8', fontWeight: '900' },
  actors: { flexGrow: 1, minHeight: 220, position: 'relative', marginTop: 8 },
  actor: { position: 'absolute', bottom: -10, width: '55%', height: '100%', maxHeight: 390 },
  actorLeft: { left: '-3%' },
  actorCenter: { left: '22.5%' },
  actorRight: { right: '-3%' },
  actorImage: { width: '100%', height: '100%' },
  actorFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 30, backgroundColor: 'rgba(255,244,221,0.82)' },
  actorFallbackText: { color: '#613E55', fontWeight: '900' },
  visualOverlay: { position: 'absolute', left: '34%', right: '34%', bottom: 8, minWidth: 88, minHeight: 72, justifyContent: 'center', alignItems: 'center', borderRadius: 24, backgroundColor: 'rgba(255,247,232,0.9)', borderWidth: 2, borderColor: '#E4B37D' },
  visualOverlayText: { fontSize: 38, textAlign: 'center' },
  interaction: { gap: 8, marginBottom: 10, alignItems: 'stretch' },
  prompt: { color: '#FFF', fontWeight: '900', textAlign: 'center', textShadowColor: '#241424', textShadowRadius: 4 },
  gestureButton: { minHeight: 52, borderRadius: 18, backgroundColor: '#F08E7E', justifyContent: 'center', alignItems: 'center', padding: 14 },
  swipePad: { minHeight: 74, borderRadius: 18, backgroundColor: 'rgba(240,142,126,0.94)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  gestureText: { color: '#321F2A', fontWeight: '900', fontSize: 16, textAlign: 'center' },
  alternative: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: 'rgba(255,247,232,0.94)', padding: 10 },
  alternativeText: { color: '#613E55', fontWeight: '800', fontSize: 13, textAlign: 'center' },
  holding: { backgroundColor: '#FFD06C' },
  choice: { minHeight: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: '#FFF7E8', borderWidth: 2, borderColor: '#F08E7E', padding: 14 },
  choiceText: { color: '#613E55', fontWeight: '900', fontSize: 15, textAlign: 'center' },
  feedback: { minHeight: 44, justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(226,246,213,0.96)', padding: 12, marginBottom: 10 },
  feedbackText: { color: '#35552E', fontWeight: '900', textAlign: 'center' },
  dialogue: { minHeight: 132, borderRadius: 20, backgroundColor: 'rgba(255,247,232,0.96)', borderWidth: 2, borderColor: '#E4B37D', padding: 16, justifyContent: 'center' },
  dialogueWaiting: { opacity: 0.94 },
  speaker: { color: '#A54F65', fontWeight: '900', fontSize: 14, marginBottom: 6 },
  line: { color: '#3B2A32', fontWeight: '700', fontSize: 16 },
  next: { color: '#8A6670', fontWeight: '800', fontSize: 12, textAlign: 'right', marginTop: 8 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.6 },
  fallback: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#251B2D' },
  fallbackText: { color: '#FFF', fontWeight: '900' },
  missing: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#4A3852' },
  missingText: { color: '#FFF', fontWeight: '800' },
});
