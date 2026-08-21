import type { MobbyId } from './mobies';

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

export type ItemId = 'mobichi-key' | 'mobiyan-plush' | 'yami-key' | 'mobibou-plush' | 'mobirin-key' | 'mobiyura-plush' | 'reo-key' | 'pote-plush' | 'babu-key';
export const ITEMS: Item[] = [
  { id: 'mobichi-key', name: 'もびち ぬいキー', kind: 'ぬいキー', rarity: 'R', image: require('../../assets/mobies/mobichi.webp'), keyImage: KEYCHAIN.mobichi, smallKeyImage: KEYCHAIN_SMALL.mobichi, accent: '#E79AA7' },
  { id: 'mobiyan-plush', name: 'もびやん ぬい', kind: 'ぬいぐるみ', rarity: 'SR', image: require('../../assets/mobies/mobiyan.webp'), keyImage: KEYCHAIN.mobiyan, smallKeyImage: KEYCHAIN_SMALL.mobiyan, accent: '#83B8C4' },
  { id: 'yami-key', name: '病みモビー ぬいキー', kind: 'ぬいキー', rarity: 'SSR', image: require('../../assets/mobies/yami-mobby.webp'), keyImage: KEYCHAIN.yami, smallKeyImage: KEYCHAIN_SMALL.yami, accent: '#A898C3' },
  { id: 'mobibou-plush', name: 'もびぼう ぬい', kind: 'ぬいぐるみ', rarity: 'R', image: require('../../assets/mobies/mobibou.webp'), keyImage: KEYCHAIN.mobibou, smallKeyImage: KEYCHAIN_SMALL.mobibou, accent: '#D99A62' },
  { id: 'mobirin-key', name: 'もびりん ぬいキー', kind: 'ぬいキー', rarity: 'N', image: require('../../assets/mobies/mobirin.webp'), keyImage: KEYCHAIN.mobirin, smallKeyImage: KEYCHAIN_SMALL.mobirin, accent: '#9EB8C5' },
  { id: 'mobiyura-plush', name: 'もびゆら ぬい', kind: 'ぬいぐるみ', rarity: 'SR', image: require('../../assets/mobies/mobiyura.webp'), keyImage: KEYCHAIN.mobiyura, smallKeyImage: KEYCHAIN_SMALL.mobiyura, accent: '#BCA6D4' },
  { id: 'reo-key', name: 'れおモビー ぬいキー', kind: 'ぬいキー', rarity: 'R', image: require('../../assets/mobies/reomoby.webp'), keyImage: KEYCHAIN.reomoby, smallKeyImage: KEYCHAIN_SMALL.reomoby, accent: '#D88E9F' },
  { id: 'pote-plush', name: 'ぽてもび ぬい', kind: 'ぬいぐるみ', rarity: 'N', image: require('../../assets/mobies/potemoby.webp'), keyImage: KEYCHAIN.potemoby, smallKeyImage: KEYCHAIN_SMALL.potemoby, accent: '#C49B72' },
  { id: 'babu-key', name: 'ばぶモビー ぬいキー', kind: 'ぬいキー', rarity: 'N', image: require('../../assets/mobies/babumoby.webp'), keyImage: KEYCHAIN.babumoby, smallKeyImage: KEYCHAIN_SMALL.babumoby, accent: '#E7AFC0' },
] as const;

export type CollectibleSelection = { itemId: ItemId; variant: CollectibleVariant };
export const ITEM_MOBBY_IDS: Record<string, MobbyId> = {
  'mobichi-key': 'mobichi', 'mobiyan-plush': 'mobiyan', 'yami-key': 'yami', 'mobibou-plush': 'mobibou',
  'mobirin-key': 'mobirin', 'mobiyura-plush': 'mobiyura', 'reo-key': 'reomoby', 'pote-plush': 'potemoby', 'babu-key': 'babumoby',
};

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
