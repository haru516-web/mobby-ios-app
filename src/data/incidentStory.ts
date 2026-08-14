import type { EnemyId } from './enemyCases';

/** Runtime copy tokens. Replace these immediately before rendering a line. */
export type IncidentTemplate = string;

export type IncidentAllySlot = 'lead' | 'support';

/**
 * Story roles are deliberately structural. An enemy id can never be used as an
 * ally fallback, and an ally can never silently inherit an enemy portrait.
 */
export type IncidentSpeaker =
  | { kind: 'narrator' }
  | { kind: 'ally'; slot: IncidentAllySlot }
  | { kind: 'target' }
  | { kind: 'enemy'; enemyId: EnemyId };

export type IncidentSceneKind =
  | 'alert'
  | 'dialogue'
  | 'inspection'
  | 'deduction'
  | 'accusation'
  | 'rescue';

export type IncidentBackgroundId =
  | 'corridor'
  | 'evidence'
  | 'service'
  | 'confrontation';

export type IncidentShot =
  | 'wide'
  | 'macro'
  | 'low'
  | 'overShoulder'
  | 'dutch'
  | 'duel';

export type IncidentTransition = 'hardCut' | 'push' | 'flash' | 'fade';

export type IncidentForegroundPlacement =
  | 'farLeft'
  | 'left'
  | 'center'
  | 'right'
  | 'farRight';

export type IncidentScrimFocus =
  | 'full'
  | 'center'
  | 'evidence'
  | 'speaker'
  | 'target'
  | 'suspects';

export type IncidentAmbientCue =
  | 'command-static'
  | 'empty-room-hum'
  | 'projector-rattle'
  | 'clock-tick'
  | 'window-wind'
  | 'silver-shimmer'
  | 'service-wheel'
  | 'deduction-pulse'
  | 'footstep-echo'
  | 'hostile-silence'
  | 'accusation-sting'
  | 'rescue-rush'
  | 'home-chime';

export type IncidentForegroundEnemy = {
  enemyId: EnemyId;
  disposition: 'hostile';
  placement: IncidentForegroundPlacement;
  scale: number;
  opacity?: number;
  mirrored?: boolean;
};

export type IncidentCinematic = {
  backgroundId: IncidentBackgroundId;
  shot: IncidentShot;
  transition: IncidentTransition;
  foregroundEnemies?: readonly IncidentForegroundEnemy[];
  scrimFocus: IncidentScrimFocus;
  ambientCue: IncidentAmbientCue;
};

export type IncidentHint = {
  level: 1 | 2 | 3;
  text: IncidentTemplate;
  unlockAfterAttempts: number;
  unlockAfterMs: number;
  focusTargetId?: string;
};

export type IncidentWrongFeedback = {
  choiceId: string;
  speaker: Extract<IncidentSpeaker, { kind: 'ally' }>;
  line: IncidentTemplate;
  focusTargetId?: string;
};

export type IncidentGuidance = {
  objective: IncidentTemplate;
  successCondition: IncidentTemplate;
  learnedFact?: IncidentTemplate;
  hints: readonly [IncidentHint, IncidentHint, IncidentHint];
  wrongFeedback: readonly IncidentWrongFeedback[];
};

export type IncidentScene = IncidentGuidance & {
  id: string;
  order: number;
  kind: IncidentSceneKind;
  chapterLabel: string;
  speaker: IncidentSpeaker;
  portraitSide?: 'left' | 'right';
  visual: string;
  lines: readonly IncidentTemplate[];
  cta: IncidentTemplate;
  nextSceneId?: string;
  interactionId?: IncidentInteractionId;
  cinematic?: IncidentCinematic;
};

export type EvidenceFactId =
  | 'fact-clock-staged'
  | 'fact-silver-double'
  | 'fact-service-box';

export type IncidentChoice = {
  id: string;
  label: IncidentTemplate;
  correct: boolean;
};

export type ClockInteraction = IncidentGuidance & {
  id: 'clock-inspection';
  kind: 'clock-inspection';
  title: string;
  prompt: string;
  hotspots: readonly {
    id: 'hands' | 'back';
    label: string;
    observation: string;
  }[];
  choices: readonly IncidentChoice[];
  successFactId: 'fact-clock-staged';
  successCopy: string;
};

export type ProjectionInteraction = IncidentGuidance & {
  id: 'projection-comparison';
  kind: 'projection-comparison';
  title: string;
  prompt: string;
  requiredHits: 1;
  delayedByMs: 400;
  choices: readonly IncidentChoice[];
  successFactId: 'fact-silver-double';
  successCopy: string;
};

export type RouteInteraction = IncidentGuidance & {
  id: 'corridor-search';
  kind: 'location-search';
  title: string;
  prompt: string;
  locations: readonly {
    id: 'window' | 'footprints' | 'service-box';
    label: string;
    observation: string;
    correct: boolean;
  }[];
  successFactId: 'fact-service-box';
  successCopy: string;
};

export type IncidentInteraction =
  | ClockInteraction
  | ProjectionInteraction
  | RouteInteraction;

export type IncidentInteractionId = IncidentInteraction['id'];

export type Contradiction = IncidentGuidance & {
  id: string;
  statement: string;
  before: string;
  replaceTarget: string;
  choices: readonly {
    id: string;
    label: string;
    correct: boolean;
    evidenceFactId?: EvidenceFactId;
    feedback: string;
  }[];
  correctChoiceId: string;
  completed: string;
};

export type AccusationQuestionId = 'culprit' | 'method' | 'route';

export type AccusationOption = {
  id: string;
  label: string;
  enemyId?: EnemyId;
  correct: boolean;
  rebuttal: IncidentTemplate;
  focusFactId?: EvidenceFactId;
  returnSceneId: string;
};

export type AccusationQuestion = IncidentGuidance & {
  id: AccusationQuestionId;
  prompt: string;
  options: readonly AccusationOption[];
};

export type IncidentStory = {
  id: string;
  chapter: string;
  title: string;
  subtitle: IncidentTemplate;
  cutIn: {
    kicker: string;
    title: string;
    lines: readonly IncidentTemplate[];
    cta: string;
  };
  allySlots: Readonly<Record<IncidentAllySlot, { nameTemplate: IncidentTemplate }>>;
  hostileEnemyIds: readonly EnemyId[];
  culpritEnemyId: EnemyId;
  bgmKey: string;
  sceneIds: readonly string[];
  scenes: readonly IncidentScene[];
  interactions: readonly IncidentInteraction[];
  facts: Readonly<Record<EvidenceFactId, string>>;
  memoLines: readonly IncidentTemplate[];
  contradiction: Contradiction;
  accusation: readonly AccusationQuestion[];
  proofLines: readonly IncidentTemplate[];
  resolutionLines: readonly IncidentTemplate[];
};

export type IncidentStoryProgress = {
  storyId: string;
  sceneId: string;
  completedInteractionIds: IncidentInteractionId[];
  discoveredFactIds: EvidenceFactId[];
  contradictionChoiceId?: string;
  accusationAnswers: Partial<Record<AccusationQuestionId, string>>;
  attempts: number;
  targetItemId: string;
  startedAt: number;
  hintLevels?: Partial<Record<IncidentInteractionId | 'contradiction' | AccusationQuestionId, number>>;
  interactionAttempts?: Partial<Record<IncidentInteractionId | 'contradiction' | AccusationQuestionId, number>>;
  inspectedTargetIds?: Partial<Record<IncidentInteractionId, string[]>>;
};

export type IncidentTemplateValues = {
  targetName: string;
  allyLeadName: string;
  allySupportName: string;
};

export function formatIncidentTemplate(
  template: IncidentTemplate,
  values: IncidentTemplateValues,
): string {
  return template
    .replaceAll('{{targetName}}', values.targetName)
    .replaceAll('{{allyLeadName}}', values.allyLeadName)
    .replaceAll('{{allySupportName}}', values.allySupportName);
}

const LEAD: Extract<IncidentSpeaker, { kind: 'ally' }> = { kind: 'ally', slot: 'lead' };
const SUPPORT: Extract<IncidentSpeaker, { kind: 'ally' }> = { kind: 'ally', slot: 'support' };

const emptyHints = (objective: string): readonly [IncidentHint, IncidentHint, IncidentHint] => [
  { level: 1, text: objective, unlockAfterAttempts: 0, unlockAfterMs: 0 },
  { level: 2, text: objective, unlockAfterAttempts: 1, unlockAfterMs: 20_000 },
  { level: 3, text: objective, unlockAfterAttempts: 2, unlockAfterMs: 40_000 },
];

const sceneGuidance = (objective: string, successCondition: string, learnedFact?: string): IncidentGuidance => ({
  objective,
  successCondition,
  learnedFact,
  hints: emptyHints(objective),
  wrongFeedback: [],
});

const SCENES: readonly IncidentScene[] = [
  {
    ...sceneGuidance('{{targetName}}が消えたことを確かめる。', '空いた場所を見る。'),
    id: 'alert', order: 0, kind: 'alert', chapterLabel: '事件発生',
    visual: 'home-missing-sweep', speaker: { kind: 'narrator' },
    lines: ['赤い糸だけを残し、{{targetName}}が消えた。', 'さっきまで、ここで笑っていたのに。'],
    cta: '必ず見つける', nextSceneId: 'briefing',
    cinematic: {
      backgroundId: 'corridor', shot: 'wide', transition: 'hardCut',
      scrimFocus: 'target', ambientCue: 'command-static',
    },
  },
  {
    ...sceneGuidance('偽物の仕掛けを見抜き、{{targetName}}を救う。', '時計、投影幕、廊下の三か所を調べる。'),
    id: 'briefing', order: 1, kind: 'dialogue', chapterLabel: '捜査の目的',
    visual: 'target-afterimage', speaker: LEAD, portraitSide: 'right',
    lines: ['姿はありますが、本物とは限りませんぞ。', '調べるのは、時計、投影幕、廊下です。'],
    cta: '時計のうそを調べる', nextSceneId: 'clock',
    cinematic: {
      backgroundId: 'evidence', shot: 'overShoulder', transition: 'push',
      scrimFocus: 'evidence', ambientCue: 'empty-room-hum',
    },
  },
  {
    ...sceneGuidance('止まった時刻が本当か確かめる。', '針と裏蓋を調べ、止まった原因を選ぶ。', '時計は人の手で00:07に合わせられた。'),
    id: 'clock', order: 2, kind: 'inspection', chapterLabel: '捜査 1 / 3',
    visual: 'stopped-clock', speaker: LEAD, portraitSide: 'left',
    lines: ['止まった数字より、壊れているかを見ましょう。'],
    cta: '投影幕を見比べる', interactionId: 'clock-inspection', nextSceneId: 'projection',
    cinematic: {
      backgroundId: 'evidence', shot: 'macro', transition: 'flash',
      scrimFocus: 'evidence', ambientCue: 'clock-tick',
    },
  },
  {
    ...sceneGuidance('映った姿が本物か確かめる。', '光と像を一度見比べ、遅れたものを選ぶ。', '銀粉付きの紙人形が{{targetName}}の姿を映していた。'),
    id: 'projection', order: 3, kind: 'inspection', chapterLabel: '捜査 2 / 3',
    visual: 'double-shadow-test', speaker: SUPPORT, portraitSide: 'right',
    lines: ['映ってる子、本物と動きがずれてない？'],
    cta: '銀粉の正体を見る', interactionId: 'projection-comparison', nextSceneId: 'sabotage',
    cinematic: {
      backgroundId: 'evidence', shot: 'dutch', transition: 'flash',
      foregroundEnemies: [{ enemyId: 'magician', disposition: 'hostile', placement: 'farRight', scale: 0.96, opacity: 0.5 }],
      scrimFocus: 'evidence', ambientCue: 'silver-shimmer',
    },
  },
  {
    ...sceneGuidance('銀粉の影の妨害に惑わされない。', '同じ銀粉投影を使った影を記憶する。', '銀粉の影が現場と同じ投影を使った。'),
    id: 'sabotage', order: 4, kind: 'dialogue', chapterLabel: '敵の妨害',
    visual: 'magician-silver-decoy', speaker: { kind: 'enemy', enemyId: 'magician' }, portraitSide: 'left',
    lines: ['見えているものが、本物とは限らない。', '幕が下りるまで、本物は戻らない。'],
    cta: '本物の通った道を追う', nextSceneId: 'corridor',
    cinematic: {
      backgroundId: 'confrontation', shot: 'duel', transition: 'hardCut',
      foregroundEnemies: [{ enemyId: 'magician', disposition: 'hostile', placement: 'center', scale: 1.1 }],
      scrimFocus: 'speaker', ambientCue: 'hostile-silence',
    },
  },
  {
    ...sceneGuidance('本物が通った場所を探す。', '窓、足跡、配膳箱を調べ、赤い糸を見つける。', '本物の赤い糸は廊下の配膳箱に残っていた。'),
    id: 'corridor', order: 5, kind: 'inspection', chapterLabel: '捜査 3 / 3',
    visual: 'corridor-three-locations', speaker: SUPPORT, portraitSide: 'left',
    lines: ['窓か、足跡か、箱か。赤い糸を探そう。'],
    cta: '三つの証拠を整理する', interactionId: 'corridor-search', nextSceneId: 'memo',
    cinematic: {
      backgroundId: 'service', shot: 'wide', transition: 'push',
      scrimFocus: 'evidence', ambientCue: 'service-wheel',
    },
  },
  {
    ...sceneGuidance('集めた証拠の意味を確認する。', '三枚の事件メモを因果順に読む。', '時刻のうそ、紙人形、配膳箱が一つの犯行を示す。'),
    id: 'memo', order: 6, kind: 'deduction', chapterLabel: '事件メモ',
    visual: 'three-fact-memo', speaker: LEAD, portraitSide: 'right',
    lines: ['三つの証拠は、同じ犯行につながりますぞ。'],
    cta: '銀粉の影の証言と比べる', nextSceneId: 'contradiction',
    cinematic: {
      backgroundId: 'evidence', shot: 'overShoulder', transition: 'fade',
      scrimFocus: 'evidence', ambientCue: 'deduction-pulse',
    },
  },
  {
    ...sceneGuidance('証言と証拠が合わない部分を見つける。', '窓が開いていない証拠で否定できる言葉を選ぶ。', '窓の足跡は、配膳箱から目をそらすための囮だった。'),
    id: 'contradiction', order: 7, kind: 'deduction', chapterLabel: '矛盾をほどく',
    visual: 'footprint-statement', speaker: LEAD, portraitSide: 'right',
    lines: ['窓は開いていない。証言のどこが合わない？'],
    cta: '本当の経路を突き止める', nextSceneId: 'confrontation',
    cinematic: {
      backgroundId: 'corridor', shot: 'dutch', transition: 'hardCut',
      scrimFocus: 'evidence', ambientCue: 'footstep-echo',
    },
  },
  {
    ...sceneGuidance('逃げる銀粉の影を追い詰める。', '犯人、方法、経路を証拠で答える。'),
    id: 'confrontation', order: 8, kind: 'dialogue', chapterLabel: '対決',
    visual: 'magician-reveal', speaker: { kind: 'enemy', enemyId: 'magician' }, portraitSide: 'left',
    lines: ['三つ拾ったくらいで、幕を破れると？', 'なら、君の推理を聞こう。'],
    cta: '三つの答えを告げる', nextSceneId: 'accusation',
    cinematic: {
      backgroundId: 'confrontation', shot: 'duel', transition: 'flash',
      foregroundEnemies: [
        { enemyId: 'magician', disposition: 'hostile', placement: 'left', scale: 1.12 },
      ],
      scrimFocus: 'speaker', ambientCue: 'hostile-silence',
    },
  },
  {
    ...sceneGuidance('犯人、方法、経路を順に選ぶ。', '三問すべてを証拠に合う答えで完成させる。'),
    id: 'accusation', order: 9, kind: 'accusation', chapterLabel: '最後の推理',
    visual: 'suspect-stage', speaker: LEAD, portraitSide: 'right',
    lines: ['誰が、どう隠し、どこへ運んだか。'],
    cta: '事件の全体を証明する', nextSceneId: 'proof',
    cinematic: {
      backgroundId: 'confrontation', shot: 'wide', transition: 'push',
      foregroundEnemies: [
        { enemyId: 'magician', disposition: 'hostile', placement: 'center', scale: 0.9 },
      ],
      scrimFocus: 'suspects', ambientCue: 'accusation-sting',
    },
  },
  {
    ...sceneGuidance('三つの答えを一つの犯行として示す。', '証明を聞き、救出場所を確定する。', '{{targetName}}は廊下の配膳箱にいる。'),
    id: 'proof', order: 10, kind: 'rescue', chapterLabel: '証明',
    visual: 'proof-bands', speaker: { kind: 'enemy', enemyId: 'magician' }, portraitSide: 'left',
    lines: ['一つの嘘では足りなかったか。', '君たちは、全部つないだ。'],
    cta: '配膳箱を開ける', nextSceneId: 'rescue',
    cinematic: {
      backgroundId: 'confrontation', shot: 'duel', transition: 'hardCut',
      foregroundEnemies: [{ enemyId: 'magician', disposition: 'hostile', placement: 'farRight', scale: 1.02 }],
      scrimFocus: 'speaker', ambientCue: 'rescue-rush',
    },
  },
  {
    ...sceneGuidance('{{targetName}}を配膳箱から救い出す。', '救出された本物と一緒にホームへ帰る。', '{{targetName}}を無事に救出した。'),
    id: 'rescue', order: 11, kind: 'rescue', chapterLabel: '救出',
    visual: 'target-return-full', speaker: { kind: 'target' }, portraitSide: 'left',
    lines: ['遅いよ。ずっと呼んでたんだから。', 'でも、見つけてくれてありがとう。'],
    cta: 'いっしょにホームへ帰る',
    cinematic: {
      backgroundId: 'service', shot: 'wide', transition: 'fade',
      scrimFocus: 'target', ambientCue: 'home-chime',
    },
  },
] as const;

const INTERACTIONS: readonly IncidentInteraction[] = [
  {
    id: 'clock-inspection', kind: 'clock-inspection', title: '時計のうそ',
    objective: '止まった時刻が本当か確かめる。',
    successCondition: '針と裏蓋を調べ、止まった原因を選ぶ。',
    learnedFact: '時計は人の手で00:07に合わせられた。',
    prompt: '針と裏蓋を調べよう。',
    hotspots: [
      { id: 'hands', label: '止まった針', observation: '針は00:07を指している。' },
      { id: 'back', label: '時計の裏蓋', observation: '歯車は無傷で、針を指で回した跡がある。' },
    ],
    choices: [
      { id: 'broken', label: '故障して止まった', correct: false },
      { id: 'staged', label: '誰かが00:07に合わせた', correct: true },
    ],
    hints: [
      { level: 1, text: '止まった数字より、時計が壊れているかを見よう。', unlockAfterAttempts: 0, unlockAfterMs: 0 },
      { level: 2, text: '裏蓋を開き、歯車を確かめよう。', unlockAfterAttempts: 1, unlockAfterMs: 20_000, focusTargetId: 'back' },
      { level: 3, text: '歯車が無傷なら「誰かが00:07に合わせた」。', unlockAfterAttempts: 2, unlockAfterMs: 40_000, focusTargetId: 'staged' },
    ],
    wrongFeedback: [
      { choiceId: 'broken', speaker: LEAD, line: '歯車に傷はありませんぞ。壊れたのではなく、針だけを動かしています。', focusTargetId: 'back' },
    ],
    successFactId: 'fact-clock-staged', successCopy: '時計は証人ではなく、犯人が作ったアリバイですな。',
  },
  {
    id: 'projection-comparison', kind: 'projection-comparison', title: 'もうひとりの正体',
    objective: '映った姿が本物か確かめる。',
    successCondition: '光と像を一度見比べ、遅れたものを選ぶ。',
    learnedFact: '銀粉付きの紙人形が{{targetName}}の姿を映していた。',
    prompt: '光った直後の、像の目を見よう。', requiredHits: 1, delayedByMs: 400,
    choices: [
      { id: 'light', label: '光の合図', correct: false },
      { id: 'blink', label: '像のまばたき', correct: true },
      { id: 'room', label: '部屋全体', correct: false },
    ],
    hints: [
      { level: 1, text: '光と像の動きは同時かな？', unlockAfterAttempts: 0, unlockAfterMs: 0 },
      { level: 2, text: '光った直後の、目の動きを見よう。', unlockAfterAttempts: 1, unlockAfterMs: 20_000, focusTargetId: 'blink' },
      { level: 3, text: '遅れているのは「像のまばたき」。', unlockAfterAttempts: 2, unlockAfterMs: 40_000, focusTargetId: 'blink' },
    ],
    wrongFeedback: [
      { choiceId: 'light', speaker: SUPPORT, line: '光は音とぴったり。遅れたのは、その後の目じゃない？', focusTargetId: 'blink' },
      { choiceId: 'room', speaker: SUPPORT, line: '明るさは同じだったよ。像の顔だけ見てみよ。', focusTargetId: 'blink' },
    ],
    successFactId: 'fact-silver-double', successCopy: '銀粉付きの紙人形が、{{targetName}}の姿を映していた。',
  },
  {
    id: 'corridor-search', kind: 'location-search', title: '本物が通った道',
    objective: '本物が通った場所を探す。',
    successCondition: '窓、足跡、配膳箱を調べ、赤い糸を見つける。',
    learnedFact: '本物の赤い糸は廊下の配膳箱に残っていた。',
    prompt: '事件現場と同じ赤い糸を探そう。',
    locations: [
      { id: 'window', label: '窓', observation: '窓枠の埃は一本につながっている。開けた跡はない。', correct: false },
      { id: 'footprints', label: '窓向きの足跡', observation: '窓へ向かう跡だけで、戻った跡がない。', correct: false },
      { id: 'service-box', label: '廊下の配膳箱', observation: '留め金に、{{targetName}}の赤い糸が挟まっている。', correct: true },
    ],
    hints: [
      { level: 1, text: '本物には、切れた赤い糸が付いていた。', unlockAfterAttempts: 0, unlockAfterMs: 0 },
      { level: 2, text: '窓、足跡、箱に同じ糸がないか探そう。', unlockAfterAttempts: 1, unlockAfterMs: 20_000 },
      { level: 3, text: '配膳箱の留め金を見よう。', unlockAfterAttempts: 2, unlockAfterMs: 40_000, focusTargetId: 'service-box' },
    ],
    wrongFeedback: [
      { choiceId: 'window', speaker: SUPPORT, line: '埃がつながったまま。窓は開いてないよ。', focusTargetId: 'window' },
      { choiceId: 'footprints', speaker: SUPPORT, line: '戻りの跡がない。歩いた跡じゃなく、置いた跡かも。', focusTargetId: 'footprints' },
    ],
    successFactId: 'fact-service-box', successCopy: '見つけた。{{targetName}}は、この箱で運ばれたんだ。',
  },
] as const;

const CONTRADICTION: Contradiction = {
  id: 'window-route-lie',
  objective: '証言と証拠が合わない部分を見つける。',
  successCondition: '窓が開いていない証拠で否定できる言葉を選ぶ。',
  learnedFact: '窓の足跡は、配膳箱から目をそらすための囮だった。',
  statement: '足跡のとおり、窓から運び出した。',
  before: '銀粉の影は「足跡のとおり、窓から運び出した」と言った。',
  replaceTarget: '窓から運び出した',
  choices: [
    { id: 'subject', label: '足跡のとおり', correct: false, feedback: '足跡は実在する。問題は、その先の窓が開いていないことだ。' },
    { id: 'window-route', label: '窓から運び出した', correct: true, evidenceFactId: 'fact-service-box', feedback: '窓は開いていない。本物の糸は配膳箱に残っている。' },
    { id: 'carried', label: '運び出した', correct: false, feedback: '本物が部屋から動かされたことは、配膳箱の糸が示している。' },
  ],
  correctChoiceId: 'window-route',
  completed: '足跡は窓を逃走口に見せる囮。本物は配膳箱で運ばれた。',
  hints: [
    { level: 1, text: '窓が本当に開いた跡はある？', unlockAfterAttempts: 0, unlockAfterMs: 0 },
    { level: 2, text: '窓枠の埃と、配膳箱の赤い糸を比べよう。', unlockAfterAttempts: 1, unlockAfterMs: 20_000, focusTargetId: 'fact-service-box' },
    { level: 3, text: '「窓から運び出した」が証拠と合わない。', unlockAfterAttempts: 2, unlockAfterMs: 40_000, focusTargetId: 'window-route' },
  ],
  wrongFeedback: [
    { choiceId: 'subject', speaker: LEAD, line: '足跡はありますぞ。その先の窓が開いていないのです。', focusTargetId: 'window-route' },
    { choiceId: 'carried', speaker: LEAD, line: '移動したことは、配膳箱の糸が示していますぞ。', focusTargetId: 'fact-service-box' },
  ],
};

const ACCUSATION: readonly AccusationQuestion[] = [
  {
    id: 'culprit', prompt: '銀粉の紙人形を使った犯人は？',
    objective: '犯人を選ぶ。', successCondition: '現場と同じ銀粉投影を使った影を選ぶ。', learnedFact: '銀粉の影が犯行を主導した。',
    options: [
      { id: 'magician', label: '銀粉の影', enemyId: 'magician', correct: true, focusFactId: 'fact-silver-double', rebuttal: '現場と同じ銀粉投影を、あの影が妨害に使った。', returnSceneId: 'accusation' },
      { id: 'tracker', label: '足跡の影', enemyId: 'tracker', correct: false, focusFactId: 'fact-silver-double', rebuttal: '足跡だけでは、銀粉の紙人形を説明できない。', returnSceneId: 'accusation' },
      { id: 'informant', label: '青い封蝋の影', enemyId: 'informant', correct: false, focusFactId: 'fact-silver-double', rebuttal: '時刻を知っていても、銀粉の投影は作れない。', returnSceneId: 'accusation' },
    ],
    hints: [
      { level: 1, text: '身代わりに使われた素材を見よう。', unlockAfterAttempts: 0, unlockAfterMs: 0 },
      { level: 2, text: '現場と同じ銀粉投影で妨害した敵。', unlockAfterAttempts: 1, unlockAfterMs: 20_000 },
      { level: 3, text: '犯人は、銀粉の紙人形を操った影。', unlockAfterAttempts: 2, unlockAfterMs: 40_000, focusTargetId: 'magician' },
    ],
    wrongFeedback: [
      { choiceId: 'tracker', speaker: LEAD, line: '足跡だけでは、銀粉の紙人形を説明できませんぞ。', focusTargetId: 'fact-silver-double' },
      { choiceId: 'informant', speaker: LEAD, line: '情報だけでは、遅れて瞬く像を作れませんぞ。', focusTargetId: 'fact-silver-double' },
    ],
  },
  {
    id: 'method', prompt: 'どうやって不在を隠した？',
    objective: '犯行方法を選ぶ。', successCondition: '遅れて瞬いた像を説明できる方法を選ぶ。', learnedFact: '紙人形の投影で不在を隠した。',
    options: [
      { id: 'paper-projection', label: '銀粉の紙人形を投影した', correct: true, focusFactId: 'fact-silver-double', rebuttal: '遅れて瞬く像と銀粉が、紙人形の投影を示す。', returnSceneId: 'accusation' },
      { id: 'blackout', label: '部屋を暗くした', correct: false, focusFactId: 'fact-silver-double', rebuttal: '暗くしただけでは、遅れて瞬く像と銀粉が残らない。', returnSceneId: 'accusation' },
      { id: 'break-clock', label: '時計を壊した', correct: false, focusFactId: 'fact-clock-staged', rebuttal: '時計は壊れていない。針だけが00:07へ動かされている。', returnSceneId: 'accusation' },
    ],
    hints: [
      { level: 1, text: '本物がいないのに、姿だけ見えた。', unlockAfterAttempts: 0, unlockAfterMs: 0 },
      { level: 2, text: '光より遅れて瞬いたものを思い出そう。', unlockAfterAttempts: 1, unlockAfterMs: 20_000 },
      { level: 3, text: '銀粉の紙人形を投影した。', unlockAfterAttempts: 2, unlockAfterMs: 40_000, focusTargetId: 'paper-projection' },
    ],
    wrongFeedback: [
      { choiceId: 'blackout', speaker: SUPPORT, line: '暗くしただけじゃ、遅れて瞬く像は残らないよ。', focusTargetId: 'fact-silver-double' },
      { choiceId: 'break-clock', speaker: SUPPORT, line: '時計の歯車は無傷。壊したんじゃないよ。', focusTargetId: 'fact-clock-staged' },
    ],
  },
  {
    id: 'route', prompt: '本物を運び出した経路は？',
    objective: '運搬経路を選ぶ。', successCondition: '{{targetName}}の赤い糸が残った場所を選ぶ。', learnedFact: '本物は廊下の配膳箱で運ばれた。',
    options: [
      { id: 'service-box', label: '廊下の配膳箱', correct: true, focusFactId: 'fact-service-box', rebuttal: '本物の赤い糸が、配膳箱の留め金に残っている。', returnSceneId: 'accusation' },
      { id: 'window', label: '窓', correct: false, focusFactId: 'fact-service-box', rebuttal: '窓枠の埃は切れていない。誰も通っていない。', returnSceneId: 'accusation' },
      { id: 'front-door', label: '正面扉', correct: false, focusFactId: 'fact-service-box', rebuttal: '赤い糸は、正面扉ではなく配膳箱に残っている。', returnSceneId: 'accusation' },
    ],
    hints: [
      { level: 1, text: '{{targetName}}の赤い糸が残った場所を見よう。', unlockAfterAttempts: 0, unlockAfterMs: 0 },
      { level: 2, text: '窓ではなく、廊下側を探そう。', unlockAfterAttempts: 1, unlockAfterMs: 20_000 },
      { level: 3, text: '経路は廊下の配膳箱。', unlockAfterAttempts: 2, unlockAfterMs: 40_000, focusTargetId: 'service-box' },
    ],
    wrongFeedback: [
      { choiceId: 'window', speaker: LEAD, line: '窓枠の埃は切れていませんぞ。誰も通っていません。', focusTargetId: 'fact-service-box' },
      { choiceId: 'front-door', speaker: LEAD, line: '本物の糸は、配膳箱に残っていますぞ。', focusTargetId: 'fact-service-box' },
    ],
  },
] as const;

export const MIDNIGHT_DOUBLE_INCIDENT: IncidentStory = {
  id: 'incident-midnight-double', chapter: '第1話', title: '午前零時の、もうひとり',
  subtitle: '赤い糸、銀の粉、止まった00:07。{{targetName}}を救い出せ。',
  cutIn: {
    kicker: 'CASE 01・午前零時', title: '{{targetName}} 消失',
    lines: ['空席に残る赤い糸。', '投影幕には、もうひとりの{{targetName}}。'],
    cta: '本物を探しに行く',
  },
  allySlots: {
    lead: { nameTemplate: '{{allyLeadName}}' },
    support: { nameTemplate: '{{allySupportName}}' },
  },
  hostileEnemyIds: ['courier', 'informant', 'commander', 'safecracker', 'tracker', 'magician', 'veiled-duchess'],
  culpritEnemyId: 'magician',
  bgmKey: 'case-mystery',
  sceneIds: SCENES.map((scene) => scene.id), scenes: SCENES, interactions: INTERACTIONS,
  facts: {
    'fact-clock-staged': '時計は人の手で00:07に合わせられた。',
    'fact-silver-double': '銀粉付きの紙人形が、{{targetName}}の姿を映していた。',
    'fact-service-box': '本物の赤い糸は、廊下の配膳箱に残っていた。',
  },
  memoLines: [
    '00:07は、犯人が作った時刻のうそ。',
    '紙人形が、{{targetName}}の不在を隠した。',
    '本物は、廊下の配膳箱で運ばれた。',
  ],
  contradiction: CONTRADICTION,
  accusation: ACCUSATION,
  proofLines: [
    '銀粉の影は、紙人形で{{targetName}}の不在を隠した。',
    '時計を00:07に合わせ、窓の足跡で目をそらした。',
    '本物は、廊下の配膳箱で運び出された。',
  ],
  resolutionLines: [
    '{{targetName}}「遅いよ。ずっと呼んでたんだから」',
    '{{allySupportName}}「ごめん。でも、もう離さないよ」',
    '{{allyLeadName}}「偽物は、つながりまでは消せませんな」',
  ],
};

export const INCIDENT_STORIES: readonly IncidentStory[] = [MIDNIGHT_DOUBLE_INCIDENT];
