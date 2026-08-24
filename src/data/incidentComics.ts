import type { ImageSourcePropType } from 'react-native';

import { BLACK_STAR_PROFILES } from '@/domain/characters';

import type { EnemyId } from './enemies';
import type { MobbyId } from './mobies';

export type IncidentComicId =
  | 'incident-01'
  | 'incident-02'
  | 'incident-03'
  | 'incident-04'
  | 'incident-05'
  | 'incident-06'
  | 'incident-07';

export type BlackStarIdentity = {
  enemyId: EnemyId;
  /** The permanent display name. The former role name remains as a title. */
  name: string;
  reading: string;
  role: string;
  epithet: string;
  personality: string;
  accentColor: string;
};

export type IncidentComicLine = {
  speaker: string;
  text: string;
};

export type IncidentComicPanel = {
  id: string;
  order: 1 | 2 | 3 | 4;
  heading: string;
  narration: string;
  dialogue: readonly IncidentComicLine[];
  accessibilityLabel: string;
  visualDirection: string;
  /**
   * Temporary scene art used until the generated, flattened panel is added.
   * Replace only `image` with the file at `generatedAssetPath`; the player API
   * deliberately does not depend on the temporary composition.
   */
  image: ImageSourcePropType;
  imageStatus: 'temporary-existing-background' | 'generated';
  generatedAssetPath: string;
};

export type IncidentComic = {
  id: IncidentComicId;
  order: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  enemyId: EnemyId;
  featuredMobbyId: MobbyId;
  title: string;
  shortTitle: string;
  synopsis: string;
  unlockCopy: string;
  thumbnail: ImageSourcePropType;
  panels: readonly [IncidentComicPanel, IncidentComicPanel, IncidentComicPanel, IncidentComicPanel];
};

/**
 * The character-domain profiles are the single source of truth for names.
 * This smaller view keeps the incident feature independently consumable.
 */
export const BLACK_STAR_IDENTITIES = Object.fromEntries(
  BLACK_STAR_PROFILES.map((profile) => [profile.enemyId, {
    enemyId: profile.enemyId,
    name: profile.name,
    reading: profile.reading,
    role: profile.title,
    epithet: profile.catchphrase,
    personality: profile.personality,
    accentColor: profile.palette.accent,
  }]),
) as unknown as Readonly<Record<EnemyId, BlackStarIdentity>>;

const panel = (
  incidentId: IncidentComicId,
  order: 1 | 2 | 3 | 4,
  heading: string,
  narration: string,
  dialogue: readonly IncidentComicLine[],
  accessibilityLabel: string,
  visualDirection: string,
  image: ImageSourcePropType,
  imageStatus: IncidentComicPanel['imageStatus'] = 'temporary-existing-background',
): IncidentComicPanel => ({
  id: `${incidentId}-panel-${String(order).padStart(2, '0')}`,
  order,
  heading,
  narration,
  dialogue,
  accessibilityLabel,
  visualDirection,
  image,
  imageStatus,
  generatedAssetPath: `assets/incidents/comics/${incidentId}/panel-${String(order).padStart(2, '0')}.png`,
});

export const INCIDENT_COMICS = [
  {
    id: 'incident-01',
    order: 1,
    enemyId: 'safecracker',
    featuredMobbyId: 'reomoby',
    title: '解錠師と王子の完璧な一杯',
    shortTitle: '完璧な一杯',
    synopsis: '金庫だけを開けに来た久世錠士郎を、れおもびの王子待遇と紅茶へのこだわりが引き止める。',
    unlockCopy: '久世 錠士郎が仲間になった',
    thumbnail: require('../../assets/enemies/safecracker.png') as ImageSourcePropType,
    panels: [
      panel('incident-01', 1, '無音の侵入者', '月夜の屋敷。金庫の前に、鍵束を鳴らさない影が立つ。', [
        { speaker: '錠士郎', text: '錠の呼吸は読んだ。三十秒で終わる。' },
        { speaker: 'れおもび', text: 'ようこそ。王室のティータイムへ！' },
      ], '金庫へ忍び込んだ錠士郎を、れおもびが客として迎えている', '厳しい表情で金庫へ工具を向ける錠士郎。背後から、れおもびがティーカートを華やかに押して登場する。', require('../../assets/incidents/comics/incident-01/panel-01.png') as ImageSourcePropType, 'generated'),
      panel('incident-01', 2, '作業台はティーテーブル', 'れおもびは解錠工具の横へ、当然のように茶葉とカップを並べた。', [
        { speaker: 'れおもび', text: '最高の客人には、最高の一杯を。' },
        { speaker: '錠士郎', text: 'その湯温では香りが死ぬ。貸せ。' },
      ], '解錠工具の隣で紅茶の湯温を直す錠士郎', '精密工具とティーセットが同じ机に並ぶ。錠士郎が真剣な顔で温度計を持ち、れおもびが感心して見守る。', require('../../assets/incidents/comics/incident-01/panel-02.png') as ImageSourcePropType, 'generated'),
      panel('incident-01', 3, '一秒単位の抽出', '解錠より鋭い手つきで、錠士郎は完璧な紅茶を淹れてしまう。', [
        { speaker: '錠士郎', text: '三秒待て。標高も計算に入れろ。' },
        { speaker: 'れおもび', text: '君、王室の給仕に向いているよ。' },
      ], '錠士郎が完璧な紅茶を淹れ、れおもびが拍手している', '湯気の向こうでティーポットを正確に傾ける錠士郎。れおもびは王冠がずれるほど盛大に拍手する。', require('../../assets/incidents/comics/incident-01/panel-03.png') as ImageSourcePropType, 'generated'),
      panel('incident-01', 4, '開かなかったもの', '夜明け。紅茶は完璧。金庫は一度も触られていなかった。', [
        { speaker: 'れおもび', text: '金庫も守れて、朝のお茶も最高！' },
        { speaker: '錠士郎', text: '……俺は何を開けに来たんだ。' },
      ], '閉じた金庫の前でカップを持ち、目的を見失う錠士郎', '閉じたままの金庫を背景に、二人がティーカップを持つ。錠士郎だけが深刻に金庫を見つめる。', require('../../assets/incidents/comics/incident-01/panel-04.png') as ImageSourcePropType, 'generated'),
    ],
  },
  {
    id: 'incident-02',
    order: 2,
    enemyId: 'informant',
    featuredMobbyId: 'yami',
    title: '午前三時の未読機密',
    shortTitle: '未読機密',
    synopsis: '一言で世界を動かす御影静馬の通信網へ、やみの止まらない独り言が流れ込む。',
    unlockCopy: '御影 静馬が仲間になった',
    thumbnail: require('../../assets/enemies/informant.png') as ImageSourcePropType,
    panels: [
      panel('incident-02', 1, '眠らない観測者', '午前三時。静馬は全モビーの行動記録を一息で盗み出した。', [
        { speaker: '静馬', text: '情報は刃だ。必要な一言で十分だ。' },
        { speaker: 'やみ', text: '眠れない理由なら、四十七個あるよ。' },
      ], '通信室の静馬に、やみが話しかけている', '暗い通信室。端末を静かに操作する静馬の横で、やみが小さく手を挙げて話し始める。', require('../../assets/incidents/comics/incident-02/panel-01.png') as ImageSourcePropType, 'generated'),
      panel('incident-02', 2, '一言目が終わらない', 'やみは本題の前に、昨日見た夢と深夜食の話を全回線へ送った。', [
        { speaker: 'やみ', text: 'ここまでが前置き。まだ一件目ね。' },
        { speaker: '静馬', text: '回線を切れ。今すぐだ。' },
      ], '大量の吹き出しが通信端末へ流れ、静馬が止めようとしている', '端末画面を埋め尽くす大量の通知。やみは淡々と話し、静馬は初めて両手で停止操作をする。', require('../../assets/incidents/comics/incident-02/panel-02.png') as ImageSourcePropType, 'generated'),
      panel('incident-02', 3, '未読9999件', '端末は独り言で満杯になり、盗んだ名簿を自動排出した。', [
        { speaker: '静馬', text: '情報は精度と選別だ！' },
        { speaker: 'やみ', text: 'いい言葉。今のも全員に送った。' },
      ], '通知に埋もれた静馬の前へ、盗まれた名簿が排出される', '未読9999+の表示と吹き出しの山に腰まで埋まる静馬。プリンターから名簿が飛び出す。', require('../../assets/incidents/comics/incident-02/panel-03.png') as ImageSourcePropType, 'generated'),
      panel('incident-02', 4, '最高機密の経費', '翌朝、黒星の経費表に新しい項目が追加された。', [
        { speaker: '静馬', text: '最高級耳栓、七組。理由は極秘だ。' },
        { speaker: 'やみ', text: '届いたら感想、電話で聞くね。' },
      ], '耳栓の経費申請を書く静馬へ、やみが電話をかけようとしている', '疲れ切って耳栓の申請書を書く静馬。その背後で、やみが通話ボタンへ指を伸ばす。', require('../../assets/incidents/comics/incident-02/panel-04.png') as ImageSourcePropType, 'generated'),
    ],
  },
  {
    id: 'incident-03',
    order: 3,
    enemyId: 'tracker',
    featuredMobbyId: 'mobiyan',
    title: '追跡者と忍べない忍者',
    shortTitle: '忍べない忍者',
    synopsis: 'どんな痕跡も読む狩谷迅へ、もびやんが「足あとを増やして隠す」正面突破を挑む。',
    unlockCopy: '狩谷 迅が仲間になった',
    thumbnail: require('../../assets/enemies/tracker.png') as ImageSourcePropType,
    panels: [
      panel('incident-03', 1, '一滴の手がかり', '迅は床の一滴だけで、侵入者の歩幅と逃走方向を読み切った。', [
        { speaker: '迅', text: '消した痕跡ほど雄弁だ。' },
        { speaker: 'もびやん', text: 'なら痕跡を増やして隠すでござる！' },
      ], '一つの足あとを調べる迅の前で、もびやんが作戦を思いつく', '床の小さな足跡へ鋭く視線を落とす迅。もびやんは名案を思いつき、拳を上げる。', require('../../assets/incidents/comics/incident-03/panel-01.png') as ImageSourcePropType, 'generated'),
      panel('incident-03', 2, '百個の足あと', 'もびやんは廊下を足あとで埋め、紫色に光る煙幕を投げた。', [
        { speaker: 'もびやん', text: '忍法・痕跡いっぱいの術！' },
        { speaker: '迅', text: '君の歩幅だけ全部同じだ。' },
      ], '百個の足あとと派手な煙幕の中で、迅が正解を指している', '廊下一面の足跡と派手な紫煙。迅は迷わず一列だけを指し、もびやんは驚く。', require('../../assets/incidents/comics/incident-03/panel-02.png') as ImageSourcePropType, 'generated'),
      panel('incident-03', 3, '最終奥義・名乗る', '隠れ切れないと悟ったもびやんは、花火とともに自分から名乗った。', [
        { speaker: 'もびやん', text: 'もびやん、ここにあり！' },
        { speaker: '迅', text: '追跡対象が位置を実況するな。' },
      ], '花火の下で名乗るもびやんに、迅があきれている', '室内なのに小さな祝砲が上がり、もびやんが胸を張る。迅は追跡用の地図を静かに閉じる。', require('../../assets/incidents/comics/incident-03/panel-03.png') as ImageSourcePropType, 'generated'),
      panel('incident-03', 4, '見失った理由', '迅は標的を見失わなかった。ただし笑いすぎて追えなかった。', [
        { speaker: '迅', text: 'この消音靴は返品する。必要ない。' },
        { speaker: 'もびやん', text: '勝利の花火を追加するでござる！' },
      ], '笑いをこらえる迅が消音靴を返し、もびやんがまた花火を用意する', '消音靴の箱を返却する迅は口元を隠して肩を震わせる。背後でもびやんが次の花火へ点火する。', require('../../assets/incidents/comics/incident-03/panel-04.png') as ImageSourcePropType, 'generated'),
    ],
  },
  {
    id: 'incident-04',
    order: 4,
    enemyId: 'magician',
    featuredMobbyId: 'mobiyura',
    title: '奇術師の弟子ではありません',
    shortTitle: '弟子ではない',
    synopsis: '完璧な分身を操る天城幻十郎が、もびゆらを勝手に弟子認定。舞台は遺失物窓口へ移る。',
    unlockCopy: '天城 幻十郎が仲間になった',
    thumbnail: require('../../assets/enemies/magician.png') as ImageSourcePropType,
    panels: [
      panel('incident-04', 1, '偽物は芸術', '幻十郎が指を鳴らすと、紙人形は影まで備えた完璧な分身になった。', [
        { speaker: '幻十郎', text: '信じた一秒だけ、偽物は本物になる。' },
        { speaker: 'もびゆら', text: '拍手はする。弟子入りはしない。' },
      ], '分身を出す幻十郎へ、もびゆらが拍手しつつ弟子入りを断る', 'スポットライトの中で紙の分身を操る幻十郎。もびゆらは冷静に拍手しながら首を横へ振る。', require('../../assets/incidents/comics/incident-04/panel-01.png') as ImageSourcePropType, 'generated'),
      panel('incident-04', 2, '反抗心も才能', '断るたび、幻十郎は「その反抗心こそ弟子向きだ」と距離を詰める。', [
        { speaker: '幻十郎', text: '秘伝を授けよう、我が第一の弟子よ。' },
        { speaker: 'もびゆら', text: '同意欄が空白。契約は無効。' },
      ], '弟子の契約書を差し出す幻十郎に、もびゆらが空白の同意欄を示す', '豪華な弟子契約書を差し出す幻十郎。もびゆらは虫眼鏡で空白の同意欄を指す。', require('../../assets/incidents/comics/incident-04/panel-02.png') as ImageSourcePropType, 'generated'),
      panel('incident-04', 3, '帽子は遺失物', 'もびゆらはシルクハットへ番号札を付け、受付へ届けた。', [
        { speaker: '幻十郎', text: '私の象徴を遺失物扱いするな！' },
        { speaker: 'もびゆら', text: '受取欄に本名を書いて。' },
      ], '遺失物窓口に置かれた帽子を、幻十郎が取り戻そうとしている', '番号007の札が付いた帽子が窓口の主役として照らされる。幻十郎は焦り、もびゆらは受付票を差し出す。', require('../../assets/incidents/comics/incident-04/panel-03.png') as ImageSourcePropType, 'generated'),
      panel('incident-04', 4, '今夜の主役', '幻十郎は本名を署名。弟子は増えず、帽子だけが拍手を浴びた。', [
        { speaker: 'もびゆら', text: '本人確認できました。帽子を返します。' },
        { speaker: '幻十郎', text: 'この署名も演出の一部だ。' },
      ], '帽子を受け取る幻十郎の横で、もびゆらが返却済みの印を押している', '帽子を抱え威厳を取り戻そうとする幻十郎。もびゆらが大きな返却済みスタンプを押し、客席は帽子へ拍手する。', require('../../assets/incidents/comics/incident-04/panel-04.png') as ImageSourcePropType, 'generated'),
    ],
  },
  {
    id: 'incident-05',
    order: 5,
    enemyId: 'veiled-duchess',
    featuredMobbyId: 'mobirin',
    title: '仮面の貴婦人と怖がらない客',
    shortTitle: '怖がらない客',
    synopsis: '恐怖を完璧に演出する黒姫紫苑へ、もびりんが感心と差し入れを返してしまう。',
    unlockCopy: '黒姫 紫苑が仲間になった',
    thumbnail: require('../../assets/enemies/veiled-duchess.png') as ImageSourcePropType,
    panels: [
      panel('incident-05', 1, '悲鳴の女主人', '紫苑は主の声と歩幅をまとい、夜の温室へ静かに現れた。', [
        { speaker: '紫苑', text: '恐怖は鍵より静かに心を開きますの。' },
        { speaker: 'もびりん', text: 'その仮面、裏側も見せてくだされ。' },
      ], '恐ろしい仮面で現れた紫苑へ、もびりんが興味深そうに近づく', '月夜の温室で優雅にポーズを取る紫苑。もびりんは怖がらず、仮面の留め具を観察する。', require('../../assets/incidents/comics/incident-05/panel-01.png') as ImageSourcePropType, 'generated'),
      panel('incident-05', 2, '演出の裏側', 'もびりんは黒い幕を開け、骸骨とびっくり箱へ丁寧に会釈した。', [
        { speaker: 'もびりん', text: '準備に時間がかかったでしょうな。' },
        { speaker: '紫苑', text: '感心する場面ではありませんわ！' },
      ], '恐怖装置を見つけても感心するもびりんに、紫苑が困惑している', '幕の裏に並ぶ手作りの恐怖装置。もびりんは職人仕事を見るように感心し、骸骨も照れて会釈する。', require('../../assets/incidents/comics/incident-05/panel-02.png') as ImageSourcePropType, 'generated'),
      panel('incident-05', 3, '初めての差し入れ', '悲鳴を待つ紫苑へ、もびりんは温かい飲み物とお菓子を渡した。', [
        { speaker: 'もびりん', text: '夜勤には甘いものですぞ。' },
        { speaker: '紫苑', text: 'なぜ労われていますの、わたくし。' },
      ], 'お菓子の差し入れを受け取り、戸惑う紫苑', '恐怖用の小道具の中央に温かな飲み物とお菓子。紫苑は仮面のまま両手で受け取り戸惑う。', require('../../assets/incidents/comics/incident-05/panel-03.png') as ImageSourcePropType, 'generated'),
      panel('incident-05', 4, '唯一の悲鳴', '記念写真の直後、もびりんが演出費の請求書を差し出した。', [
        { speaker: 'もびりん', text: '経費精算はこちらですぞ。' },
        { speaker: '紫苑', text: 'きゃっ！' },
      ], '記念写真では平然としていた紫苑が、経費精算書にだけ驚く', '笑顔の記念写真の直後。長い経費明細を見た紫苑だけが本気で飛び上がり、もびりんは納得してうなずく。', require('../../assets/incidents/comics/incident-05/panel-04.png') as ImageSourcePropType, 'generated'),
    ],
  },
  {
    id: 'incident-06',
    order: 6,
    enemyId: 'courier',
    featuredMobbyId: 'potemoby',
    title: '再配達できない荷物',
    shortTitle: '再配達不可',
    synopsis: '一度で必ず届ける速水玲司の完璧な経路を、ぽてもびが自分ごとおやつ便へ変える。',
    unlockCopy: '速水 玲司が仲間になった',
    thumbnail: require('../../assets/enemies/courier.png') as ImageSourcePropType,
    panels: [
      panel('incident-06', 1, '一度きりの配送', '玲司は三つの箱を止めずに入れ替え、最短経路へ滑らせた。', [
        { speaker: '玲司', text: '荷は一度で届ける。再配達はない。' },
        { speaker: 'ぽてもび', text: 'じゃあ、おやつ売り場を経由して。' },
      ], '荷物を高速で仕分ける玲司に、ぽてもびがおやつ経由を頼んでいる', '配送室で箱を素早く仕分ける玲司。ぽてもびは寝転がったまま、ゆるい経由地の札を掲げる。', require('../../assets/incidents/comics/incident-06/panel-01.png') as ImageSourcePropType, 'generated'),
      panel('incident-06', 2, '新しい荷札', 'ぽてもびは宛先を「運び屋本人」に書き換え、自分も箱へ入った。', [
        { speaker: 'ぽてもび', text: '本人確認、現地ですれば早いよ。' },
        { speaker: '玲司', text: 'その荷は受けていない。降りろ。' },
      ], '自分宛ての荷札を見た玲司と、箱に収まるぽてもび', '玲司本人宛ての赤い荷札。開いた箱の中でぽてもびがクッションに横たわり、受領印を持つ。', require('../../assets/incidents/comics/incident-06/panel-02.png') as ImageSourcePropType, 'generated'),
      panel('incident-06', 3, '配達員を配達', '箱を開けると、ぽてもびが受領印を差し出した。', [
        { speaker: 'ぽてもび', text: '受取人も配達人もいる。ここにハンコ。' },
        { speaker: '玲司', text: '私が私を配送したことになる！' },
      ], '箱から受領印を出すぽてもびに、玲司が自分宛て荷物だと気づく', '箱から顔を出すぽてもびと大きな受領印。玲司は荷札と自分を交互に見て、初めて経路計算を止める。', require('../../assets/incidents/comics/incident-06/panel-03.png') as ImageSourcePropType, 'generated'),
      panel('incident-06', 4, '最速のクール便', 'そこへ揚げたてポテトのベルが鳴り、二人は同時に最短経路を走った。', [
        { speaker: 'ぽてもび', text: 'ポテトは冷める前に届ける！' },
        { speaker: '玲司', text: 'その速度だけは認めよう。' },
      ], '揚げたてポテトを届けるため、玲司とぽてもびが並んで走っている', 'ポテトの袋を守りながら並走する二人。普段は寝ているぽてもびが驚異的な速さで、玲司が真剣に評価する。', require('../../assets/incidents/comics/incident-06/panel-04.png') as ImageSourcePropType, 'generated'),
    ],
  },
  {
    id: 'incident-07',
    order: 7,
    enemyId: 'commander',
    featuredMobbyId: 'mobibou',
    title: '不可抗力だらけの最終作戦',
    shortTitle: '最終作戦',
    synopsis: '六人の技術を束ねる皇城統雅の完璧な計画を、モビ坊の小さな事故が順番に書き換える。',
    unlockCopy: '皇城 統雅が仲間になった',
    thumbnail: require('../../assets/enemies/commander.png') as ImageSourcePropType,
    panels: [
      panel('incident-07', 1, '偶然なき作戦', '統雅は六人の技術を秒単位で束ね、完璧な作戦図を完成させた。', [
        { speaker: '統雅', text: '偶然は排除した。勝利だけが残る。' },
        { speaker: 'モビ坊', text: 'すごい！ 紙の端、ジュースで濡れた。' },
      ], '完璧な作戦図を示す統雅の横で、モビ坊がジュースをこぼす', '荘厳な司令室。統雅が赤い作戦図を広げた瞬間、モビ坊の小さなコップが端へ倒れる。', require('../../assets/incidents/comics/incident-07/panel-01.png') as ImageSourcePropType, 'generated'),
      panel('incident-07', 2, '六つの不可抗力', '濡れた紙から、耳栓、消音靴、帽子、写真、荷札が次々に滑り落ちた。', [
        { speaker: '統雅', text: 'なぜ全事件の証拠品がここにある！' },
        { speaker: 'モビ坊', text: '片づけたら、たまたま一袋に。' },
      ], '過去六事件の品に埋もれる統雅と、悪びれないモビ坊', '耳栓、消音靴、シルクハット、記念写真、荷札が作戦盤へ雪崩れ込む。統雅は硬直し、モビ坊は胸を張る。', require('../../assets/incidents/comics/incident-07/panel-02.png') as ImageSourcePropType, 'generated'),
      panel('incident-07', 3, '計画だけを配送', '赤いボタンが押され、盗むはずの作戦書だけが全員の集合場所へ配送された。', [
        { speaker: 'モビ坊', text: '全員集合できた！ 作戦成功だね。' },
        { speaker: '統雅', text: 'これは親睦会ではない！' },
      ], '作戦書を囲んで黒星たちが集合し、モビ坊だけが成功を喜んでいる', '配送箱から作戦書が飛び出し、黒星七人が一堂に集まる。モビ坊は両手を上げ、統雅は額を押さえる。', require('../../assets/incidents/comics/incident-07/panel-03.png') as ImageSourcePropType, 'generated'),
      panel('incident-07', 4, '最終報告書', '作戦名は「だいたい成功」。理由欄には赤い印が七つ並んだ。', [
        { speaker: '統雅', text: '作戦変更。理由は……不可抗力。' },
        { speaker: 'モビ坊', text: '次は消せるペン貸すね！' },
      ], '不可抗力の印を押す統雅と、消せるペンを差し出すモビ坊', '経費表と証拠品に囲まれ、統雅が重々しく不可抗力印を押す。モビ坊は笑顔で消せるペンを差し出す。', require('../../assets/incidents/comics/incident-07/panel-04.png') as ImageSourcePropType, 'generated'),
    ],
  },
] as const satisfies readonly IncidentComic[];

export const INCIDENT_COMIC_BY_ID: Readonly<Record<IncidentComicId, IncidentComic>> = Object.fromEntries(
  INCIDENT_COMICS.map((incident) => [incident.id, incident]),
) as Record<IncidentComicId, IncidentComic>;

export const INCIDENT_COMIC_BY_ENEMY_ID: Readonly<Record<EnemyId, IncidentComic>> = Object.fromEntries(
  INCIDENT_COMICS.map((incident) => [incident.enemyId, incident]),
) as Record<EnemyId, IncidentComic>;

export const INCIDENT_COMIC_GENERATED_ASSET_MANIFEST = INCIDENT_COMICS.flatMap((incident) =>
  incident.panels.map((comicPanel) => ({
    incidentId: incident.id,
    enemyId: incident.enemyId,
    panelId: comicPanel.id,
    targetPath: comicPanel.generatedAssetPath,
    visualDirection: comicPanel.visualDirection,
    accessibilityLabel: comicPanel.accessibilityLabel,
  })),
);

export function getIncidentComic(id: IncidentComicId): IncidentComic {
  return INCIDENT_COMIC_BY_ID[id];
}

export function getIncidentComicForEnemy(enemyId: EnemyId): IncidentComic {
  return INCIDENT_COMIC_BY_ENEMY_ID[enemyId];
}

export function getBlackStarIdentity(enemyId: EnemyId): BlackStarIdentity {
  return BLACK_STAR_IDENTITIES[enemyId];
}
