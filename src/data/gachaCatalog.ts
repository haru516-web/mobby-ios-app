import type { ImageSourcePropType } from 'react-native';

import { ENEMIES, type EnemyId } from '@/data/enemies';
import { MOBBIES, type MobbyId } from '@/data/mobies';

import { getGeneratedGachaThemeAssets } from './gachaThemeAssets.generated';

export const GACHA_STYLE_NUMBERS = [1, 2, 3, 4, 5] as const;
export const GACHA_GOODS_VARIANTS = ['key-normal', 'key-small', 'plush'] as const;
export const GACHA_TOOL_KINDS = ['poke', 'weight'] as const;

export type GachaStyleNumber = (typeof GACHA_STYLE_NUMBERS)[number];
export type GachaGoodsVariant = (typeof GACHA_GOODS_VARIANTS)[number];
export type GachaToolKind = (typeof GACHA_TOOL_KINDS)[number];
export type GachaCharacterId = MobbyId | EnemyId;
export type GachaRewardCategory = 'tool' | 'goods' | 'theme';
export type GachaRarity = 'R' | 'SR' | 'SSR';

export type GachaToolRewardId = `tool:${GachaToolKind}:${GachaStyleNumber}`;
export type GachaGoodsRewardId = `goods:${GachaCharacterId}:${GachaGoodsVariant}`;
export type GachaThemeRewardId = `theme:${GachaCharacterId}:${GachaStyleNumber}`;
export type GachaStackableRewardId = GachaToolRewardId | GachaGoodsRewardId;
export type GachaRewardId = GachaStackableRewardId | GachaThemeRewardId;

export type GachaThemeAssetSlot =
  | 'appBackground'
  | 'buttonPrimary'
  | 'buttonSecondary'
  | 'card'
  | 'navigation'
  | 'popup';

export type GachaThemeAssetReference = {
  /** Stable key for replacing the temporary source with generated artwork. */
  assetKey: string;
  /** Existing artwork used until the character-specific asset is generated. */
  fallbackSource: ImageSourcePropType;
  /** Final character/style-specific bitmap. Omitted only while an asset batch is being authored. */
  source?: ImageSourcePropType;
};

export type GachaThemeAssetGroup = Record<GachaThemeAssetSlot, GachaThemeAssetReference>;

type GachaRewardBase = {
  id: GachaRewardId;
  category: GachaRewardCategory;
  name: string;
  description: string;
  rarity: GachaRarity;
  previewImage: ImageSourcePropType;
  /** Stable key used by the generated-asset registry. */
  assetKey: string;
};

export type GachaToolReward = GachaRewardBase & {
  id: GachaToolRewardId;
  category: 'tool';
  toolKind: GachaToolKind;
  styleNumber: GachaStyleNumber;
};

export type GachaGoodsReward = GachaRewardBase & {
  id: GachaGoodsRewardId;
  category: 'goods';
  characterId: GachaCharacterId;
  variant: GachaGoodsVariant;
};

export type GachaThemeReward = GachaRewardBase & {
  id: GachaThemeRewardId;
  category: 'theme';
  characterId: GachaCharacterId;
  styleNumber: GachaStyleNumber;
  assets: GachaThemeAssetGroup;
};

export type GachaReward = GachaToolReward | GachaGoodsReward | GachaThemeReward;

export type GachaCharacterSummary = {
  id: GachaCharacterId;
  name: string;
  accent: string;
  image: ImageSourcePropType;
  faction: 'mobby' | 'kuroboshi';
};

export const GACHA_CATEGORY_RATES: Readonly<Record<GachaRewardCategory, number>> = {
  tool: 40,
  goods: 45,
  theme: 15,
};

const TOOL_PREVIEWS: Readonly<Record<GachaToolKind, readonly ImageSourcePropType[]>> = {
  poke: [
    require('../../assets/gacha/tools/poke/01.png'),
    require('../../assets/gacha/tools/poke/02.png'),
    require('../../assets/gacha/tools/poke/03.png'),
    require('../../assets/gacha/tools/poke/04.png'),
    require('../../assets/gacha/tools/poke/05.png'),
  ],
  weight: [
    require('../../assets/gacha/tools/weight/01.png'),
    require('../../assets/gacha/tools/weight/02.png'),
    require('../../assets/gacha/tools/weight/03.png'),
    require('../../assets/gacha/tools/weight/04.png'),
    require('../../assets/gacha/tools/weight/05.png'),
  ],
};
const GOODS_PREVIEWS: Readonly<Record<GachaCharacterId, Readonly<Record<GachaGoodsVariant, ImageSourcePropType>>>> = {
  mobirin: { 'key-normal': require('../../assets/gacha/goods/mobirin/key-normal.png'), 'key-small': require('../../assets/gacha/goods/mobirin/key-small.png'), plush: require('../../assets/gacha/goods/mobirin/plush.webp') },
  mobichi: { 'key-normal': require('../../assets/gacha/goods/mobichi/key-normal.png'), 'key-small': require('../../assets/gacha/goods/mobichi/key-small.png'), plush: require('../../assets/gacha/goods/mobichi/plush.webp') },
  yami: { 'key-normal': require('../../assets/gacha/goods/yami/key-normal.png'), 'key-small': require('../../assets/gacha/goods/yami/key-small.png'), plush: require('../../assets/gacha/goods/yami/plush.webp') },
  mobiyan: { 'key-normal': require('../../assets/gacha/goods/mobiyan/key-normal.png'), 'key-small': require('../../assets/gacha/goods/mobiyan/key-small.png'), plush: require('../../assets/gacha/goods/mobiyan/plush.webp') },
  mobiyura: { 'key-normal': require('../../assets/gacha/goods/mobiyura/key-normal.png'), 'key-small': require('../../assets/gacha/goods/mobiyura/key-small.png'), plush: require('../../assets/gacha/goods/mobiyura/plush.webp') },
  reomoby: { 'key-normal': require('../../assets/gacha/goods/reomoby/key-normal.png'), 'key-small': require('../../assets/gacha/goods/reomoby/key-small.png'), plush: require('../../assets/gacha/goods/reomoby/plush.webp') },
  potemoby: { 'key-normal': require('../../assets/gacha/goods/potemoby/key-normal.png'), 'key-small': require('../../assets/gacha/goods/potemoby/key-small.png'), plush: require('../../assets/gacha/goods/potemoby/plush.webp') },
  mobibou: { 'key-normal': require('../../assets/gacha/goods/mobibou/key-normal.png'), 'key-small': require('../../assets/gacha/goods/mobibou/key-small.png'), plush: require('../../assets/gacha/goods/mobibou/plush.webp') },
  babumoby: { 'key-normal': require('../../assets/gacha/goods/babumoby/key-normal.png'), 'key-small': require('../../assets/gacha/goods/babumoby/key-small.png'), plush: require('../../assets/gacha/goods/babumoby/plush.webp') },
  magician: { 'key-normal': require('../../assets/gacha/goods/magician/key-normal.png'), 'key-small': require('../../assets/gacha/goods/magician/key-small.png'), plush: require('../../assets/gacha/goods/magician/plush.png') },
  informant: { 'key-normal': require('../../assets/gacha/goods/informant/key-normal.png'), 'key-small': require('../../assets/gacha/goods/informant/key-small.png'), plush: require('../../assets/gacha/goods/informant/plush.png') },
  tracker: { 'key-normal': require('../../assets/gacha/goods/tracker/key-normal.png'), 'key-small': require('../../assets/gacha/goods/tracker/key-small.png'), plush: require('../../assets/gacha/goods/tracker/plush.png') },
  safecracker: { 'key-normal': require('../../assets/gacha/goods/safecracker/key-normal.png'), 'key-small': require('../../assets/gacha/goods/safecracker/key-small.png'), plush: require('../../assets/gacha/goods/safecracker/plush.png') },
  'veiled-duchess': { 'key-normal': require('../../assets/gacha/goods/veiled-duchess/key-normal.png'), 'key-small': require('../../assets/gacha/goods/veiled-duchess/key-small.png'), plush: require('../../assets/gacha/goods/veiled-duchess/plush.png') },
  courier: { 'key-normal': require('../../assets/gacha/goods/courier/key-normal.png'), 'key-small': require('../../assets/gacha/goods/courier/key-small.png'), plush: require('../../assets/gacha/goods/courier/plush.png') },
  commander: { 'key-normal': require('../../assets/gacha/goods/commander/key-normal.png'), 'key-small': require('../../assets/gacha/goods/commander/key-small.png'), plush: require('../../assets/gacha/goods/commander/plush.png') },
};
const THEME_PREVIEW = require('../../assets/backgrounds/home-room-rich-v2.png');
const THEME_FALLBACK_SOURCES: Record<GachaThemeAssetSlot, ImageSourcePropType> = {
  appBackground: THEME_PREVIEW,
  buttonPrimary: require('../../assets/generated-ui/button-coral-v1.png'),
  buttonSecondary: require('../../assets/generated-ui/button-cream-v1.png'),
  card: require('../../assets/generated-ui/surface-paper-wide-v1.png'),
  navigation: require('../../assets/home-ui/panels/nav-backdrop-v4.png'),
  popup: require('../../assets/generated-ui/popup-settings-v1.png'),
};

const ENEMY_ACCENTS: Readonly<Record<EnemyId, string>> = {
  magician: '#765A9E',
  informant: '#4B758D',
  tracker: '#65764C',
  safecracker: '#9A6845',
  'veiled-duchess': '#8D5578',
  courier: '#8C6252',
  commander: '#535B75',
};

export const GACHA_CHARACTERS: readonly GachaCharacterSummary[] = [
  ...MOBBIES.map((mobby): GachaCharacterSummary => ({
    id: mobby.id,
    name: mobby.name,
    accent: mobby.color,
    image: mobby.image,
    faction: 'mobby',
  })),
  ...ENEMIES.map((enemy): GachaCharacterSummary => ({
    id: enemy.id,
    name: enemy.name,
    accent: ENEMY_ACCENTS[enemy.id],
    image: enemy.image,
    faction: 'kuroboshi',
  })),
];

export const GACHA_CHARACTER_IDS = GACHA_CHARACTERS.map((character) => character.id);

const CHARACTER_BY_ID = Object.fromEntries(
  GACHA_CHARACTERS.map((character) => [character.id, character]),
) as Record<GachaCharacterId, GachaCharacterSummary>;

const TOOL_NAMES: Readonly<Record<GachaToolKind, readonly string[]>> = {
  poke: ['ふわふわつつき棒', '星のつつき棒', 'ねこ手つつき棒', '探偵つつき棒', '王さまつつき棒'],
  weight: ['もちもち重し', 'プリン重し', '星空重し', '宝箱重し', '王冠重し'],
};

const TOOL_DESCRIPTIONS: Readonly<Record<GachaToolKind, string>> = {
  poke: 'ホームのキャラをつついて、ぺこんとへこませる道具。',
  weight: 'ホームのキャラに乗せて、むぎゅっとつぶす道具。',
};

const GOODS_LABELS: Readonly<Record<GachaGoodsVariant, string>> = {
  'key-normal': 'ぬいキー（通常）',
  'key-small': 'ぬいキー（S）',
  plush: 'ぬいぐるみ',
};

const THEME_STYLE_LABELS: readonly string[] = [
  'いつもの部屋',
  'おでかけ日和',
  '夢みる夜',
  'とっておきの日',
  'プレミアム',
];

function goodsPreview(character: GachaCharacterSummary, variant: GachaGoodsVariant) {
  return GOODS_PREVIEWS[character.id][variant];
}

function themeAssets(characterId: GachaCharacterId, styleNumber: GachaStyleNumber): GachaThemeAssetGroup {
  const generatedAssets = getGeneratedGachaThemeAssets(characterId, styleNumber);
  return Object.fromEntries(
    (Object.keys(THEME_FALLBACK_SOURCES) as GachaThemeAssetSlot[]).map((slot) => [
      slot,
      {
        assetKey: `themes/${characterId}/${String(styleNumber).padStart(2, '0')}/${slot}`,
        fallbackSource: THEME_FALLBACK_SOURCES[slot],
        source: generatedAssets[slot],
      },
    ]),
  ) as GachaThemeAssetGroup;
}

const TOOL_REWARDS: readonly GachaToolReward[] = GACHA_TOOL_KINDS.flatMap((toolKind) =>
  GACHA_STYLE_NUMBERS.map((styleNumber): GachaToolReward => ({
    id: `tool:${toolKind}:${styleNumber}`,
    category: 'tool',
    toolKind,
    styleNumber,
    name: TOOL_NAMES[toolKind][styleNumber - 1],
    description: TOOL_DESCRIPTIONS[toolKind],
    rarity: 'R',
    previewImage: TOOL_PREVIEWS[toolKind][styleNumber - 1],
    assetKey: `gacha/tools/${toolKind}/${String(styleNumber).padStart(2, '0')}`,
  })),
);

const GOODS_REWARDS: readonly GachaGoodsReward[] = GACHA_CHARACTERS.flatMap((character) =>
  GACHA_GOODS_VARIANTS.map((variant): GachaGoodsReward => ({
    id: `goods:${character.id}:${variant}`,
    category: 'goods',
    characterId: character.id,
    variant,
    name: `${character.name} ${GOODS_LABELS[variant]}`,
    description: variant === 'plush'
      ? `${character.name}をぎゅっと飾れるぬいぐるみ。`
      : `${character.name}を壁に飾れる${GOODS_LABELS[variant]}。`,
    rarity: variant === 'plush' ? 'SR' : 'R',
    previewImage: goodsPreview(character, variant),
    assetKey: `gacha/goods/${character.id}/${variant}`,
  })),
);

const THEME_REWARDS: readonly GachaThemeReward[] = GACHA_CHARACTERS.flatMap((character) =>
  GACHA_STYLE_NUMBERS.map((styleNumber): GachaThemeReward => {
    const assets = themeAssets(character.id, styleNumber);
    return {
      id: `theme:${character.id}:${styleNumber}`,
      category: 'theme',
      characterId: character.id,
      styleNumber,
      name: `${character.name}テーマ「${THEME_STYLE_LABELS[styleNumber - 1]}」`,
      description: `${character.name}らしさでアプリ全体を着せ替えるUIセット。`,
      rarity: 'SSR',
      previewImage: assets.appBackground.source ?? THEME_PREVIEW,
      assetKey: `themes/${character.id}/${String(styleNumber).padStart(2, '0')}`,
      assets,
    };
  }),
);

export const GACHA_TOOL_REWARDS = TOOL_REWARDS;
export const GACHA_GOODS_REWARDS = GOODS_REWARDS;
export const GACHA_THEME_REWARDS = THEME_REWARDS;
export const GACHA_STACKABLE_REWARDS: readonly (GachaToolReward | GachaGoodsReward)[] = [
  ...TOOL_REWARDS,
  ...GOODS_REWARDS,
];
export const GACHA_REWARDS: readonly GachaReward[] = [
  ...TOOL_REWARDS,
  ...GOODS_REWARDS,
  ...THEME_REWARDS,
];

export const GACHA_CATALOG_COUNTS = {
  characters: GACHA_CHARACTERS.length,
  tools: TOOL_REWARDS.length,
  goods: GOODS_REWARDS.length,
  themes: THEME_REWARDS.length,
  total: GACHA_REWARDS.length,
} as const;

const REWARD_BY_ID = Object.fromEntries(
  GACHA_REWARDS.map((reward) => [reward.id, reward]),
) as Record<GachaRewardId, GachaReward>;

const STACKABLE_IDS = new Set<GachaRewardId>(GACHA_STACKABLE_REWARDS.map((reward) => reward.id));
const THEME_IDS = new Set<GachaRewardId>(GACHA_THEME_REWARDS.map((reward) => reward.id));

export function getGachaCharacter(id: GachaCharacterId): GachaCharacterSummary {
  return CHARACTER_BY_ID[id];
}

export function getGachaReward(id: GachaRewardId): GachaReward {
  return REWARD_BY_ID[id];
}

export function isGachaRewardId(value: unknown): value is GachaRewardId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(REWARD_BY_ID, value);
}

export function isGachaStackableRewardId(value: unknown): value is GachaStackableRewardId {
  return isGachaRewardId(value) && STACKABLE_IDS.has(value);
}

export function isGachaThemeRewardId(value: unknown): value is GachaThemeRewardId {
  return isGachaRewardId(value) && THEME_IDS.has(value);
}
