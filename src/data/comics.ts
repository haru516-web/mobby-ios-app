import type { ImageSourcePropType } from 'react-native';

import type { MobbyId } from './mobies';

export type ComicVolumeId =
  | 'v01'
  | 'v02'
  | 'v03'
  | 'v04'
  | 'v05'
  | 'v05-hand'
  | 'v06'
  | 'v07'
  | 'v08'
  | 'v09'
  | 'v10';

export type ComicEntry = {
  id: string;
  volumeId: ComicVolumeId;
  characterId: MobbyId;
  title: string;
  image: ImageSourcePropType;
  thumbnail: ImageSourcePropType;
};

type ComicVolume = {
  id: ComicVolumeId;
  label: string;
  entries: readonly ComicEntry[];
};

export const COMIC_CHARACTER_ORDER = [
  'mobichi',
  'mobiyan',
  'yami',
  'mobibou',
  'mobirin',
  'mobiyura',
  'reomoby',
  'potemoby',
  'babumoby',
] as const satisfies readonly MobbyId[];

const COMIC_THUMBNAILS = {
  v01: {
    mobichi: require('../../assets/comics-thumbnails/v01/mobichi.webp'),
    mobiyan: require('../../assets/comics-thumbnails/v01/mobiyan.webp'),
    yami: require('../../assets/comics-thumbnails/v01/yami.webp'),
    mobibou: require('../../assets/comics-thumbnails/v01/mobibou.webp'),
    mobirin: require('../../assets/comics-thumbnails/v01/mobirin.webp'),
    mobiyura: require('../../assets/comics-thumbnails/v01/mobiyura.webp'),
    reomoby: require('../../assets/comics-thumbnails/v01/reomoby.webp'),
    potemoby: require('../../assets/comics-thumbnails/v01/potemoby.webp'),
    babumoby: require('../../assets/comics-thumbnails/v01/babumoby.webp'),
  },
  v02: {
    mobichi: require('../../assets/comics-thumbnails/v02/mobichi.webp'),
    mobiyan: require('../../assets/comics-thumbnails/v02/mobiyan.webp'),
    yami: require('../../assets/comics-thumbnails/v02/yami.webp'),
    mobibou: require('../../assets/comics-thumbnails/v02/mobibou.webp'),
    mobirin: require('../../assets/comics-thumbnails/v02/mobirin.webp'),
    mobiyura: require('../../assets/comics-thumbnails/v02/mobiyura.webp'),
    reomoby: require('../../assets/comics-thumbnails/v02/reomoby.webp'),
    potemoby: require('../../assets/comics-thumbnails/v02/potemoby.webp'),
    babumoby: require('../../assets/comics-thumbnails/v02/babumoby.webp'),
  },
  v03: {
    mobichi: require('../../assets/comics-thumbnails/v03/mobichi.webp'),
    mobiyan: require('../../assets/comics-thumbnails/v03/mobiyan.webp'),
    yami: require('../../assets/comics-thumbnails/v03/yami.webp'),
    mobibou: require('../../assets/comics-thumbnails/v03/mobibou.webp'),
    mobirin: require('../../assets/comics-thumbnails/v03/mobirin.webp'),
    mobiyura: require('../../assets/comics-thumbnails/v03/mobiyura.webp'),
    reomoby: require('../../assets/comics-thumbnails/v03/reomoby.webp'),
    potemoby: require('../../assets/comics-thumbnails/v03/potemoby.webp'),
    babumoby: require('../../assets/comics-thumbnails/v03/babumoby.webp'),
  },
  v04: {
    mobichi: require('../../assets/comics-thumbnails/v04/mobichi.webp'),
    mobiyan: require('../../assets/comics-thumbnails/v04/mobiyan.webp'),
    yami: require('../../assets/comics-thumbnails/v04/yami.webp'),
    mobibou: require('../../assets/comics-thumbnails/v04/mobibou.webp'),
    mobirin: require('../../assets/comics-thumbnails/v04/mobirin.webp'),
    mobiyura: require('../../assets/comics-thumbnails/v04/mobiyura.webp'),
    reomoby: require('../../assets/comics-thumbnails/v04/reomoby.webp'),
    potemoby: require('../../assets/comics-thumbnails/v04/potemoby.webp'),
    babumoby: require('../../assets/comics-thumbnails/v04/babumoby.webp'),
  },
  v05: {
    mobichi: require('../../assets/comics-thumbnails/v05/mobichi.webp'),
    mobiyan: require('../../assets/comics-thumbnails/v05/mobiyan.webp'),
    yami: require('../../assets/comics-thumbnails/v05/yami.webp'),
    mobibou: require('../../assets/comics-thumbnails/v05/mobibou.webp'),
    mobirin: require('../../assets/comics-thumbnails/v05/mobirin.webp'),
    mobiyura: require('../../assets/comics-thumbnails/v05/mobiyura.webp'),
    reomoby: require('../../assets/comics-thumbnails/v05/reomoby.webp'),
    potemoby: require('../../assets/comics-thumbnails/v05/potemoby.webp'),
    babumoby: require('../../assets/comics-thumbnails/v05/babumoby.webp'),
  },
  'v05-hand': {
    mobichi: require('../../assets/comics-thumbnails/v05-hand/mobichi.webp'),
    mobiyan: require('../../assets/comics-thumbnails/v05-hand/mobiyan.webp'),
    yami: require('../../assets/comics-thumbnails/v05-hand/yami.webp'),
    mobibou: require('../../assets/comics-thumbnails/v05-hand/mobibou.webp'),
    mobirin: require('../../assets/comics-thumbnails/v05-hand/mobirin.webp'),
    mobiyura: require('../../assets/comics-thumbnails/v05-hand/mobiyura.webp'),
    reomoby: require('../../assets/comics-thumbnails/v05-hand/reomoby.webp'),
    potemoby: require('../../assets/comics-thumbnails/v05-hand/potemoby.webp'),
    babumoby: require('../../assets/comics-thumbnails/v05-hand/babumoby.webp'),
  },
  v06: {
    mobichi: require('../../assets/comics-thumbnails/v06/mobichi.webp'),
    mobiyan: require('../../assets/comics-thumbnails/v06/mobiyan.webp'),
    yami: require('../../assets/comics-thumbnails/v06/yami.webp'),
    mobibou: require('../../assets/comics-thumbnails/v06/mobibou.webp'),
    mobirin: require('../../assets/comics-thumbnails/v06/mobirin.webp'),
    mobiyura: require('../../assets/comics-thumbnails/v06/mobiyura.webp'),
    reomoby: require('../../assets/comics-thumbnails/v06/reomoby.webp'),
    potemoby: require('../../assets/comics-thumbnails/v06/potemoby.webp'),
    babumoby: require('../../assets/comics-thumbnails/v06/babumoby.webp'),
  },
  v07: {
    mobichi: require('../../assets/comics-thumbnails/v07/mobichi.webp'),
    mobiyan: require('../../assets/comics-thumbnails/v07/mobiyan.webp'),
    yami: require('../../assets/comics-thumbnails/v07/yami.webp'),
    mobibou: require('../../assets/comics-thumbnails/v07/mobibou.webp'),
    mobirin: require('../../assets/comics-thumbnails/v07/mobirin.webp'),
    mobiyura: require('../../assets/comics-thumbnails/v07/mobiyura.webp'),
    reomoby: require('../../assets/comics-thumbnails/v07/reomoby.webp'),
    potemoby: require('../../assets/comics-thumbnails/v07/potemoby.webp'),
    babumoby: require('../../assets/comics-thumbnails/v07/babumoby.webp'),
  },
  v08: {
    mobichi: require('../../assets/comics-thumbnails/v08/mobichi.webp'),
    mobiyan: require('../../assets/comics-thumbnails/v08/mobiyan.webp'),
    yami: require('../../assets/comics-thumbnails/v08/yami.webp'),
    mobibou: require('../../assets/comics-thumbnails/v08/mobibou.webp'),
    mobirin: require('../../assets/comics-thumbnails/v08/mobirin.webp'),
    mobiyura: require('../../assets/comics-thumbnails/v08/mobiyura.webp'),
    reomoby: require('../../assets/comics-thumbnails/v08/reomoby.webp'),
    potemoby: require('../../assets/comics-thumbnails/v08/potemoby.webp'),
    babumoby: require('../../assets/comics-thumbnails/v08/babumoby.webp'),
  },
  v09: {
    mobichi: require('../../assets/comics-thumbnails/v09/mobichi.webp'),
    mobiyan: require('../../assets/comics-thumbnails/v09/mobiyan.webp'),
    yami: require('../../assets/comics-thumbnails/v09/yami.webp'),
    mobibou: require('../../assets/comics-thumbnails/v09/mobibou.webp'),
    mobirin: require('../../assets/comics-thumbnails/v09/mobirin.webp'),
    mobiyura: require('../../assets/comics-thumbnails/v09/mobiyura.webp'),
    reomoby: require('../../assets/comics-thumbnails/v09/reomoby.webp'),
    potemoby: require('../../assets/comics-thumbnails/v09/potemoby.webp'),
    babumoby: require('../../assets/comics-thumbnails/v09/babumoby.webp'),
  },
  v10: {
    mobichi: require('../../assets/comics-thumbnails/v10/mobichi.webp'),
    mobiyan: require('../../assets/comics-thumbnails/v10/mobiyan.webp'),
    yami: require('../../assets/comics-thumbnails/v10/yami.webp'),
    mobibou: require('../../assets/comics-thumbnails/v10/mobibou.webp'),
    mobirin: require('../../assets/comics-thumbnails/v10/mobirin.webp'),
    mobiyura: require('../../assets/comics-thumbnails/v10/mobiyura.webp'),
    reomoby: require('../../assets/comics-thumbnails/v10/reomoby.webp'),
    potemoby: require('../../assets/comics-thumbnails/v10/potemoby.webp'),
    babumoby: require('../../assets/comics-thumbnails/v10/babumoby.webp'),
  },
} as const satisfies Record<ComicVolumeId, Record<MobbyId, ImageSourcePropType>>;

const comic = (
  volumeId: ComicVolumeId,
  characterId: MobbyId,
  title: string,
  image: ImageSourcePropType,
): ComicEntry => ({
  id: `${volumeId}-${characterId}`,
  volumeId,
  characterId,
  title,
  image,
  thumbnail: COMIC_THUMBNAILS[volumeId][characterId],
});

export const COMIC_VOLUMES = [
  {
    id: 'v01',
    label: '第1弾',
    entries: [
      comic('v01', 'mobirin', '真実のプリン', require('../../assets/comics/v01/mobirin.webp')),
      comic('v01', 'mobichi', '断捨離', require('../../assets/comics/v01/mobichi.webp')),
      comic('v01', 'yami', 'ひとりにして', require('../../assets/comics/v01/yami.webp')),
      comic('v01', 'mobiyan', 'キャラ弁', require('../../assets/comics/v01/mobiyan.webp')),
      comic('v01', 'mobiyura', '闇の晩餐', require('../../assets/comics/v01/mobiyura.webp')),
      comic('v01', 'reomoby', '王子のゴミ出し', require('../../assets/comics/v01/reomoby.webp')),
      comic('v01', 'potemoby', 'リモコン救出', require('../../assets/comics/v01/potemoby.webp')),
      comic('v01', 'mobibou', '初めての言葉', require('../../assets/comics/v01/mobibou.webp')),
      comic('v01', 'babumoby', '寝かしつけ', require('../../assets/comics/v01/babumoby.webp')),
    ],
  },
  {
    id: 'v02',
    label: '第2弾',
    entries: [
      comic('v02', 'mobirin', '傘の哲学', require('../../assets/comics/v02/mobirin.webp')),
      comic('v02', 'mobichi', '自然な写真', require('../../assets/comics/v02/mobichi.webp')),
      comic('v02', 'yami', 'お風呂に嫉妬', require('../../assets/comics/v02/yami.webp')),
      comic('v02', 'mobiyan', '自動ドアとの対決', require('../../assets/comics/v02/mobiyan.webp')),
      comic('v02', 'mobiyura', '魔力切れ', require('../../assets/comics/v02/mobiyura.webp')),
      comic('v02', 'reomoby', '褒められる側', require('../../assets/comics/v02/reomoby.webp')),
      comic('v02', 'potemoby', '一歩だけ散歩', require('../../assets/comics/v02/potemoby.webp')),
      comic('v02', 'mobibou', 'びっくり箱', require('../../assets/comics/v02/mobibou.webp')),
      comic('v02', 'babumoby', '最強の目覚まし', require('../../assets/comics/v02/babumoby.webp')),
    ],
  },
  {
    id: 'v03',
    label: '第3弾',
    entries: [
      comic('v03', 'mobirin', '帽子の名推理', require('../../assets/comics/v03/mobirin.webp')),
      comic('v03', 'mobichi', '節約術', require('../../assets/comics/v03/mobichi.webp')),
      comic('v03', 'yami', '毎日つけて', require('../../assets/comics/v03/yami.webp')),
      comic('v03', 'mobiyan', '子猫の救出', require('../../assets/comics/v03/mobiyan.webp')),
      comic('v03', 'mobiyura', '闇の代引き', require('../../assets/comics/v03/mobiyura.webp')),
      comic('v03', 'reomoby', '白馬の代わり', require('../../assets/comics/v03/reomoby.webp')),
      comic('v03', 'potemoby', '掃除当番', require('../../assets/comics/v03/potemoby.webp')),
      comic('v03', 'mobibou', '宿題完了', require('../../assets/comics/v03/mobibou.webp')),
      comic('v03', 'babumoby', '褒められ放題', require('../../assets/comics/v03/babumoby.webp')),
    ],
  },
  {
    id: 'v04',
    label: '第4弾',
    entries: [
      comic('v04', 'mobirin', '賢者の答え', require('../../assets/comics/v04/mobirin.webp')),
      comic('v04', 'mobichi', '朝活', require('../../assets/comics/v04/mobichi.webp')),
      comic('v04', 'yami', 'おそろい', require('../../assets/comics/v04/yami.webp')),
      comic('v04', 'mobiyan', '歯医者', require('../../assets/comics/v04/mobiyan.webp')),
      comic('v04', 'mobiyura', '禁断の召喚', require('../../assets/comics/v04/mobiyura.webp')),
      comic('v04', 'reomoby', 'ジャムの蓋', require('../../assets/comics/v04/reomoby.webp')),
      comic('v04', 'potemoby', '室内キャンプ', require('../../assets/comics/v04/potemoby.webp')),
      comic('v04', 'mobibou', '10分勉強', require('../../assets/comics/v04/mobibou.webp')),
      comic('v04', 'babumoby', 'ばぶ算', require('../../assets/comics/v04/babumoby.webp')),
    ],
  },
  {
    id: 'v05',
    label: '第5弾',
    entries: [
      comic('v05', 'mobirin', '哲学と焼きいも', require('../../assets/comics/v05/mobirin.webp')),
      comic('v05', 'mobichi', '寄り道で目的忘れ', require('../../assets/comics/v05/mobichi.webp')),
      comic('v05', 'yami', '無言の寄り添い', require('../../assets/comics/v05/yami.webp')),
      comic('v05', 'mobiyan', '最初の一歩は水たまり', require('../../assets/comics/v05/mobiyan.webp')),
      comic('v05', 'mobiyura', '魔眼はただの眠気', require('../../assets/comics/v05/mobiyura.webp')),
      comic('v05', 'reomoby', '王子様が照れた日', require('../../assets/comics/v05/reomoby.webp')),
      comic('v05', 'potemoby', '今日は休む日', require('../../assets/comics/v05/potemoby.webp')),
      comic('v05', 'mobibou', '飾りを動かした犯人', require('../../assets/comics/v05/mobibou.webp')),
      comic('v05', 'babumoby', 'まんまの前に寝た', require('../../assets/comics/v05/babumoby.webp')),
    ],
  },
  {
    id: 'v05-hand',
    label: '第5弾 手書き風',
    entries: [
      comic('v05-hand', 'mobirin', 'メガネ捜索', require('../../assets/comics/v05-hand/mobirin.webp')),
      comic('v05-hand', 'mobichi', '半額シール', require('../../assets/comics/v05-hand/mobichi.webp')),
      comic('v05-hand', 'yami', '席替え', require('../../assets/comics/v05-hand/yami.webp')),
      comic('v05-hand', 'mobiyan', '優先席', require('../../assets/comics/v05-hand/mobiyan.webp')),
      comic('v05-hand', 'mobiyura', '自画像', require('../../assets/comics/v05-hand/mobiyura.webp')),
      comic('v05-hand', 'reomoby', '庶民の味', require('../../assets/comics/v05-hand/reomoby.webp')),
      comic('v05-hand', 'potemoby', '歩数計', require('../../assets/comics/v05-hand/potemoby.webp')),
      comic('v05-hand', 'mobibou', 'お片づけ', require('../../assets/comics/v05-hand/mobibou.webp')),
      comic('v05-hand', 'babumoby', 'はじめてのおつかい', require('../../assets/comics/v05-hand/babumoby.webp')),
    ],
  },
  {
    id: 'v06',
    label: '第6弾',
    entries: [
      comic('v06', 'mobirin', 'WiFiの真実', require('../../assets/comics/v06/mobirin.webp')),
      comic('v06', 'mobichi', '充電1パーセント', require('../../assets/comics/v06/mobichi.webp')),
      comic('v06', 'yami', '集合写真', require('../../assets/comics/v06/yami.webp')),
      comic('v06', 'mobiyan', '赤信号', require('../../assets/comics/v06/mobiyan.webp')),
      comic('v06', 'mobiyura', 'カフェの名前', require('../../assets/comics/v06/mobiyura.webp')),
      comic('v06', 'reomoby', 'セルフレジの姫', require('../../assets/comics/v06/reomoby.webp')),
      comic('v06', 'potemoby', 'かくれんぼ', require('../../assets/comics/v06/potemoby.webp')),
      comic('v06', 'mobibou', '落とし穴', require('../../assets/comics/v06/mobibou.webp')),
      comic('v06', 'babumoby', '消灯', require('../../assets/comics/v06/babumoby.webp')),
    ],
  },
  {
    id: 'v07',
    label: '第7弾',
    entries: [
      comic('v07', 'mobirin', '説明書の本質', require('../../assets/comics/v07/mobirin.webp')),
      comic('v07', 'mobichi', '映えランチ', require('../../assets/comics/v07/mobichi.webp')),
      comic('v07', 'yami', '重い看病', require('../../assets/comics/v07/yami.webp')),
      comic('v07', 'mobiyan', '弱火', require('../../assets/comics/v07/mobiyan.webp')),
      comic('v07', 'mobiyura', '闇の音声操作', require('../../assets/comics/v07/mobiyura.webp')),
      comic('v07', 'reomoby', '王子のサイン', require('../../assets/comics/v07/reomoby.webp')),
      comic('v07', 'potemoby', '映画選び', require('../../assets/comics/v07/potemoby.webp')),
      comic('v07', 'mobibou', '後出しルール', require('../../assets/comics/v07/mobibou.webp')),
      comic('v07', 'babumoby', '空き箱', require('../../assets/comics/v07/babumoby.webp')),
    ],
  },
  {
    id: 'v08',
    label: '第8弾',
    entries: [
      comic('v08', 'mobirin', 'コーヒーの啓示', require('../../assets/comics/v08/mobirin.webp')),
      comic('v08', 'mobichi', '限定カラー', require('../../assets/comics/v08/mobichi.webp')),
      comic('v08', 'yami', '忘れ物', require('../../assets/comics/v08/yami.webp')),
      comic('v08', 'mobiyan', 'マイク不要', require('../../assets/comics/v08/mobiyan.webp')),
      comic('v08', 'mobiyura', '暗証番号', require('../../assets/comics/v08/mobiyura.webp')),
      comic('v08', 'reomoby', '雨の日エスコート', require('../../assets/comics/v08/reomoby.webp')),
      comic('v08', 'potemoby', 'マイクON', require('../../assets/comics/v08/potemoby.webp')),
      comic('v08', 'mobibou', '誕生日の願い', require('../../assets/comics/v08/mobibou.webp')),
      comic('v08', 'babumoby', 'しゃっくり', require('../../assets/comics/v08/babumoby.webp')),
    ],
  },
  {
    id: 'v09',
    label: '第9弾',
    entries: [
      comic('v09', 'mobirin', '近道の哲学', require('../../assets/comics/v09/mobirin.webp')),
      comic('v09', 'mobichi', '待ち合わせ', require('../../assets/comics/v09/mobichi.webp')),
      comic('v09', 'yami', '合鍵', require('../../assets/comics/v09/yami.webp')),
      comic('v09', 'mobiyan', '迷子センター', require('../../assets/comics/v09/mobiyan.webp')),
      comic('v09', 'mobiyura', '星座占い', require('../../assets/comics/v09/mobiyura.webp')),
      comic('v09', 'reomoby', '靴ひも', require('../../assets/comics/v09/reomoby.webp')),
      comic('v09', 'potemoby', '宅配便', require('../../assets/comics/v09/potemoby.webp')),
      comic('v09', 'mobibou', '宝探し', require('../../assets/comics/v09/mobibou.webp')),
      comic('v09', 'babumoby', 'おくすり', require('../../assets/comics/v09/babumoby.webp')),
    ],
  },
  {
    id: 'v10',
    label: '第10弾',
    entries: [
      comic('v10', 'mobirin', 'エレベーター', require('../../assets/comics/v10/mobirin.webp')),
      comic('v10', 'mobichi', '試着室', require('../../assets/comics/v10/mobichi.webp')),
      comic('v10', 'yami', '位置情報', require('../../assets/comics/v10/yami.webp')),
      comic('v10', 'mobiyan', '図書館の静寂', require('../../assets/comics/v10/mobiyan.webp')),
      comic('v10', 'mobiyura', '停電の儀式', require('../../assets/comics/v10/mobiyura.webp')),
      comic('v10', 'reomoby', '置き配', require('../../assets/comics/v10/reomoby.webp')),
      comic('v10', 'potemoby', '布団干し', require('../../assets/comics/v10/potemoby.webp')),
      comic('v10', 'mobibou', '静電気', require('../../assets/comics/v10/mobibou.webp')),
      comic('v10', 'babumoby', '呼び鈴', require('../../assets/comics/v10/babumoby.webp')),
    ],
  },
] as const satisfies readonly ComicVolume[];

export function getComicsForCharacter(characterId: MobbyId): ComicEntry[] {
  return COMIC_VOLUMES.flatMap((volume) =>
    volume.entries.filter((entry) => entry.characterId === characterId),
  );
}
