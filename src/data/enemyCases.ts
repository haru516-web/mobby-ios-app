import type { ImageSourcePropType } from 'react-native';

export type EnemyId =
  | 'courier'
  | 'informant'
  | 'commander'
  | 'safecracker'
  | 'tracker'
  | 'magician'
  | 'veiled-duchess';

export type EnemyCaseId =
  | 'case-01-informant'
  | 'case-02-tracker'
  | 'case-03-safecracker'
  | 'case-04-magician'
  | 'case-05-veiled-duchess'
  | 'case-06-courier'
  | 'case-07-operation';

export type EnemyRevealOrder = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type EnemyImplementationStatus = 'playable' | 'stub';
export type EnemyDisclosureState = 'locked' | 'encountered' | 'revealed';

export type EnemyDossier = {
  role: string;
  method: string;
  record: string;
};

export type EnemyAffiliation = {
  organizationId: 'phantom-seven';
  organizationName: '七人の怪盗団';
  relationship: '敵対';
};

export const PHANTOM_SEVEN_AFFILIATION: EnemyAffiliation = {
  organizationId: 'phantom-seven',
  organizationName: '七人の怪盗団',
  relationship: '敵対',
};

export type Enemy = {
  id: EnemyId;
  name: string;
  title: string;
  method: string;
  accent: string;
  image: ImageSourcePropType;
  revealOrder: EnemyRevealOrder;
  publicChapter: string;
  implementationStatus: EnemyImplementationStatus;
  preRevealAlias: string;
  revealEnemyId: EnemyId;
  dossier: EnemyDossier;
  affiliation: EnemyAffiliation;
};

export type EnemyPublicDescriptor = {
  enemyId: EnemyId;
  revealEnemyId: EnemyId;
  revealOrder: EnemyRevealOrder;
  publicChapter: string;
  implementationStatus: EnemyImplementationStatus;
  disclosure: EnemyDisclosureState;
  displayName: string;
  displayRole: string;
  displayMethod: string;
  record: string;
  affiliation: EnemyAffiliation;
  image?: ImageSourcePropType;
};

export type EnemyCase = {
  id: EnemyCaseId;
  chapter: string;
  publicChapter: string;
  revealOrder: EnemyRevealOrder;
  implementationStatus: EnemyImplementationStatus;
  preRevealAlias: string;
  revealEnemyId: EnemyId;
  title: string;
  kind: 'story' | 'operation';
  summary: string;
  scene: string;
  target: string;
  mainEnemyId: EnemyId;
  partnerEnemyId?: EnemyId;
  choices: readonly EnemyId[];
  correctEnemyId: EnemyId;
  clue: string;
  response: string;
  rewardTitle: string;
  rewardCopy: string;
  accent: string;
};

export const ENEMIES: readonly Enemy[] = [
  {
    id: 'courier',
    name: '運び屋',
    title: '逃走ルート担当',
    method: '箱と逃走経路でモビーを運ぶ',
    accent: '#E28B45',
    image: require('../../assets/enemies/courier.png'),
    revealOrder: 6,
    publicChapter: '第6話',
    implementationStatus: 'stub',
    preRevealAlias: '三つの箱の影',
    revealEnemyId: 'courier',
    dossier: {
      role: '逃走ルート担当',
      method: '箱と逃走経路で、狙ったモビーを運び出す。',
      record: '三つの箱と車輪の跡を使い、追跡を分断した。',
    },
    affiliation: PHANTOM_SEVEN_AFFILIATION,
  },
  {
    id: 'informant',
    name: '情報屋',
    title: '情報収集担当',
    method: 'モビーの行動時間と居場所を盗む',
    accent: '#4CA3AC',
    image: require('../../assets/enemies/informant.png'),
    revealOrder: 2,
    publicChapter: '第2話',
    implementationStatus: 'stub',
    preRevealAlias: '青い封蝋の影',
    revealEnemyId: 'informant',
    dossier: {
      role: '情報収集担当',
      method: '行動時間と居場所を盗み、次の犯行へ渡す。',
      record: '暮らしの時刻と眠る場所を、青い封蝋の名簿へ写した。',
    },
    affiliation: PHANTOM_SEVEN_AFFILIATION,
  },
  {
    id: 'commander',
    name: '司令官',
    title: '作戦指揮担当',
    method: '6体を動かす大型作戦を計画する',
    accent: '#B44752',
    image: require('../../assets/enemies/commander.png'),
    revealOrder: 7,
    publicChapter: '第7話',
    implementationStatus: 'stub',
    preRevealAlias: '赤い印の主',
    revealEnemyId: 'commander',
    dossier: {
      role: '作戦指揮担当',
      method: '六人の手口を、一つの作戦に束ねる。',
      record: '六つの担当へ時刻順の指示を出し、強奪作戦を組み上げた。',
    },
    affiliation: PHANTOM_SEVEN_AFFILIATION,
  },
  {
    id: 'safecracker',
    name: '金庫破り',
    title: '保管場所突破担当',
    method: '鍵・ダイヤル・暗証番号を破る',
    accent: '#3B9C83',
    image: require('../../assets/enemies/safecracker.png'),
    revealOrder: 4,
    publicChapter: '第4話',
    implementationStatus: 'stub',
    preRevealAlias: '鍵穴の影',
    revealEnemyId: 'safecracker',
    dossier: {
      role: '保管場所突破担当',
      method: '鍵・ダイヤル・暗証番号を破る。',
      record: '専用工具と色順の癖を使い、展示金庫へ手をかけた。',
    },
    affiliation: PHANTOM_SEVEN_AFFILIATION,
  },
  {
    id: 'tracker',
    name: '追跡者',
    title: '居場所特定担当',
    method: '足あとから隠れ場所を探し出す',
    accent: '#7254B1',
    image: require('../../assets/enemies/tracker.png'),
    revealOrder: 3,
    publicChapter: '第3話',
    implementationStatus: 'stub',
    preRevealAlias: '足跡の影',
    revealEnemyId: 'tracker',
    dossier: {
      role: '居場所特定担当',
      method: '足あとと生活痕から、隠れ場所を割り出す。',
      record: '濡れた足あとを残し、家具の裏の寝息まで追い詰めた。',
    },
    affiliation: PHANTOM_SEVEN_AFFILIATION,
  },
  {
    id: 'magician',
    name: '奇術師',
    title: '偽物制作担当',
    method: '偽物や分身を作って入れ替える',
    accent: '#A94B72',
    image: require('../../assets/enemies/magician.png'),
    revealOrder: 1,
    publicChapter: '第1話',
    implementationStatus: 'playable',
    preRevealAlias: '銀粉の影',
    revealEnemyId: 'magician',
    dossier: {
      role: '偽物制作担当',
      method: '銀粉の紙人形で、姿と時刻を偽装する。',
      record: '午前零時、紙人形の投影でモビーの不在を隠した。',
    },
    affiliation: PHANTOM_SEVEN_AFFILIATION,
  },
  {
    id: 'veiled-duchess',
    name: '仮面の貴婦人',
    title: '侵入担当',
    method: '訪問者に変装して部屋へ忍び込む',
    accent: '#8E4C92',
    image: require('../../assets/enemies/veiled-duchess.png'),
    revealOrder: 5,
    publicChapter: '第5話',
    implementationStatus: 'stub',
    preRevealAlias: '鏡の外の影',
    revealEnemyId: 'veiled-duchess',
    dossier: {
      role: '侵入担当',
      method: '訪問者を装い、警戒の内側へ入り込む。',
      record: '優雅な来訪者へ変装し、棚の奥まで視線を巡らせた。',
    },
    affiliation: PHANTOM_SEVEN_AFFILIATION,
  },
] as const;

export const ENEMIES_IN_REVEAL_ORDER: readonly Enemy[] = [...ENEMIES]
  .sort((left, right) => left.revealOrder - right.revealOrder);

export const ENEMY_BY_ID = Object.fromEntries(ENEMIES.map((enemy) => [enemy.id, enemy])) as Record<EnemyId, Enemy>;

const ENEMY_CASE_CATALOG: readonly EnemyCase[] = [
  {
    id: 'case-01-informant',
    chapter: '第2話',
    publicChapter: '第2話',
    revealOrder: 2,
    implementationStatus: 'stub',
    preRevealAlias: '青い封蝋の影',
    revealEnemyId: 'informant',
    title: 'モビー名簿',
    kind: 'story',
    summary: '部屋のモビー情報が、誰かの名簿に書き写されている。',
    scene: '机の上に、触る時間・眠る場所・レア度を記した名簿が残されていた。',
    target: '一番レアなモビー',
    mainEnemyId: 'informant',
    choices: ['informant', 'tracker', 'magician'],
    correctEnemyId: 'informant',
    clue: '盗まれたのはモビーそのものではなく、行動時間と居場所の情報だった。',
    response: '偽の住所を混ぜたことで、組織は別の部屋へ向かった。',
    rewardTitle: '秘密を守った',
    rewardCopy: '救出されたモビーが、ほっと胸をなで下ろす限定リアクション。',
    accent: '#4CA3AC',
  },
  {
    id: 'case-02-tracker',
    chapter: '第3話',
    publicChapter: '第3話',
    revealOrder: 3,
    implementationStatus: 'stub',
    preRevealAlias: '足跡の影',
    revealEnemyId: 'tracker',
    title: '足あとを追え',
    kind: 'story',
    summary: '小さな足あとが家具の裏へ続き、モビーの姿が見えない。',
    scene: '足あとを一つずつ追うと、窓際のクッションだけが少しずれていた。',
    target: '家具の裏に隠れたモビー',
    mainEnemyId: 'tracker',
    choices: ['tracker', 'courier', 'veiled-duchess'],
    correctEnemyId: 'tracker',
    clue: '足あとを残したのは、モビーを運ぶためではなく隠れ場所を特定するためだった。',
    response: '足あとを逆向きにたどり、モビーを先に見つけ出した。',
    rewardTitle: '見つけてくれた',
    rewardCopy: '抱き上げられて安心したモビーの、救出直後の限定リアクション。',
    accent: '#7254B1',
  },
  {
    id: 'case-03-safecracker',
    chapter: '第4話',
    publicChapter: '第4話',
    revealOrder: 4,
    implementationStatus: 'stub',
    preRevealAlias: '鍵穴の影',
    revealEnemyId: 'safecracker',
    title: '金庫の中のモビー',
    kind: 'story',
    summary: '展示ケースに傷。金庫のダイヤルが、モビーのボタン色で揃えられている。',
    scene: '金庫の前には、途中まで回されたダイヤルと細い金属粉が落ちている。',
    target: '展示ケースのレアモビー',
    mainEnemyId: 'safecracker',
    choices: ['safecracker', 'magician', 'commander'],
    correctEnemyId: 'safecracker',
    clue: '偽物を作る痕跡ではなく、鍵とダイヤルだけが狙われている。',
    response: '正しい色順で先にロックをかけ、金庫を守り切った。',
    rewardTitle: '金庫から救出',
    rewardCopy: '金庫の中で震えたあと、安心して笑う限定リアクション。',
    accent: '#3B9C83',
  },
  {
    id: 'case-04-magician',
    chapter: '第1話',
    publicChapter: '第1話',
    revealOrder: 1,
    implementationStatus: 'playable',
    preRevealAlias: '銀粉の影',
    revealEnemyId: 'magician',
    title: '午前零時の、もうひとり',
    kind: 'story',
    summary: '部屋に同じ見た目のモビーが3体。触ると反応のタイミングが少し違う。',
    scene: '中央のモビーだけが、触れた指を目で追っている。',
    target: '3体に増えたモビー',
    mainEnemyId: 'magician',
    choices: ['magician', 'veiled-duchess', 'informant'],
    correctEnemyId: 'magician',
    clue: '入れ替えを成立させるには、見た目を作る担当が必要だ。',
    response: '本物を抱き寄せると、偽物は紙吹雪になって崩れた。',
    rewardTitle: '本物だよ',
    rewardCopy: '本物だと見抜かれて、照れながら頬をゆるめる限定リアクション。',
    accent: '#A94B72',
  },
  {
    id: 'case-05-veiled-duchess',
    chapter: '第5話',
    publicChapter: '第5話',
    revealOrder: 5,
    implementationStatus: 'stub',
    preRevealAlias: '鏡の外の影',
    revealEnemyId: 'veiled-duchess',
    title: '仮面の来訪者',
    kind: 'story',
    summary: '優雅な訪問者が3人。ひとりだけ、モビーの居場所を確認している。',
    scene: '紅茶をすすめる手袋の奥で、視線だけが部屋の棚を探していた。',
    target: '棚で眠るモビー',
    mainEnemyId: 'veiled-duchess',
    choices: ['veiled-duchess', 'courier', 'tracker'],
    correctEnemyId: 'veiled-duchess',
    clue: '訪問者を装い、部屋の中まで自然に入れるのは侵入担当だ。',
    response: '鏡に映った本当の影を示すと、仮面の貴婦人は優雅に退散した。',
    rewardTitle: '仮面を外して',
    rewardCopy: '驚きと安堵が入り混じった、救出後の限定リアクション。',
    accent: '#8E4C92',
  },
  {
    id: 'case-06-courier',
    chapter: '第6話',
    publicChapter: '第6話',
    revealOrder: 6,
    implementationStatus: 'stub',
    preRevealAlias: '三つの箱の影',
    revealEnemyId: 'courier',
    title: '箱の中のモビー',
    kind: 'story',
    summary: '箱が3つ、部屋を横切った。モビーが入った箱を追いかけよう。',
    scene: 'ひとつだけ、角からモビーの小さなリボンがのぞいている。',
    target: '逃走する箱の中のモビー',
    mainEnemyId: 'courier',
    choices: ['courier', 'safecracker', 'commander'],
    correctEnemyId: 'courier',
    clue: '箱を用意し、逃走ルートへ運ぶ担当が犯行の中心にいる。',
    response: '箱を先回りして開けると、モビーが顔だけ出していた。',
    rewardTitle: '箱からひょこっ',
    rewardCopy: '箱から顔を出して、助けを待っていた限定リアクション。',
    accent: '#E28B45',
  },
  {
    id: 'case-07-operation',
    chapter: '第7話',
    publicChapter: '第7話',
    revealOrder: 7,
    implementationStatus: 'stub',
    preRevealAlias: '赤い印の主',
    revealEnemyId: 'commander',
    title: '七人の作戦',
    kind: 'operation',
    summary: '司令官が6体を動かす、大型のモビー強奪作戦が始まった。',
    scene: '情報、追跡、偽物、金庫、侵入、逃走。6つの担当が一枚の計画書に並んでいる。',
    target: 'いちばん大切なモビー',
    mainEnemyId: 'commander',
    partnerEnemyId: 'veiled-duchess',
    choices: ['commander', 'veiled-duchess', 'safecracker', 'informant'],
    correctEnemyId: 'commander',
    clue: '現場に来た担当者ではなく、全員の手順を組んだ者が大型作戦の主犯だ。',
    response: '役割分担を逆算し、最後の指示を出す司令官の計画を止めた。',
    rewardTitle: '救出作戦、成功',
    rewardCopy: '七人の作戦を乗り越え、ぎゅっと抱きつく特別な限定リアクション。',
    accent: '#B44752',
  },
] as const;

export const ENEMY_CASES: readonly EnemyCase[] = [...ENEMY_CASE_CATALOG]
  .sort((left, right) => left.revealOrder - right.revealOrder);

export const ENEMY_CASE_BY_ID = Object.fromEntries(
  ENEMY_CASES.map((caseData) => [caseData.id, caseData]),
) as Record<EnemyCaseId, EnemyCase>;

export type PlayableEnemyCase = EnemyCase & { implementationStatus: 'playable' };

export function isPlayableEnemyCase(caseData: EnemyCase): caseData is PlayableEnemyCase {
  return caseData.implementationStatus === 'playable';
}

export const PLAYABLE_ENEMY_CASES: readonly PlayableEnemyCase[] = ENEMY_CASES
  .filter(isPlayableEnemyCase);

export function getEnemy(id: EnemyId): Enemy {
  return ENEMY_BY_ID[id];
}

export function getEnemyCase(id: EnemyCaseId): EnemyCase {
  return ENEMY_CASE_BY_ID[id];
}

export function getEnemyPublicDescriptor(
  enemyId: EnemyId,
  disclosure: EnemyDisclosureState,
): EnemyPublicDescriptor {
  const enemy = getEnemy(enemyId);
  const common = {
    enemyId,
    revealEnemyId: enemy.revealEnemyId,
    revealOrder: enemy.revealOrder,
    publicChapter: enemy.publicChapter,
    implementationStatus: enemy.implementationStatus,
    disclosure,
    affiliation: enemy.affiliation,
  } as const;

  if (disclosure === 'revealed') {
    return {
      ...common,
      displayName: enemy.name,
      displayRole: enemy.dossier.role,
      displayMethod: enemy.dossier.method,
      record: enemy.dossier.record,
      image: enemy.image,
    };
  }

  if (disclosure === 'encountered') {
    return {
      ...common,
      displayName: enemy.preRevealAlias,
      displayRole: '怪盗団・未確認',
      displayMethod: '手口を捜査中',
      record: '事件を解決すると、正式な記録が開示される。',
      image: undefined,
    };
  }

  return {
    ...common,
    displayName: '未確認',
    displayRole: '同じ印を持つ怪盗',
    displayMethod: '手口も正体も未確認',
    record: '事件記録はまだ届いていない。',
    image: undefined,
  };
}
