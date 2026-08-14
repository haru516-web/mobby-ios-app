import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text as RNText, View, type ImageSourcePropType, type TextProps } from 'react-native';

import { ENEMY_BY_ID, type EnemyCase, type EnemyId } from '@/data/enemyCases';
import {
  formatIncidentTemplate,
  MIDNIGHT_DOUBLE_INCIDENT,
  type AccusationQuestionId,
  type EvidenceFactId,
  type IncidentHint,
  type IncidentInteraction,
  type IncidentInteractionId,
  type IncidentScene,
  type IncidentSpeaker,
  type IncidentStory,
  type IncidentTemplateValues,
} from '@/data/incidentStory';

export type IncidentAllyActor = {
  slot: 'lead' | 'support';
  id: string;
  name: string;
  image: ImageSourcePropType;
};

export type InvestigationScene = 'arrival' | 'evidence' | 'link' | 'deduction' | 'contradiction' | 'accuse' | 'rebuttal' | 'confession';
export type InvestigationProgress = {
  scene: InvestigationScene;
  storySceneId?: string;
  evidenceIndex: number;
  completedInteractionIds: IncidentInteractionId[];
  discoveredFactIds: EvidenceFactId[];
  contradictionChoiceId?: string;
  accusationAnswers: Partial<Record<AccusationQuestionId, string>>;
  accusationIndex: number;
  attempts: number;
  hintLevels?: Partial<Record<IncidentInteractionId | 'contradiction' | AccusationQuestionId, number>>;
  interactionAttempts?: Partial<Record<IncidentInteractionId | 'contradiction' | AccusationQuestionId, number>>;
  inspectedTargetIds?: Partial<Record<IncidentInteractionId, string[]>>;
};

export type InvestigationScreenProps = {
  activeCase: EnemyCase | null;
  targetName: string;
  targetImage: ImageSourcePropType;
  allyActors?: readonly IncidentAllyActor[];
  identifiedEnemyIds?: ReadonlySet<EnemyId>;
  solvedCaseIds: string[];
  reactionImage?: ImageSourcePropType;
  onSolved: (caseData: EnemyCase) => void;
  onClose: () => void;
  onSceneChange?: (scene: InvestigationScene) => void;
  onUiSound?: (sound: 'tap' | 'evidence' | 'wrong' | 'correct') => void;
  reduceMotion?: boolean;
  story?: IncidentStory;
  initialProgress?: Partial<InvestigationProgress>;
  onProgressChange?: (progress: InvestigationProgress) => void;
};

const EMPTY_IDENTIFIED_ENEMIES: ReadonlySet<EnemyId> = new Set<EnemyId>();

const UNRESOLVED_TEMPLATE = /{{[^}]+}}/g;
const INCIDENT_BACKGROUNDS: Record<string, ImageSourcePropType> = {
  corridor: require('../../assets/incidents/midnight-mansion-corridor-v2.png'),
  evidence: require('../../assets/incidents/delivery-box-evidence.png'),
  service: require('../../assets/incidents/illusionist-theatre-service-passage.png'),
  confrontation: require('../../assets/incidents/illusionist-theatre-service-passage.png'),
};

function Text(props: TextProps) {
  return <RNText maxFontSizeMultiplier={1.25} {...props} />;
}

export function formatInvestigationDisplayText(text: string, values: IncidentTemplateValues) {
  return formatIncidentTemplate(text, values).replace(UNRESOLVED_TEMPLATE, '…');
}

export function formatIncidentStoryForDisplay(source: IncidentStory, values: IncidentTemplateValues): IncidentStory {
  const visit = (value: unknown): unknown => {
    if (typeof value === 'string') return formatInvestigationDisplayText(value, values);
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, visit(entry)]));
    return value;
  };
  return visit(source) as IncidentStory;
}

export function findUnresolvedIncidentTemplates(value: unknown): string[] {
  if (typeof value === 'string') return value.match(UNRESOLVED_TEMPLATE) ?? [];
  if (Array.isArray(value)) return value.flatMap(findUnresolvedIncidentTemplates);
  if (value && typeof value === 'object') return Object.values(value).flatMap(findUnresolvedIncidentTemplates);
  return [];
}

const sceneMode = (storyScene: IncidentScene): InvestigationScene => {
  if (storyScene.kind === 'inspection') return 'evidence';
  if (storyScene.id === 'contradiction') return 'contradiction';
  if (storyScene.kind === 'deduction') return 'deduction';
  if (storyScene.kind === 'accusation') return 'accuse';
  if (storyScene.kind === 'rescue') return 'confession';
  if (storyScene.id === 'confrontation') return 'link';
  return 'arrival';
};

const chapterProgress = (scene: IncidentScene) => {
  if (scene.order <= 1) return '1 / 4　事件発生';
  if (scene.order <= 6) return '2 / 4　証拠を集める';
  if (scene.order <= 10) return '3 / 4　真相を示す';
  return '4 / 4　救出';
};

export function InvestigationScreen(props: InvestigationScreenProps) {
  const { activeCase, targetName, targetImage, reactionImage, allyActors = [], identifiedEnemyIds = EMPTY_IDENTIFIED_ENEMIES, onSolved, onClose, onSceneChange, onUiSound, onProgressChange, reduceMotion = false } = props;
  const sourceStory = props.story ?? MIDNIGHT_DOUBLE_INCIDENT;
  const lead = allyActors.find((actor) => actor.slot === 'lead');
  const support = allyActors.find((actor) => actor.slot === 'support');
  const values = useMemo<IncidentTemplateValues>(() => ({ targetName, allyLeadName: lead?.name ?? 'ナレーション', allySupportName: support?.name ?? lead?.name ?? 'ナレーション' }), [lead?.name, support?.name, targetName]);
  const story = useMemo(() => formatIncidentStoryForDisplay(sourceStory, values), [sourceStory, values]);
  const initial = props.initialProgress;
  const [storySceneId, setStorySceneId] = useState(initial?.storySceneId ?? story.sceneIds[0] ?? 'alert');
  const storyScene = story.scenes.find((item) => item.id === storySceneId) ?? story.scenes[0];
  const [scene, setScene] = useState<InvestigationScene>(initial?.scene ?? sceneMode(storyScene));
  const [completedInteractions, setCompletedInteractions] = useState<IncidentInteractionId[]>(initial?.completedInteractionIds ?? []);
  const [facts, setFacts] = useState<EvidenceFactId[]>(initial?.discoveredFactIds ?? []);
  const [contradictionChoice, setContradictionChoice] = useState(initial?.contradictionChoiceId);
  const [answers, setAnswers] = useState<Partial<Record<AccusationQuestionId, string>>>(initial?.accusationAnswers ?? {});
  const [questionIndex, setQuestionIndex] = useState(initial?.accusationIndex ?? 0);
  const [attempts, setAttempts] = useState(initial?.attempts ?? 0);
  const [hintLevels, setHintLevels] = useState(initial?.hintLevels ?? {});
  const [interactionAttempts, setInteractionAttempts] = useState(initial?.interactionAttempts ?? {});
  const [inspectedTargetIds, setInspectedTargetIds] = useState(initial?.inspectedTargetIds ?? {});
  const motion = useRef(new Animated.Value(1)).current;

  useEffect(() => onSceneChange?.(scene), [onSceneChange, scene]);
  useEffect(() => onProgressChange?.({
    scene,
    storySceneId,
    evidenceIndex: Math.max(0, story.interactions.findIndex((item) => item.id === storyScene.interactionId)),
    completedInteractionIds: completedInteractions,
    discoveredFactIds: facts,
    contradictionChoiceId: contradictionChoice,
    accusationAnswers: answers,
    accusationIndex: questionIndex,
    attempts,
    hintLevels,
    interactionAttempts,
    inspectedTargetIds,
  }), [answers, attempts, completedInteractions, contradictionChoice, facts, hintLevels, inspectedTargetIds, interactionAttempts, onProgressChange, questionIndex, scene, story.interactions, storyScene.interactionId, storySceneId]);

  const goTo = (nextId?: string) => {
    if (!nextId) return;
    const next = story.scenes.find((item) => item.id === nextId);
    if (!next) return;
    setStorySceneId(next.id);
    setScene(sceneMode(next));
    onUiSound?.('tap');
    motion.stopAnimation();
    motion.setValue(reduceMotion ? 1 : 0);
    Animated.timing(motion, { toValue: 1, duration: reduceMotion ? 1 : 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };

  const recordInteraction = (id: IncidentInteractionId, fact: EvidenceFactId) => {
    setCompletedInteractions((current) => current.includes(id) ? current : [...current, id]);
    setFacts((current) => current.includes(fact) ? current : [...current, fact]);
    onUiSound?.('evidence');
  };

  const recordAttempt = (id: IncidentInteractionId | 'contradiction' | AccusationQuestionId) => {
    setAttempts((current) => current + 1);
    setInteractionAttempts((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
    onUiSound?.('wrong');
  };

  const revealHint = (id: IncidentInteractionId | 'contradiction' | AccusationQuestionId, level: number) => setHintLevels((current) => ({ ...current, [id]: level }));

  if (!activeCase || !storyScene) return <View style={styles.stage}><Text style={styles.title}>いま、追うべき事件はない</Text><Action label="ホームへ戻る" onPress={onClose} /></View>;

  const background = storyScene.cinematic ? INCIDENT_BACKGROUNDS[storyScene.cinematic.backgroundId] : undefined;
  const interaction = storyScene.interactionId ? story.interactions.find((item) => item.id === storyScene.interactionId) : undefined;
  const compactStoryCopy = storyScene.kind === 'inspection' || storyScene.kind === 'deduction' || storyScene.kind === 'accusation';

  return <View style={[styles.stage, { minHeight: 0, height: '100%' }]} accessibilityLiveRegion="polite" accessibilityViewIsModal onAccessibilityEscape={onClose}>
    {background ? <Image source={background} resizeMode="cover" style={styles.background} /> : null}
    <View pointerEvents="none" style={styles.scrim} />
    <CinematicEnemies scene={storyScene} identifiedEnemyIds={identifiedEnemyIds} />
    <View style={styles.header}><Text style={styles.progress}>{chapterProgress(storyScene)}</Text><Pressable accessibilityRole="button" accessibilityLabel="事件を中断する。進み具合は保存されます" onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View>
    <Animated.View style={[styles.scene, { opacity: motion, transform: [{ translateX: motion.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 0 : 24, 0] }) }] }]}>
      <SpeakerCard speaker={storyScene.speaker} allies={allyActors} targetName={targetName} targetImage={targetImage} identifiedEnemyIds={identifiedEnemyIds} />
      <View style={[styles.storyCopy, compactStoryCopy && styles.storyCopyCompact]}><Text style={styles.kicker}>{storyScene.chapterLabel}</Text><Text numberOfLines={2} style={[styles.title, compactStoryCopy && styles.compactTitle]}>{storyScene.lines[0] ?? storyScene.chapterLabel}</Text>{!compactStoryCopy && storyScene.lines[1] ? <Text numberOfLines={2} style={styles.body}>{storyScene.lines[1]}</Text> : null}</View>
      <Mission objective={storyScene.objective} completion={storyScene.successCondition} />
      <View style={styles.content}>
        {storyScene.id === 'alert' ? <MissingVisual targetImage={targetImage} targetName={targetName} /> : null}
        {storyScene.kind === 'dialogue' || (storyScene.kind === 'rescue' && storyScene.id === 'proof') ? <DialogueVisual scene={storyScene} speaker={storyScene.speaker} allies={allyActors} targetImage={targetImage} identifiedEnemyIds={identifiedEnemyIds} /> : null}
        {storyScene.kind === 'inspection' && interaction ? <InteractionCut interaction={interaction} completed={completedInteractions.includes(interaction.id)} inspected={inspectedTargetIds[interaction.id] ?? []} attempts={interactionAttempts[interaction.id] ?? 0} hintLevel={hintLevels[interaction.id] ?? 0} reduceMotion={reduceMotion} onInspect={(ids) => setInspectedTargetIds((current) => ({ ...current, [interaction.id]: ids }))} onAttempt={() => recordAttempt(interaction.id)} onHint={(level) => revealHint(interaction.id, level)} onComplete={() => recordInteraction(interaction.id, interaction.successFactId)} /> : null}
        {storyScene.id === 'memo' ? <MemoCut story={story} facts={facts} /> : null}
        {storyScene.id === 'contradiction' ? <ContradictionCut story={story} selected={contradictionChoice} attempts={interactionAttempts.contradiction ?? 0} hintLevel={hintLevels.contradiction ?? 0} onChoose={(id, correct) => { setContradictionChoice(id); if (correct) onUiSound?.('correct'); else recordAttempt('contradiction'); }} onHint={(level) => revealHint('contradiction', level)} /> : null}
        {storyScene.kind === 'accusation' ? <AccusationCut story={story} questionIndex={questionIndex} selected={answers[story.accusation[questionIndex]?.id]} attempts={interactionAttempts[story.accusation[questionIndex]?.id] ?? 0} hintLevel={hintLevels[story.accusation[questionIndex]?.id] ?? 0} onChoose={(id, correct) => { const question = story.accusation[questionIndex]; if (!question) return; if (correct) { setAnswers((current) => ({ ...current, [question.id]: id })); onUiSound?.('correct'); } else recordAttempt(question.id); }} onHint={(level) => { const question = story.accusation[questionIndex]; if (question) revealHint(question.id, level); }} /> : null}
        {storyScene.id === 'rescue' ? <RescueVisual targetName={targetName} image={reactionImage ?? targetImage} /> : null}
      </View>
      <SceneAction scene={storyScene} interaction={interaction} completedInteractions={completedInteractions} contradictionChoice={contradictionChoice} story={story} questionIndex={questionIndex} answers={answers} onNext={() => {
        if (storyScene.kind === 'accusation') {
          if (questionIndex + 1 < story.accusation.length) setQuestionIndex((current) => current + 1);
          else goTo(storyScene.nextSceneId);
        } else if (storyScene.id === 'rescue') onSolved(activeCase);
        else goTo(storyScene.nextSceneId);
      }} />
    </Animated.View>
  </View>;
}

function CinematicEnemies({ scene, identifiedEnemyIds }: { scene: IncidentScene; identifiedEnemyIds: ReadonlySet<EnemyId> }) {
  const enemies = scene.cinematic?.foregroundEnemies ?? [];
  return <View pointerEvents="none" style={styles.cinematicLayer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{enemies.map((actor, index) => {
    const left = { farLeft: -52, left: 18, center: 100, right: 198, farRight: 272 }[actor.placement];
    const actorStyle = { left, opacity: Math.min(actor.opacity ?? .4, .52), transform: [{ scaleX: actor.mirrored ? -actor.scale : actor.scale }, { scaleY: actor.scale }] };
    if (identifiedEnemyIds.has(actor.enemyId)) {
      const enemy = ENEMY_BY_ID[actor.enemyId];
      return <Image key={`${actor.enemyId}-${index}`} source={enemy.image} resizeMode="contain" style={[styles.cinematicEnemy, actorStyle]} />;
    }
    return <View key={`unknown-${actor.enemyId}-${index}`} style={[styles.cinematicEnemy, styles.cinematicEnemyUnknown, actorStyle]}><View style={styles.cinematicEnemyHead} /><View style={styles.cinematicEnemyBody} /></View>;
  })}</View>;
}

function SpeakerCard({ speaker, allies, targetName, targetImage, identifiedEnemyIds }: { speaker: IncidentSpeaker; allies: readonly IncidentAllyActor[]; targetName: string; targetImage: ImageSourcePropType; identifiedEnemyIds: ReadonlySet<EnemyId> }) {
  let name = 'ナレーション';
  let role = '状況説明';
  let image: ImageSourcePropType | undefined;
  let unidentifiedEnemy = false;
  let enemySpeaker = false;
  if (speaker.kind === 'ally') {
    const actor = allies.find((item) => item.slot === speaker.slot);
    name = actor?.name ?? 'ナレーション';
    role = actor ? '協力モビー' : '状況説明';
    image = actor?.image;
  } else if (speaker.kind === 'enemy') {
    enemySpeaker = true;
    if (identifiedEnemyIds.has(speaker.enemyId)) {
      const enemy = ENEMY_BY_ID[speaker.enemyId];
      name = enemy.name;
      role = '怪盗団・敵対';
      image = enemy.image;
    } else {
      name = '正体不明の怪盗';
      role = '怪盗団・敵対';
      unidentifiedEnemy = true;
    }
  } else if (speaker.kind === 'target') {
    name = targetName;
    role = '被害モビー';
    image = targetImage;
  }
  return <View style={styles.speakerCard} accessible accessibilityLabel={`${role}、${name}`}>
    {image ? <Image source={image} resizeMode="contain" style={styles.speakerPortrait} /> : unidentifiedEnemy ? <LockedEnemyPortrait /> : <View style={styles.narrator}><Text style={styles.narratorText}>!</Text></View>}
    <View><Text style={[styles.role, enemySpeaker && styles.enemyRole]}>{role}</Text><Text style={styles.speakerName}>{name}</Text></View>
  </View>;
}

function Mission({ objective, completion }: { objective: string; completion: string }) {
  return <View style={styles.mission} accessible accessibilityLabel={`いまの目的、${objective}。できたら完了、${completion}`}><View style={styles.missionColumn}><Text style={styles.missionLabel}>いまの目的</Text><Text numberOfLines={2} style={styles.missionText}>{objective}</Text></View><View style={styles.missionDivider} /><View style={styles.missionColumn}><Text style={styles.doneLabel}>✓ できたら完了</Text><Text numberOfLines={2} style={styles.doneText}>{completion}</Text></View></View>;
}

function MissingVisual({ targetImage, targetName }: { targetImage: ImageSourcePropType; targetName: string }) {
  return <View style={styles.missing}><Image source={targetImage} resizeMode="contain" style={styles.missingImage} /><View style={styles.stolenBand}><Text style={styles.stolenText}>{targetName}　盗難</Text></View></View>;
}

function DialogueVisual({ scene, speaker, allies, targetImage, identifiedEnemyIds }: { scene: IncidentScene; speaker: IncidentSpeaker; allies: readonly IncidentAllyActor[]; targetImage: ImageSourcePropType; identifiedEnemyIds: ReadonlySet<EnemyId> }) {
  let image: ImageSourcePropType | undefined;
  const unidentifiedEnemy = speaker.kind === 'enemy' && !identifiedEnemyIds.has(speaker.enemyId);
  if (speaker.kind === 'enemy' && !unidentifiedEnemy) image = ENEMY_BY_ID[speaker.enemyId].image;
  else if (speaker.kind === 'target') image = targetImage;
  else if (speaker.kind === 'ally') image = allies.find((actor) => actor.slot === speaker.slot)?.image;
  return <View style={styles.dialogueVisual}>{image ? <Image source={image} resizeMode="contain" style={styles.largePortrait} /> : unidentifiedEnemy ? <LockedEnemyVisual /> : <View style={styles.narrationPanel}><Text style={styles.body}>{scene.lines.join(' ')}</Text></View>}</View>;
}

function LockedEnemyPortrait() {
  return <View pointerEvents="none" style={styles.lockedPortrait} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><View style={styles.lockedPortraitHead} /><View style={styles.lockedPortraitBody} /></View>;
}

function LockedEnemyVisual() {
  return <View style={styles.lockedEnemyVisual} accessible accessibilityLabel="正体不明の怪盗。正式な姿はまだ不明です"><View pointerEvents="none" style={styles.lockedEnemyLarge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><View style={styles.lockedEnemyHead} /><View style={styles.lockedEnemyBody} /></View><View style={styles.lockedEnemyBadge}><Text style={styles.lockedEnemyBadgeText}>正体不明・敵対</Text></View></View>;
}

type InteractionProps = { interaction: IncidentInteraction; completed: boolean; inspected: string[]; attempts: number; hintLevel: number; reduceMotion: boolean; onInspect: (ids: string[]) => void; onAttempt: () => void; onHint: (level: number) => void; onComplete: () => void };
function InteractionCut(props: InteractionProps) {
  if (props.interaction.kind === 'clock-inspection') return <ClockInspection {...props} interaction={props.interaction} />;
  if (props.interaction.kind === 'projection-comparison') return <ProjectionComparison {...props} interaction={props.interaction} />;
  return <LocationSearch {...props} interaction={props.interaction} />;
}

function ClockInspection({ interaction, completed, inspected, attempts, hintLevel, onInspect, onAttempt, onHint, onComplete }: InteractionProps & { interaction: Extract<IncidentInteraction, { kind: 'clock-inspection' }> }) {
  const [feedback, setFeedback] = useState('');
  const [done, setDone] = useState(completed);
  const inspect = (id: string, observation: string) => { onInspect(inspected.includes(id) ? inspected : [...inspected, id]); setFeedback(observation); };
  return <View style={styles.interaction}><Text style={styles.clock}>00:07</Text><View style={styles.compactRow}>{interaction.hotspots.map((item) => <Choice key={item.id} label={`${inspected.includes(item.id) ? '✓ ' : ''}${item.label}`} selected={inspected.includes(item.id)} onPress={() => inspect(item.id, item.observation)} />)}</View>{inspected.length === interaction.hotspots.length ? <View style={styles.verticalChoices}>{interaction.choices.map((item) => <Choice key={item.id} label={item.label} selected={done && item.correct} onPress={() => { if (item.correct) { setDone(true); setFeedback(interaction.successCopy); onComplete(); } else { setFeedback(interaction.wrongFeedback.find((entry) => entry.choiceId === item.id)?.line ?? '証拠と合わないようだ。'); onAttempt(); } }} />)}</View> : null}<InlineFeedback text={feedback} success={done} /><HintPanel hints={interaction.hints} attempts={attempts} currentLevel={hintLevel} onReveal={onHint} /></View>;
}

export function canConsumeTimingCycle(activeCycle: number, consumedCycle: number, isLit: boolean, isLocked: boolean) {
  return isLit && !isLocked && activeCycle > 0 && activeCycle !== consumedCycle;
}

function ProjectionComparison({ interaction, completed, attempts, hintLevel, reduceMotion, onAttempt, onHint, onComplete }: InteractionProps & { interaction: Extract<IncidentInteraction, { kind: 'projection-comparison' }> }) {
  const [ready, setReady] = useState(reduceMotion || completed);
  const [lit, setLit] = useState(false);
  const [done, setDone] = useState(completed);
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    if (reduceMotion || completed) return;
    const timer = setTimeout(() => setLit(true), 600);
    const off = setTimeout(() => setLit(false), 1350);
    return () => { clearTimeout(timer); clearTimeout(off); };
  }, [completed, reduceMotion]);
  return <View style={styles.interaction}><Pressable accessibilityRole="button" accessibilityLabel={reduceMotion ? '静止画で光と像を比較する' : '光った像を一度確認する'} onPress={() => setReady(true)} disabled={ready} style={[styles.projection, lit && styles.projectionLit, ready && styles.observed]}><Text style={styles.projectionText}>{ready ? '✓ 光と像を見比べた' : lit ? 'いま、像を確認' : '光る瞬間を待つ'}</Text></Pressable>{ready ? <View style={styles.verticalChoices}>{interaction.choices.map((item) => <Choice key={item.id} label={item.label} selected={done && item.correct} onPress={() => { if (item.correct) { setDone(true); setFeedback(interaction.successCopy); onComplete(); } else { setFeedback(interaction.wrongFeedback.find((entry) => entry.choiceId === item.id)?.line ?? 'もう一度、像の動きを見よう。'); onAttempt(); } }} />)}</View> : null}<InlineFeedback text={feedback} success={done} /><HintPanel hints={interaction.hints} attempts={attempts} currentLevel={hintLevel} onReveal={onHint} /></View>;
}

function LocationSearch({ interaction, completed, inspected, attempts, hintLevel, onInspect, onAttempt, onHint, onComplete }: InteractionProps & { interaction: Extract<IncidentInteraction, { kind: 'location-search' }> }) {
  const [feedback, setFeedback] = useState('');
  const [done, setDone] = useState(completed);
  const inspect = (id: string, observation: string, correct: boolean) => {
    const next = inspected.includes(id) ? inspected : [...inspected, id];
    onInspect(next);
    setFeedback(observation);
    if (!correct) onAttempt();
    if (next.includes('service-box') && next.length === interaction.locations.length) { setDone(true); setFeedback(interaction.successCopy); onComplete(); }
  };
  return <View style={styles.interaction}><View style={styles.verticalChoices}>{interaction.locations.map((item) => <Choice key={item.id} label={`${inspected.includes(item.id) ? '✓ ' : ''}${item.label}`} selected={inspected.includes(item.id)} onPress={() => inspect(item.id, item.observation, item.correct)} />)}</View>{inspected.includes('service-box') && inspected.length < interaction.locations.length ? <Text style={styles.helper}>赤い糸を発見。残りの場所も確認しよう。</Text> : null}<InlineFeedback text={feedback} success={done} /><HintPanel hints={interaction.hints} attempts={attempts} currentLevel={hintLevel} onReveal={onHint} /></View>;
}

function MemoCut({ story, facts }: { story: IncidentStory; facts: EvidenceFactId[] }) {
  return <View style={styles.memo}>{story.memoLines.map((line, index) => <View key={`${line}-${index}`} style={styles.memoCard}><Text style={styles.memoNumber}>{index + 1}</Text><Text style={styles.memoText}>{line}</Text><Text style={styles.memoCheck}>{facts.length > index ? '✓' : '・'}</Text></View>)}</View>;
}

function ContradictionCut({ story, selected, attempts, hintLevel, onChoose, onHint }: { story: IncidentStory; selected?: string; attempts: number; hintLevel: number; onChoose: (id: string, correct: boolean) => void; onHint: (level: number) => void }) {
  const choice = story.contradiction.choices.find((item) => item.id === selected);
  return <View style={styles.interaction}><View style={styles.statement}><Text style={styles.statementLabel}>怪盗団の証言</Text><Text style={styles.statementText}>「{story.contradiction.statement}」</Text></View><View style={styles.verticalChoices}>{story.contradiction.choices.map((item) => <Choice key={item.id} label={item.label} selected={selected === item.id} onPress={() => onChoose(item.id, item.correct)} />)}</View><InlineFeedback text={choice ? (choice.correct ? story.contradiction.completed : choice.feedback) : ''} success={choice?.correct ?? false} /><HintPanel hints={story.contradiction.hints} attempts={attempts} currentLevel={hintLevel} onReveal={onHint} /></View>;
}

function AccusationCut({ story, questionIndex, selected, attempts, hintLevel, onChoose, onHint }: { story: IncidentStory; questionIndex: number; selected?: string; attempts: number; hintLevel: number; onChoose: (id: string, correct: boolean) => void; onHint: (level: number) => void }) {
  const question = story.accusation[questionIndex];
  const [localSelected, setLocalSelected] = useState(selected);
  useEffect(() => setLocalSelected(selected), [questionIndex, selected]);
  const selectedOption = question?.options.find((item) => item.id === localSelected);
  if (!question) return null;
  return <View style={styles.interaction}><Text style={styles.questionCount}>最後の推理　{questionIndex + 1} / {story.accusation.length}</Text><Text numberOfLines={2} style={styles.question}>{question.prompt}</Text><View style={styles.verticalChoices}>{question.options.map((item) => <Choice key={item.id} label={item.label} selected={localSelected === item.id} onPress={() => { setLocalSelected(item.id); onChoose(item.id, item.correct); }} />)}</View><InlineFeedback text={selectedOption?.rebuttal ?? ''} success={selectedOption?.correct ?? false} /><HintPanel hints={question.hints} attempts={attempts} currentLevel={hintLevel} onReveal={onHint} /></View>;
}

function RescueVisual({ targetName, image }: { targetName: string; image: ImageSourcePropType }) {
  return <View style={styles.rescue}><Image source={image} resizeMode="contain" style={styles.rescueImage} /><View style={styles.targetBadge}><Text style={styles.targetBadgeText}>被害モビー・救出</Text></View><Text style={styles.rescueName}>{targetName}</Text></View>;
}

function HintPanel({ hints, attempts, currentLevel, onReveal }: { hints: readonly IncidentHint[]; attempts: number; currentLevel: number; onReveal: (level: number) => void }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { const timer = setInterval(() => setElapsed((value) => value + 1000), 1000); return () => clearInterval(timer); }, []);
  const next = Math.min(3, currentLevel + 1);
  const hint = hints[next - 1];
  const unlocked = next === 1 || attempts >= hint.unlockAfterAttempts || elapsed >= hint.unlockAfterMs;
  return <View style={styles.hintArea}>{currentLevel > 0 ? <Text numberOfLines={2} style={styles.hintText}>ヒント {currentLevel}：{hints[currentLevel - 1]?.text}</Text> : <Text numberOfLines={2} style={styles.hintText}>迷ったら、ヒントを使えます</Text>}<Pressable accessibilityRole="button" accessibilityLabel={currentLevel >= 3 ? 'すべてのヒントを表示済み' : unlocked ? `ヒント${next}を見る` : `ヒント${next}はもう少しで利用できます`} disabled={currentLevel >= 3 || !unlocked} onPress={() => onReveal(next)} style={[styles.hintButton, (!unlocked || currentLevel >= 3) && styles.disabled]}><Text style={styles.hintButtonText}>{currentLevel >= 3 ? 'ヒント表示済み' : unlocked ? `ヒント ${next}` : 'もう少し考える'}</Text></Pressable></View>;
}

function InlineFeedback({ text, success }: { text: string; success: boolean }) {
  return <View accessibilityLiveRegion="polite" style={[styles.feedback, success && styles.feedbackSuccess]}><Text numberOfLines={2} style={styles.feedbackText}>{text || '証拠を選ぶと、ここに理由が表示されます。'}</Text></View>;
}

function SceneAction({ scene, interaction, completedInteractions, contradictionChoice, story, questionIndex, answers, onNext }: { scene: IncidentScene; interaction?: IncidentInteraction; completedInteractions: IncidentInteractionId[]; contradictionChoice?: string; story: IncidentStory; questionIndex: number; answers: Partial<Record<AccusationQuestionId, string>>; onNext: () => void }) {
  let enabled = true;
  if (interaction) enabled = completedInteractions.includes(interaction.id);
  if (scene.id === 'contradiction') enabled = contradictionChoice === story.contradiction.correctChoiceId;
  if (scene.kind === 'accusation') {
    const question = story.accusation[questionIndex];
    enabled = Boolean(question && question.options.find((item) => item.id === answers[question.id])?.correct);
  }
  return <Action label={scene.cta} onPress={onNext} disabled={!enabled} />;
}

function Action({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.action, disabled && styles.disabled, pressed && styles.pressed]}><Text style={styles.actionText}>{label}</Text></Pressable>;
}

function Choice({ label, onPress, selected = false }: { label: string; onPress: () => void; selected?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed]}><Text style={styles.choiceIcon}>{selected ? '✓' : '○'}</Text><Text numberOfLines={2} style={styles.choiceText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  stage: { flex: 1, minHeight: 0, height: '100%', backgroundColor: '#100C17', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10, overflow: 'hidden' },
  background: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,8,17,.72)' },
  cinematicLayer: { ...StyleSheet.absoluteFillObject },
  cinematicEnemy: { position: 'absolute', top: 92, width: 240, height: 310 },
  cinematicEnemyUnknown: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 22 },
  cinematicEnemyHead: { width: 74, height: 74, borderRadius: 37, backgroundColor: '#514852' },
  cinematicEnemyBody: { width: 168, height: 172, marginTop: -4, borderTopLeftRadius: 84, borderTopRightRadius: 84, backgroundColor: '#514852' },
  header: { zIndex: 5, height: 44, flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progress: { color: '#F3DDE2', fontSize: 14, fontWeight: '700' },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.1)' },
  closeText: { color: '#FFF', fontSize: 26, lineHeight: 30 },
  scene: { zIndex: 3, flex: 1, minHeight: 0, gap: 4, overflow: 'hidden' },
  speakerCard: { height: 44, flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  speakerPortrait: { width: 44, height: 44 },
  lockedPortrait: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 5, backgroundColor: '#4F4750' },
  lockedPortraitHead: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#241E25' },
  lockedPortraitBody: { width: 36, height: 28, marginTop: -1, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: '#241E25' },
  narrator: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#745B72' },
  narratorText: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  role: { alignSelf: 'flex-start', color: '#3A354D', fontSize: 11, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9, overflow: 'hidden', backgroundColor: '#CDE8F7' },
  enemyRole: { color: '#4A1F2B', backgroundColor: '#FFD0D6' },
  speakerName: { color: '#FFF8F2', fontSize: 17, lineHeight: 22, fontWeight: '800', marginTop: 2 },
  storyCopy: { minHeight: 0, maxHeight: 88, flexShrink: 0, justifyContent: 'center' },
  storyCopyCompact: { maxHeight: 78 },
  kicker: { color: '#FF9BA8', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#FFF8F2', fontSize: 23, lineHeight: 29, fontWeight: '800' },
  compactTitle: { fontSize: 20, lineHeight: 25 },
  body: { color: '#F1E7E4', fontSize: 17, lineHeight: 23, fontWeight: '600' },
  mission: { minHeight: 70, maxHeight: 84, flexShrink: 0, flexDirection: 'row', borderRadius: 16, padding: 8, backgroundColor: 'rgba(255,248,242,.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,.17)' },
  missionColumn: { flex: 1, justifyContent: 'center' },
  missionDivider: { width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,.2)', marginHorizontal: 10 },
  missionLabel: { color: '#FFADB7', fontSize: 11, fontWeight: '900' },
  missionText: { color: '#FFF', fontSize: 17, lineHeight: 21, fontWeight: '700' },
  doneLabel: { color: '#FFD891', fontSize: 11, fontWeight: '900' },
  doneText: { color: '#FFF', fontSize: 17, lineHeight: 21, fontWeight: '700' },
  content: { flex: 1, minHeight: 0, justifyContent: 'center', overflow: 'hidden' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missingImage: { width: 220, height: 210, opacity: .32 },
  stolenBand: { position: 'absolute', minWidth: 190, height: 40, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#A8354D', transform: [{ rotate: '-6deg' }] },
  stolenText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  dialogueVisual: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
  largePortrait: { width: '72%', height: '100%' },
  lockedEnemyVisual: { flex: 1, minHeight: 0, width: '100%', alignItems: 'center', justifyContent: 'center' },
  lockedEnemyLarge: { flex: 1, minHeight: 0, width: 190, maxHeight: 238, alignItems: 'center', justifyContent: 'flex-end' },
  lockedEnemyHead: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#514852' },
  lockedEnemyBody: { width: 142, height: 142, marginTop: -3, borderTopLeftRadius: 71, borderTopRightRadius: 71, backgroundColor: '#514852' },
  lockedEnemyBadge: { marginTop: -26, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, backgroundColor: '#913249', borderWidth: 1, borderColor: '#EEA7B6' },
  lockedEnemyBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  narrationPanel: { width: '100%', borderRadius: 18, padding: 16, backgroundColor: 'rgba(35,27,43,.9)' },
  interaction: { flex: 1, minHeight: 0, justifyContent: 'space-evenly', gap: 4, overflow: 'hidden' },
  clock: { color: '#FFF3D8', fontSize: 38, lineHeight: 44, fontWeight: '800', textAlign: 'center', letterSpacing: 2 },
  compactRow: { flexDirection: 'row', gap: 8 },
  verticalChoices: { width: '100%', gap: 6 },
  choice: { width: '100%', minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderRadius: 13, backgroundColor: 'rgba(255,255,255,.11)', borderWidth: 1, borderColor: 'rgba(255,255,255,.08)' },
  choiceSelected: { backgroundColor: '#704153', borderColor: '#FFD0D7' },
  choiceIcon: { width: 24, color: '#FFD5DC', fontSize: 17, fontWeight: '900' },
  choiceText: { flex: 1, color: '#FFF8F2', fontSize: 17, lineHeight: 21, fontWeight: '700' },
  projection: { minHeight: 70, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#352B3E', borderWidth: 2, borderColor: '#5A4B64' },
  projectionLit: { backgroundColor: '#A77A42', borderColor: '#FFE2A5' },
  observed: { backgroundColor: '#4F4058', borderColor: '#FFD4DC' },
  projectionText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  helper: { color: '#FFE2A5', fontSize: 17, lineHeight: 21, fontWeight: '700', textAlign: 'center' },
  feedback: { minHeight: 42, justifyContent: 'center', borderRadius: 12, paddingHorizontal: 12, backgroundColor: 'rgba(121,66,78,.72)', borderLeftWidth: 4, borderLeftColor: '#F49AAA' },
  feedbackSuccess: { backgroundColor: 'rgba(65,105,87,.78)', borderLeftColor: '#A9E0BE' },
  feedbackText: { color: '#FFF', fontSize: 17, lineHeight: 21, fontWeight: '600' },
  hintArea: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8 },
  hintText: { flex: 1, color: '#F3E7E3', fontSize: 15, lineHeight: 19, fontWeight: '600' },
  hintButton: { minWidth: 92, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#5D526D', borderWidth: 1, borderColor: '#D6C8E5' },
  hintButtonText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  memo: { gap: 9 },
  memoCard: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 15, backgroundColor: 'rgba(255,248,234,.94)' },
  memoNumber: { width: 28, height: 28, borderRadius: 14, color: '#FFF', fontSize: 15, lineHeight: 28, fontWeight: '900', textAlign: 'center', backgroundColor: '#A9475C' },
  memoText: { flex: 1, color: '#3E2C38', fontSize: 17, lineHeight: 21, fontWeight: '700' },
  memoCheck: { color: '#417F63', fontSize: 20, fontWeight: '900' },
  statement: { minHeight: 62, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 15, backgroundColor: 'rgba(70,38,49,.9)' },
  statementLabel: { color: '#FFB0BB', fontSize: 12, fontWeight: '900' },
  statementText: { color: '#FFF', fontSize: 17, lineHeight: 22, fontWeight: '800' },
  questionCount: { color: '#FFD891', fontSize: 14, lineHeight: 18, fontWeight: '800' },
  question: { color: '#FFF', fontSize: 20, lineHeight: 25, fontWeight: '800' },
  rescue: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  rescueImage: { width: 250, height: 220 },
  targetBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#FFD6D9' },
  targetBadgeText: { color: '#452D35', fontSize: 12, fontWeight: '900' },
  rescueName: { color: '#FFF', fontSize: 19, fontWeight: '800', marginTop: 4 },
  action: { width: '100%', height: 54, minHeight: 54, flexShrink: 0, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D64E64' },
  actionText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  disabled: { opacity: .42 },
  pressed: { opacity: .82, transform: [{ scale: .98 }] },
});
