import type { ImageSourcePropType } from 'react-native';

import { CHARACTER_FURNITURE_ASSETS } from './characterFurnitureAssets';
import type { MobbyId } from './mobies';

export type FurnitureAssetId = string;

export type FurnitureAsset = {
  id: FurnitureAssetId;
  label: string;
  caption: string;
  source: ImageSourcePropType;
  emoji: string;
  characterId?: MobbyId;
  /** Position and size are percentages of the room viewport. */
  placement: {
    left: `${number}%`;
    bottom: `${number}%`;
    width: `${number}%`;
    zIndex: number;
  };
};

export const ROOM_ASSETS = {
  sunnyStitch: require('../../assets/rooms/sunny-stitch-room.png'),
} as const;

export const FURNITURE_ASSETS: FurnitureAsset[] = [
  {
    id: 'ソファ',
    label: 'ソファ',
    caption: 'くつろぐ',
    source: require('../../assets/furniture/user-sofa-blue.png'),
    emoji: '🛋️',
    placement: { left: '55%', bottom: '18%', width: '42%', zIndex: 3 },
  },
  {
    id: 'クッション',
    label: 'クッション',
    caption: '埋もれる',
    source: require('../../assets/furniture/cushion-pile.png'),
    emoji: '🧸',
    placement: { left: '8%', bottom: '13%', width: '30%', zIndex: 3 },
  },
  {
    id: '植物',
    label: '植物',
    caption: '水やりする',
    source: require('../../assets/furniture/user-plant.png'),
    emoji: '🌿',
    placement: { left: '4%', bottom: '32%', width: '23%', zIndex: 2 },
  },
  {
    id: 'テレビ',
    label: 'テレビ',
    caption: '一緒に見る',
    source: require('../../assets/furniture/television.png'),
    emoji: '📺',
    placement: { left: '69%', bottom: '31%', width: '28%', zIndex: 2 },
  },
  {
    id: '小さな机',
    label: '小さな机',
    caption: '作業する',
    source: require('../../assets/furniture/user-coffee-table.png'),
    emoji: '🪵',
    placement: { left: '35%', bottom: '10%', width: '34%', zIndex: 4 },
  },
  {
    id: '本棚',
    label: '本棚',
    caption: '絵本を読む',
    source: require('../../assets/furniture/user-bookshelf.png'),
    emoji: '📚',
    placement: { left: '71%', bottom: '45%', width: '22%', zIndex: 1 },
  },
  {
    id: 'フロアランプ',
    label: 'フロアランプ',
    caption: '灯りをつける',
    source: require('../../assets/furniture/user-floor-lamp.png'),
    emoji: '💡',
    placement: { left: '78%', bottom: '13%', width: '18%', zIndex: 4 },
  },
  {
    id: 'ベッド',
    label: 'ベッド',
    caption: 'お昼寝する',
    source: require('../../assets/furniture/user-bed-blue.png'),
    emoji: '🛏️',
    placement: { left: '44%', bottom: '10%', width: '45%', zIndex: 3 },
  },
  {
    id: 'キャビネット',
    label: 'キャビネット',
    caption: '大切なものをしまう',
    source: require('../../assets/furniture/user-cabinet-olive.png'),
    emoji: '🗄️',
    placement: { left: '3%', bottom: '15%', width: '32%', zIndex: 3 },
  },
  {
    id: 'ラグ',
    label: 'ラグ',
    caption: 'ごろごろする',
    source: require('../../assets/furniture/user-rug-round.png'),
    emoji: '🟤',
    placement: { left: '18%', bottom: '7%', width: '47%', zIndex: 2 },
  },
  {
    id: 'マグカップ',
    label: 'マグカップ',
    caption: 'ひとやすみする',
    source: require('../../assets/furniture/user-mug-blue.png'),
    emoji: '☕',
    placement: { left: '52%', bottom: '24%', width: '14%', zIndex: 5 },
  },
  {
    id: '本の山',
    label: '本の山',
    caption: '読書する',
    source: require('../../assets/furniture/user-books-stack.png'),
    emoji: '📖',
    placement: { left: '38%', bottom: '26%', width: '21%', zIndex: 5 },
  },
  {
    id: '箱',
    label: '箱',
    caption: '秘密をしまう',
    source: require('../../assets/furniture/user-box-closed.png'),
    emoji: '📦',
    placement: { left: '72%', bottom: '9%', width: '22%', zIndex: 4 },
  },
  {
    id: '開いた箱',
    label: '開いた箱',
    caption: '中をのぞく',
    source: require('../../assets/furniture/user-box-open.png'),
    emoji: '🗃️',
    placement: { left: '73%', bottom: '17%', width: '24%', zIndex: 3 },
  },
  ...CHARACTER_FURNITURE_ASSETS,
];

export const getFurnitureAsset = (id: FurnitureAssetId) => FURNITURE_ASSETS.find((asset) => asset.id === id) ?? FURNITURE_ASSETS[0];
