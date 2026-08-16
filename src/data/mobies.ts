import type { ImageSourcePropType } from 'react-native';

export type MobbyId =
  | 'mobirin'
  | 'mobichi'
  | 'yami'
  | 'mobiyan'
  | 'mobiyura'
  | 'reomoby'
  | 'potemoby'
  | 'mobibou'
  | 'babumoby';

export type InteractionKind = 'tease' | 'care' | 'gift';

export type Mobby = {
  id: MobbyId;
  name: string;
  catchphrase: string;
  role: string;
  color: string;
  accent: string;
  image: ImageSourcePropType;
  joyImage: ImageSourcePropType;
  tags: string[];
  lines: Record<InteractionKind, string[]>;
};

export const MOBBIES: Mobby[] = [
  {
    id: 'mobirin',
    name: 'もびりん',
    catchphrase: '知的なおじ',
    role: '静かに本質を見つめる案内役',
    color: '#4C6172',
    accent: '#DCEAF0',
    image: require('../../assets/mobies/mobirin.webp'),
    joyImage: require('../../assets/mobies/joy/mobirin-joy.png'),
    tags: ['思索', '静けさ', '哀愁'],
    lines: {
      tease: ['……ほう。そこをつつくとは、なかなか深いですな。', '真実を急かしてはいけませんぞ。', '伸びたほっぺにも、人生の年輪が出ますな。', '急がず離してくだされ。ほっぺも熟考中ですぞ。', 'なるほど。この弾力……今日の学びにしましょう。'],
      care: ['そばにいてくれる。それだけで、今日は十分ですぞ。', '静かな時間も、思い出になりますな。'],
      gift: ['これは素敵ですな。大切なものは説明されないものの中にありますぞ。', '贈り物には、贈った人の時間が宿りますな。'],
    },
  },
  {
    id: 'mobichi',
    name: 'もびち',
    catchphrase: '気ままギャル♡',
    role: '好きなものへ寄り道する直感派',
    color: '#E36C91',
    accent: '#FFE1EA',
    image: require('../../assets/mobies/mobichi.webp'),
    joyImage: require('../../assets/mobies/joy/mobichi-joy.png'),
    tags: ['直感', '自由', '肯定'],
    lines: {
      tease: ['えっ、今つついた？ もっかいやって〜♡', 'ちょっかいも楽しいならアリじゃん？', '待って、この角度めっちゃ盛れてる〜♡', 'ほっぺ伸びても、かわいさは伸びしろしかないし！', 'それ新しいあいさつ？ うち的にはアリ〜！'],
      care: ['いっしょに見よっ！ 今日の空、めっちゃかわいくない？', 'ここにいるだけで楽しいって、最高じゃん♡'],
      gift: ['え、これうちに？ かわいすぎ！ 大事にする〜♡', 'スキなものがまた増えた！ 今日は記念日ね♡'],
    },
  },
  {
    id: 'yami',
    name: '病みモビー',
    catchphrase: 'メンヘラちゃん',
    role: '不安を抱えながら、そばにいたい子',
    color: '#7B6A92',
    accent: '#E9E0F4',
    image: require('../../assets/mobies/yami-mobby.webp'),
    joyImage: require('../../assets/mobies/joy/yami-joy.png'),
    tags: ['不安', '安心', '寄り添い'],
    lines: {
      tease: ['……びっくりした。もう少しだけ、ここにいて？', '嫌じゃないけど、急にいなくならないでね。', 'ほっぺを離しても……私のことは離さないでね。', '伸びたぶんだけ、そばに近づけた気がする……。', 'これって構ってくれてるってことで、合ってる？'],
      care: ['そばにいるね。今日はひとりじゃないよ。', '見ててくれるなら、もう少しだけ頑張れるかも。'],
      gift: ['これ、私がもらっていいの？ ……大事にするね。', '必要としてくれたのかな。うれしい……。'],
    },
  },
  {
    id: 'mobiyan',
    name: 'もびやん',
    catchphrase: 'まっすぐなヤンキー',
    role: '信念を曲げず、まず動く兄貴分',
    color: '#2F6274',
    accent: '#D8EFF4',
    image: require('../../assets/mobies/mobiyan.webp'),
    joyImage: require('../../assets/mobies/joy/mobiyan-joy.png'),
    tags: ['信念', '挑戦', '行動力'],
    lines: {
      tease: ['おう、やるやん！ そのくらいの勢いで来いや！', '邪魔された？ なら、ここからが勝負や！', 'ほっぺは曲がっても、信念は曲がらへんで！', 'ええ引きや！ 次は綱引きで勝負せえへん？', '離すときまでが引っ張りや。覚えとき！'],
      care: ['無理せんでええ。休むんも、立派な前進や。', '来てくれたんやな。ほな、今日も始めよか！'],
      gift: ['ありがとな！ これは仲間の証や！', 'もろたからには、ちゃんと使い切るで！'],
    },
  },
  {
    id: 'mobiyura',
    name: 'もびゆら',
    catchphrase: '痛いほど本気な堕天王',
    role: '闇の設定を信じる、孤高の自称王',
    color: '#4D3B68',
    accent: '#E8D9FF',
    image: require('../../assets/mobies/mobiyura.webp'),
    joyImage: require('../../assets/mobies/joy/mobiyura-joy.png'),
    tags: ['堕天', '魔眼', '王'],
    lines: {
      tease: ['我が魔眼をつつくとは……貴様、見どころがあるな。', '闇の力が疼く。これは事件の予兆だ。', '禁断のほっぺを解放したな……責任は取れ。', '伸びよ、漆黒の頬！ ……そこ、笑うでない。', 'この弾力こそ、失われし王家の秘宝だ。'],
      care: ['臣下よ、ここへ。……いや、別に寂しいわけではない。', '我が王国の静寂を分かち合うがよい。'],
      gift: ['これは王への献上品か。特別に受け取ってやろう。', '……よい品だ。失われた王国の記憶を感じる。'],
    },
  },
  {
    id: 'reomoby',
    name: 'れおもび',
    catchphrase: 'お姫様専属の王子様',
    role: '誰かを特別扱いして笑顔にする王子',
    color: '#93445E',
    accent: '#FFE3DC',
    image: require('../../assets/mobies/reomoby.webp'),
    joyImage: require('../../assets/mobies/joy/reomoby-joy.png'),
    tags: ['王子様', 'ときめき', '演出'],
    lines: {
      tease: ['ふふ、そんなに僕に触れたいの？ 今夜は君だけのものさ。', 'その悪戯も、僕へのファンサービスかな？', 'ほっぺが伸びても、君との距離は縮まったね。', 'おっと、王子の顔はやさしく扱ってくれるかな？', 'その手を離す前に、次の約束をしてくれる？'],
      care: ['おかえり。今日もいちばん素敵な時間を君に贈るよ。', 'ここでは誰もが主役。もちろん、君もね。'],
      gift: ['僕のために？ これはもう、運命のプレゼントだね。', 'ありがとう。君の気持ちは、誰よりも大切にするよ。'],
    },
  },
  {
    id: 'potemoby',
    name: 'ぽてもび',
    catchphrase: '休むことに全力なニート',
    role: '無理をさせず、安心をくれる同居人',
    color: '#9A724C',
    accent: '#FFF0D9',
    image: require('../../assets/mobies/potemoby.webp'),
    joyImage: require('../../assets/mobies/joy/potemoby-joy.png'),
    tags: ['休息', '安心', 'だらだら'],
    lines: {
      tease: ['んー……あと五分だけ。つつくのは寝ながらでもできるよ。', '起こした？ じゃあ一緒に二度寝しよ。', 'ほっぺだけ先に起きた……ぼくはまだ寝るね。', '伸ばしたぶん、枕まで運んでくれる？', 'その運動、見てるだけで疲れた〜。休憩しよ。'],
      care: ['ここ、落ち着くね。何もしないって最高だよ。', '今日もよく来たね。まずは深呼吸しよ〜。'],
      gift: ['おやつ？ それは大事な生活必需品だね。', 'ありがとう。半分こ……は、あとで考えるね。'],
    },
  },
  {
    id: 'mobibou',
    name: 'モビ坊',
    catchphrase: '調子のいい悪ガキ',
    role: 'いたずらで毎日に事件を起こすトラブルメーカー',
    color: '#C86A35',
    accent: '#FFE6C5',
    image: require('../../assets/mobies/mobibou.webp'),
    joyImage: require('../../assets/mobies/joy/mobibou-joy.png'),
    tags: ['いたずら', '反応', '悪ガキ'],
    lines: {
      tease: ['えー、モビ坊じゃないし！ ……もう一回なら許すけど。', '先に触ったのそっちじゃん！ 仕返しね！', '伸びたほっぺで、次のいたずら届きそう！', '今の記録したからな！ ほっぺ裁判で使う！', 'もっと引けるって！ ……あ、やっぱちょっと待って！'],
      care: ['べ、別に待ってたわけじゃないし。……ちょっとだけ遊ぶ？', '今日はいたずら少なめ。たぶんね！'],
      gift: ['証拠品？ ちがうし、プレゼントならもらうけど！', '……ありがと。なくしたら怒るからな！'],
    },
  },
  {
    id: 'babumoby',
    name: 'ばぶもび',
    catchphrase: 'みんなを動かす赤ちゃん',
    role: '眠い・甘えたいを全力で伝える小さな王様',
    color: '#D58A9B',
    accent: '#FFF0F3',
    image: require('../../assets/mobies/babumoby.webp'),
    joyImage: require('../../assets/mobies/joy/babumoby-joy.png'),
    tags: ['ばぶ', '眠気', '甘え'],
    lines: {
      tease: ['ばぶぅ……びっくり……だっこ……？', 'やー！ ……でも、もういっかい。', 'ほっぺ、びよーん……ばぶも、びよーん！', 'はなしたら、だっこでなおして……。', 'ばぶのほっぺ、もちもち……たべちゃだめ！'],
      care: ['だっこ……ねんね……そばにいて。', 'ばぶ……きょうも、きた……。'],
      gift: ['ばぶ！ これ、すき！ ぎゅー！', 'まんま……？ ありがと……すや……。'],
    },
  },
];

export const getMobby = (id: MobbyId) => MOBBIES.find((mobby) => mobby.id === id) ?? MOBBIES[1];
