import type { ImageSourcePropType } from 'react-native';

import type { MobbyId } from './mobies';

export type IncidentComicId = `rescue-comic:${MobbyId}`;

export type IncidentComicPanel = {
  panel: 1 | 2 | 3 | 4;
  caption: string;
  alt: string;
};

export type IncidentComicPlaceholderPanels = readonly [
  IncidentComicPanel,
  IncidentComicPanel,
  IncidentComicPanel,
  IncidentComicPanel,
];

export type IncidentComic = {
  id: IncidentComicId;
  targetMobbyId: MobbyId;
  title: string;
  image?: ImageSourcePropType;
  placeholderPanels: IncidentComicPlaceholderPanels;
};

export function incidentComicId(targetMobbyId: MobbyId): IncidentComicId {
  return `rescue-comic:${targetMobbyId}`;
}

export const INCIDENT_COMICS: readonly IncidentComic[] = [
  {
    id: 'rescue-comic:mobirin',
    targetMobbyId: 'mobirin',
    title: '箱の中でも、名推理',
    image: undefined,
    placeholderPanels: [
      { panel: 1, caption: '暗い箱の中。もびりんは、耳を澄ませた。', alt: '配膳箱の中で静かに耳を澄ませるもびりん' },
      { panel: 2, caption: '「車輪は三回、曲がりましたな」', alt: '箱の揺れを数えながら逃走経路を考えるもびりん' },
      { panel: 3, caption: '救出の手が、留め金を開ける。', alt: '外から開いた配膳箱へ手を伸ばすもびりん' },
      { panel: 4, caption: '「遅くはありません。考える時間が増えただけですぞ」', alt: '救出されて穏やかに笑うもびりん' },
    ],
  },
  {
    id: 'rescue-comic:mobichi',
    targetMobbyId: 'mobichi',
    title: '救出直後も、盛れてる',
    image: undefined,
    placeholderPanels: [
      { panel: 1, caption: '投影幕に、そっくりな偽物。', alt: '投影幕に映る自分そっくりの紙人形を見るもびち' },
      { panel: 2, caption: '「え、うちって影までかわいくない？」', alt: '箱の中でも偽物の写りを気にするもびち' },
      { panel: 3, caption: '本物の手を握って、無事に救出。', alt: '差し出された手を握って配膳箱から出るもびち' },
      { panel: 4, caption: '「再会の写真、今の角度でもう一枚！」', alt: '救出直後に笑顔で写真の角度を決めるもびち' },
    ],
  },
  {
    id: 'rescue-comic:yami',
    targetMobbyId: 'yami',
    title: '見つけてくれた証拠',
    image: undefined,
    placeholderPanels: [
      { panel: 1, caption: '暗い配膳箱で、赤い糸を握る。', alt: '暗い配膳箱の中で赤い糸を握る病みモビー' },
      { panel: 2, caption: '「誰も来なかったら、どうしよう」', alt: 'ひとりで不安そうに膝を抱える病みモビー' },
      { panel: 3, caption: '名前を呼ぶ声が、すぐそばまで届く。', alt: '箱の外から聞こえる声に顔を上げる病みモビー' },
      { panel: 4, caption: '「来てくれた。もう、それだけで大丈夫」', alt: '救出した仲間のそばで安心する病みモビー' },
    ],
  },
  {
    id: 'rescue-comic:mobiyan',
    targetMobbyId: 'mobiyan',
    title: '曲げない救出ルート',
    image: undefined,
    placeholderPanels: [
      { panel: 1, caption: '箱が止まるたび、出口を探すもびやん。', alt: '配膳箱のすき間から出口を探すもびやん' },
      { panel: 2, caption: '「こんなとこで、黙って待てっかよ」', alt: '箱の留め金へ体当たりしようとするもびやん' },
      { panel: 3, caption: '外から留め金が開き、仲間の顔が見える。', alt: '開いた箱の向こうに仲間を見つけるもびやん' },
      { panel: 4, caption: '「助けは借りた。次はオレが守る番だ」', alt: '救出後に仲間の前へ立つもびやん' },
    ],
  },
  {
    id: 'rescue-comic:mobiyura',
    targetMobbyId: 'mobiyura',
    title: '堕天王、偽物を退ける',
    image: undefined,
    placeholderPanels: [
      { panel: 1, caption: '銀の幕に、もうひとりの王が現れる。', alt: '銀粉の投影に現れた自分の偽物を見るもびゆら' },
      { panel: 2, caption: '「我が残像にしては、闇が浅い」', alt: '紙人形の偽物を鋭く見据えるもびゆら' },
      { panel: 3, caption: '本物の手を選び、紙人形が崩れる。', alt: '救出の手を取るもびゆらと崩れる紙人形' },
      { panel: 4, caption: '「真名を呼ぶ声だけは、偽れぬのだ」', alt: '救出した仲間を背に誇らしく立つもびゆら' },
    ],
  },
  {
    id: 'rescue-comic:reomoby',
    targetMobbyId: 'reomoby',
    title: '王子の帰還',
    image: undefined,
    placeholderPanels: [
      { panel: 1, caption: '狭い箱でも、姿勢だけは崩さない。', alt: '狭い配膳箱の中で背筋を伸ばすれおもび' },
      { panel: 2, caption: '「迎えが来るまで、姫の笑顔を思い出そう」', alt: '暗い箱の中で落ち着いて待つれおもび' },
      { panel: 3, caption: '扉が開き、差し出された手を取る。', alt: '開いた配膳箱から手を取って出るれおもび' },
      { panel: 4, caption: '「待たせたね。ここからは僕がエスコートするよ」', alt: '救出後に仲間へ手を差し出すれおもび' },
    ],
  },
  {
    id: 'rescue-comic:potemoby',
    targetMobbyId: 'potemoby',
    title: '配膳箱で、ひと休み',
    image: undefined,
    placeholderPanels: [
      { panel: 1, caption: '逃走中の箱で、ぽてもびは丸くなる。', alt: '揺れる配膳箱の中で丸くなるぽてもび' },
      { panel: 2, caption: '「揺れがちょうどよくて……すやぁ」', alt: '箱の揺れに合わせて眠るぽてもび' },
      { panel: 3, caption: '救出の扉が開いても、まだ夢の中。', alt: '開いた配膳箱の中で眠り続けるぽてもび' },
      { panel: 4, caption: '「帰るの？　じゃあ、抱っこでお願い」', alt: '救出した仲間へ眠そうに両手を伸ばすぽてもび' },
    ],
  },
  {
    id: 'rescue-comic:mobibou',
    targetMobbyId: 'mobibou',
    title: '救出されても、いたずら',
    image: undefined,
    placeholderPanels: [
      { panel: 1, caption: '箱のすき間から、モビ坊が外をのぞく。', alt: '配膳箱のすき間から片目で外を見るモビ坊' },
      { panel: 2, caption: '見張りの足音に合わせて、箱をこつん。', alt: '見張りを驚かせようと箱の壁をたたくモビ坊' },
      { panel: 3, caption: '驚いた怪盗の隙に、留め金が開く。', alt: '外から開いた留め金を見て笑うモビ坊' },
      { panel: 4, caption: '「助けられたんじゃねーし。共同作戦だし！」', alt: '救出した仲間の横で得意げに胸を張るモビ坊' },
    ],
  },
  {
    id: 'rescue-comic:babumoby',
    targetMobbyId: 'babumoby',
    title: 'ばぶもび、帰還命令',
    image: undefined,
    placeholderPanels: [
      { panel: 1, caption: '暗い箱で、ばぶもびのほっぺがふくらむ。', alt: '暗い配膳箱の中で頬をふくらませるばぶもび' },
      { panel: 2, caption: '「ばぶ。だっこ、まだ？」', alt: '箱の外へ向けて抱っこを求めるばぶもび' },
      { panel: 3, caption: '扉が開いた瞬間、両手を大きく伸ばす。', alt: '開いた配膳箱から両手を伸ばすばぶもび' },
      { panel: 4, caption: '「全員集合。帰還命令は、ぎゅー！」', alt: '救出した仲間たちに抱きしめられるばぶもび' },
    ],
  },
] as const;

export const INCIDENT_COMIC_BY_MOBBY_ID = Object.fromEntries(
  INCIDENT_COMICS.map((comic) => [comic.targetMobbyId, comic]),
) as Record<MobbyId, IncidentComic>;

export const INCIDENT_COMIC_BY_ID = Object.fromEntries(
  INCIDENT_COMICS.map((comic) => [comic.id, comic]),
) as Record<IncidentComicId, IncidentComic>;

export function getIncidentComic(targetMobbyId: MobbyId): IncidentComic {
  return INCIDENT_COMIC_BY_MOBBY_ID[targetMobbyId];
}
