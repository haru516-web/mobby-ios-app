import type { MobbyId } from './mobies';
import type { EnemyId } from './enemies';

export const COLLECTIBLE_VARIANTS = ['key-normal', 'key-small', 'plush'] as const;
export type CollectibleVariant = (typeof COLLECTIBLE_VARIANTS)[number];
export type ItemKind = 'ぬいキー' | 'ぬいぐるみ';

export type Item = {
  id: string;
  name: string;
  kind: ItemKind;
  rarity: string;
  image: number;
  keyImage?: number;
  smallKeyImage?: number;
  accent: string;
  faction?: 'mobby' | 'kuroboshi';
};

const KEYCHAIN = {
  reomoby: require('../../assets/mobby-keychains/reomoby-key.png'), mobichi: require('../../assets/mobby-keychains/mobichi-key.png'),
  mobirin: require('../../assets/mobby-keychains/mobirin-key.png'), potemoby: require('../../assets/mobby-keychains/potemoby-key.png'),
  mobiyan: require('../../assets/mobby-keychains/mobiyan-key.png'), yami: require('../../assets/mobby-keychains/yami-key.png'),
  mobiyura: require('../../assets/mobby-keychains/mobiyura-key.png'), mobibou: require('../../assets/mobby-keychains/mobibou-key.png'),
  babumoby: require('../../assets/mobby-keychains/babumoby-key.png'),
} as const;
const KEYCHAIN_SMALL = {
  reomoby: require('../../assets/mobby-keychains/reomoby-key-s.png'), mobichi: require('../../assets/mobby-keychains/mobichi-key-s.png'),
  mobirin: require('../../assets/mobby-keychains/mobirin-key-s.png'), potemoby: require('../../assets/mobby-keychains/potemoby-key-s.png'),
  mobiyan: require('../../assets/mobby-keychains/mobiyan-key-s.png'), yami: require('../../assets/mobby-keychains/yami-key-s.png'),
  mobiyura: require('../../assets/mobby-keychains/mobiyura-key-s.png'), mobibou: require('../../assets/mobby-keychains/mobibou-key-s.png'),
  babumoby: require('../../assets/mobby-keychains/babumoby-key-s.png'),
} as const;
const BLACK_STAR_GOODS = {
  magician: { plush: require('../../assets/gacha/goods/magician/plush.png'), key: require('../../assets/gacha/goods/magician/key-normal.png'), small: require('../../assets/gacha/goods/magician/key-small.png') },
  informant: { plush: require('../../assets/gacha/goods/informant/plush.png'), key: require('../../assets/gacha/goods/informant/key-normal.png'), small: require('../../assets/gacha/goods/informant/key-small.png') },
  tracker: { plush: require('../../assets/gacha/goods/tracker/plush.png'), key: require('../../assets/gacha/goods/tracker/key-normal.png'), small: require('../../assets/gacha/goods/tracker/key-small.png') },
  safecracker: { plush: require('../../assets/gacha/goods/safecracker/plush.png'), key: require('../../assets/gacha/goods/safecracker/key-normal.png'), small: require('../../assets/gacha/goods/safecracker/key-small.png') },
  'veiled-duchess': { plush: require('../../assets/gacha/goods/veiled-duchess/plush.png'), key: require('../../assets/gacha/goods/veiled-duchess/key-normal.png'), small: require('../../assets/gacha/goods/veiled-duchess/key-small.png') },
  courier: { plush: require('../../assets/gacha/goods/courier/plush.png'), key: require('../../assets/gacha/goods/courier/key-normal.png'), small: require('../../assets/gacha/goods/courier/key-small.png') },
  commander: { plush: require('../../assets/gacha/goods/commander/plush.png'), key: require('../../assets/gacha/goods/commander/key-normal.png'), small: require('../../assets/gacha/goods/commander/key-small.png') },
} as const;

export type ItemId =
  | 'mobichi-key' | 'mobiyan-plush' | 'yami-key' | 'mobibou-plush' | 'mobirin-key'
  | 'mobiyura-plush' | 'reo-key' | 'pote-plush' | 'babu-key'
  | 'magician-star' | 'informant-star' | 'tracker-star' | 'safecracker-star'
  | 'veiled-duchess-star' | 'courier-star' | 'commander-star';
export const ITEMS: Item[] = [
  { id: 'mobichi-key', name: 'もびち ぬいキー', kind: 'ぬいキー', rarity: 'R', image: require('../../assets/mobies/mobichi.webp'), keyImage: KEYCHAIN.mobichi, smallKeyImage: KEYCHAIN_SMALL.mobichi, accent: '#E79AA7', faction: 'mobby' },
  { id: 'mobiyan-plush', name: 'もびやん ぬい', kind: 'ぬいぐるみ', rarity: 'SR', image: require('../../assets/mobies/mobiyan.webp'), keyImage: KEYCHAIN.mobiyan, smallKeyImage: KEYCHAIN_SMALL.mobiyan, accent: '#83B8C4', faction: 'mobby' },
  { id: 'yami-key', name: '病みモビー ぬいキー', kind: 'ぬいキー', rarity: 'SSR', image: require('../../assets/mobies/yami-mobby.webp'), keyImage: KEYCHAIN.yami, smallKeyImage: KEYCHAIN_SMALL.yami, accent: '#A898C3', faction: 'mobby' },
  { id: 'mobibou-plush', name: 'もびぼう ぬい', kind: 'ぬいぐるみ', rarity: 'R', image: require('../../assets/mobies/mobibou.webp'), keyImage: KEYCHAIN.mobibou, smallKeyImage: KEYCHAIN_SMALL.mobibou, accent: '#D99A62', faction: 'mobby' },
  { id: 'mobirin-key', name: 'もびりん ぬいキー', kind: 'ぬいキー', rarity: 'N', image: require('../../assets/mobies/mobirin.webp'), keyImage: KEYCHAIN.mobirin, smallKeyImage: KEYCHAIN_SMALL.mobirin, accent: '#9EB8C5', faction: 'mobby' },
  { id: 'mobiyura-plush', name: 'もびゆら ぬい', kind: 'ぬいぐるみ', rarity: 'SR', image: require('../../assets/mobies/mobiyura.webp'), keyImage: KEYCHAIN.mobiyura, smallKeyImage: KEYCHAIN_SMALL.mobiyura, accent: '#BCA6D4', faction: 'mobby' },
  { id: 'reo-key', name: 'れおモビー ぬいキー', kind: 'ぬいキー', rarity: 'R', image: require('../../assets/mobies/reomoby.webp'), keyImage: KEYCHAIN.reomoby, smallKeyImage: KEYCHAIN_SMALL.reomoby, accent: '#D88E9F', faction: 'mobby' },
  { id: 'pote-plush', name: 'ぽてもび ぬい', kind: 'ぬいぐるみ', rarity: 'N', image: require('../../assets/mobies/potemoby.webp'), keyImage: KEYCHAIN.potemoby, smallKeyImage: KEYCHAIN_SMALL.potemoby, accent: '#C49B72', faction: 'mobby' },
  { id: 'babu-key', name: 'ばぶモビー ぬいキー', kind: 'ぬいキー', rarity: 'N', image: require('../../assets/mobies/babumoby.webp'), keyImage: KEYCHAIN.babumoby, smallKeyImage: KEYCHAIN_SMALL.babumoby, accent: '#E7AFC0', faction: 'mobby' },
  { id: 'magician-star', name: '天城 幻十郎 ぬい', kind: 'ぬいぐるみ', rarity: 'SSR', image: BLACK_STAR_GOODS.magician.plush, keyImage: BLACK_STAR_GOODS.magician.key, smallKeyImage: BLACK_STAR_GOODS.magician.small, accent: '#B93B55', faction: 'kuroboshi' },
  { id: 'informant-star', name: '御影 静馬 ぬい', kind: 'ぬいぐるみ', rarity: 'SSR', image: BLACK_STAR_GOODS.informant.plush, keyImage: BLACK_STAR_GOODS.informant.key, smallKeyImage: BLACK_STAR_GOODS.informant.small, accent: '#38A6A3', faction: 'kuroboshi' },
  { id: 'tracker-star', name: '狩谷 迅 ぬい', kind: 'ぬいぐるみ', rarity: 'SSR', image: BLACK_STAR_GOODS.tracker.plush, keyImage: BLACK_STAR_GOODS.tracker.key, smallKeyImage: BLACK_STAR_GOODS.tracker.small, accent: '#8667C6', faction: 'kuroboshi' },
  { id: 'safecracker-star', name: '久世 錠士郎 ぬい', kind: 'ぬいぐるみ', rarity: 'SSR', image: BLACK_STAR_GOODS.safecracker.plush, keyImage: BLACK_STAR_GOODS.safecracker.key, smallKeyImage: BLACK_STAR_GOODS.safecracker.small, accent: '#BA8C49', faction: 'kuroboshi' },
  { id: 'veiled-duchess-star', name: '黒姫 紫苑 ぬい', kind: 'ぬいぐるみ', rarity: 'SSR', image: BLACK_STAR_GOODS['veiled-duchess'].plush, keyImage: BLACK_STAR_GOODS['veiled-duchess'].key, smallKeyImage: BLACK_STAR_GOODS['veiled-duchess'].small, accent: '#A95E9E', faction: 'kuroboshi' },
  { id: 'courier-star', name: '速水 玲司 ぬい', kind: 'ぬいぐるみ', rarity: 'SSR', image: BLACK_STAR_GOODS.courier.plush, keyImage: BLACK_STAR_GOODS.courier.key, smallKeyImage: BLACK_STAR_GOODS.courier.small, accent: '#D9822B', faction: 'kuroboshi' },
  { id: 'commander-star', name: '皇城 統雅 ぬい', kind: 'ぬいぐるみ', rarity: 'SSR', image: BLACK_STAR_GOODS.commander.plush, keyImage: BLACK_STAR_GOODS.commander.key, smallKeyImage: BLACK_STAR_GOODS.commander.small, accent: '#C49B53', faction: 'kuroboshi' },
] as const;

export type CollectibleSelection = { itemId: ItemId; variant: CollectibleVariant };
export const ITEM_MOBBY_IDS: Record<string, MobbyId> = {
  'mobichi-key': 'mobichi', 'mobiyan-plush': 'mobiyan', 'yami-key': 'yami', 'mobibou-plush': 'mobibou',
  'mobirin-key': 'mobirin', 'mobiyura-plush': 'mobiyura', 'reo-key': 'reomoby', 'pote-plush': 'potemoby', 'babu-key': 'babumoby',
};
export const ITEM_ENEMY_IDS: Readonly<Record<string, EnemyId>> = {
  'magician-star': 'magician', 'informant-star': 'informant', 'tracker-star': 'tracker',
  'safecracker-star': 'safecracker', 'veiled-duchess-star': 'veiled-duchess',
  'courier-star': 'courier', 'commander-star': 'commander',
};
export const CHARACTER_ITEM_IDS: Readonly<Record<MobbyId | EnemyId, ItemId>> = {
  mobichi: 'mobichi-key', mobiyan: 'mobiyan-plush', yami: 'yami-key', mobibou: 'mobibou-plush',
  mobirin: 'mobirin-key', mobiyura: 'mobiyura-plush', reomoby: 'reo-key', potemoby: 'pote-plush', babumoby: 'babu-key',
  magician: 'magician-star', informant: 'informant-star', tracker: 'tracker-star', safecracker: 'safecracker-star',
  'veiled-duchess': 'veiled-duchess-star', courier: 'courier-star', commander: 'commander-star',
};
export const isBlackStarItem = (item: Item) => item.faction === 'kuroboshi' || Object.prototype.hasOwnProperty.call(ITEM_ENEMY_IDS, item.id);

export const isItemId = (value: unknown): value is ItemId => typeof value === 'string' && ITEMS.some((item) => item.id === value);
export const isCollectibleVariant = (value: unknown): value is CollectibleVariant =>
  typeof value === 'string' && COLLECTIBLE_VARIANTS.includes(value as CollectibleVariant);
export const isCollectibleSelection = (value: unknown): value is CollectibleSelection & Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { itemId?: unknown; variant?: unknown };
  return isItemId(candidate.itemId) && isCollectibleVariant(candidate.variant);
};
export const resolveItem = (itemId: unknown): Item | null => ITEMS.find((item) => item.id === itemId) ?? null;
export const itemCharacterName = (item: Item) => item.name.replace(' ぬいキー', '').replace(' ぬい', '');
export const collectibleVariantLabel = (variant: CollectibleVariant) =>
  variant === 'key-normal' ? 'ぬいキー（通常）' : variant === 'key-small' ? 'ぬいキー（S）' : 'ぬいぐるみ';
export const collectibleName = (item: Item, variant: CollectibleVariant) => `${itemCharacterName(item)} ${collectibleVariantLabel(variant)}`;
export const resolveCollectibleName = (itemId: unknown, variant: unknown) => {
  const item = resolveItem(itemId);
  return item && isCollectibleVariant(variant) ? collectibleName(item, variant) : null;
};
export const collectibleInventoryKey = (itemId: string, variant: CollectibleVariant) => `${itemId}::${variant}` as const;
export const collectibleImage = (item: Item, variant: CollectibleVariant) =>
  variant === 'key-small' ? item.smallKeyImage ?? item.keyImage ?? item.image : variant === 'key-normal' ? item.keyImage ?? item.smallKeyImage ?? item.image : item.image;
export const ownedCollectibleCount = (owned: Record<string, number>, itemId: string, variant: CollectibleVariant) => owned[collectibleInventoryKey(itemId, variant)] ?? 0;
export const legacyVariantForItem = (item: Item): CollectibleVariant => item.kind === 'ぬいキー' ? 'key-normal' : 'plush';
export const EMPTY_OWNED: Record<string, number> = Object.fromEntries(ITEMS.flatMap((item) => COLLECTIBLE_VARIANTS.map((variant) => [collectibleInventoryKey(item.id, variant), 0])));

export function normalizeCollectibleInventory(raw: Record<string, unknown>, receiptKeys: (key: string) => boolean) {
  const normalized = { ...EMPTY_OWNED };
  for (const item of ITEMS) {
    for (const variant of COLLECTIBLE_VARIANTS) {
      const key = collectibleInventoryKey(item.id, variant);
      const variantCount = Number(raw[key]);
      normalized[key] = Number.isSafeInteger(variantCount) && variantCount > 0 ? variantCount : 0;
    }
    const legacyCount = Number(raw[item.id]);
    if (Number.isSafeInteger(legacyCount) && legacyCount > 0) {
      const key = collectibleInventoryKey(item.id, legacyVariantForItem(item));
      normalized[key] += legacyCount;
    }
  }
  for (const [key, value] of Object.entries(raw)) if (receiptKeys(key) && value === 1) normalized[key] = 1;
  return normalized;
}
