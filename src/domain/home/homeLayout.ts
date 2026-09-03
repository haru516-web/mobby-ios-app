import {
  COLLECTION_ITEMS,
  collectibleInventoryKey,
  isCollectibleVariant,
  isItemId,
  ownedCollectibleCount,
  type CollectibleVariant,
  type Item,
} from '@/data/collectibles';

export const HOME_WALL_SLOT_COUNT = 10;
export const HOME_SHELF_SLOT_COUNT = 4;

export type HomePlacementKind = 'wall' | 'plush';
export type HomePlacementId = string;
export type HomeSlot = HomePlacementId | null;

export type HomeLayoutV1 = {
  version: 1;
  wallSlots: HomeSlot[];
  shelfSlots: HomeSlot[];
};

export type ResolvedHomePlacement = {
  id: HomePlacementId;
  inventoryKey: string;
  item: Item;
  variant: CollectibleVariant;
  kind: HomePlacementKind;
  copyNumber: number;
};

const WALL_VARIANTS: readonly CollectibleVariant[] = ['key-normal', 'key-small'];

function emptySlots(count: number): HomeSlot[] {
  return Array.from({ length: count }, (): HomeSlot => null);
}

export function resolveHomePlacement(value: unknown): ResolvedHomePlacement | null {
  if (typeof value !== 'string') return null;
  const parts = value.split('::');
  if (parts.length !== 2 && parts.length !== 3) return null;
  const [itemId, variantValue, copyValue] = parts;
  if (!isItemId(itemId) || !isCollectibleVariant(variantValue)) return null;
  if (copyValue !== undefined && !/^[1-9]\d*$/.test(copyValue)) return null;
  const copyNumber = copyValue === undefined ? 1 : Number(copyValue);
  if (!Number.isSafeInteger(copyNumber) || copyNumber < 1) return null;
  const item = COLLECTION_ITEMS.find((candidate) => candidate.id === itemId);
  if (!item) return null;
  const inventoryKey = collectibleInventoryKey(itemId, variantValue);
  return {
    id: homePlacementId(itemId, variantValue, copyNumber),
    inventoryKey,
    item,
    variant: variantValue,
    kind: variantValue === 'plush' ? 'plush' : 'wall',
    copyNumber,
  };
}

export function homePlacementId(itemId: string, variant: CollectibleVariant, copyNumber = 1) {
  if (!Number.isSafeInteger(copyNumber) || copyNumber < 1) {
    throw new RangeError('Home placement copyNumber must be a positive safe integer');
  }
  return `${collectibleInventoryKey(itemId, variant)}::${copyNumber}` as HomePlacementId;
}

export function ownedHomePlacementIds(owned: Readonly<Record<string, number>>, kind?: HomePlacementKind) {
  const variants: readonly CollectibleVariant[] = kind === 'plush'
    ? ['plush']
    : kind === 'wall'
      ? WALL_VARIANTS
      : ['key-normal', 'key-small', 'plush'];
  return COLLECTION_ITEMS.flatMap((item) => variants.flatMap((variant) => {
    const count = ownedCollectibleCount(owned as Record<string, number>, item.id, variant);
    if (!Number.isSafeInteger(count) || count <= 0) return [];
    return Array.from({ length: count }, (_, index) => homePlacementId(item.id, variant, index + 1));
  }));
}

function isOwnedPlacement(id: HomePlacementId, owned: Readonly<Record<string, number>>, kind: HomePlacementKind) {
  const placement = resolveHomePlacement(id);
  if (!placement || placement.kind !== kind) return false;
  const ownedCount = ownedCollectibleCount(owned as Record<string, number>, placement.item.id, placement.variant);
  return Boolean(
    Number.isSafeInteger(ownedCount) &&
    placement.copyNumber <= ownedCount
  );
}

export function createDefaultHomeLayout(owned: Readonly<Record<string, number>>): HomeLayoutV1 {
  const wallSlots = emptySlots(HOME_WALL_SLOT_COUNT);
  let wallIndex = 0;
  for (const item of COLLECTION_ITEMS) {
    const variant = WALL_VARIANTS.find((candidate) => ownedCollectibleCount(owned as Record<string, number>, item.id, candidate) > 0);
    if (!variant || wallIndex >= wallSlots.length) continue;
    wallSlots[wallIndex] = homePlacementId(item.id, variant, 1);
    wallIndex += 1;
  }
  const shelfSlots = emptySlots(HOME_SHELF_SLOT_COUNT);
  let shelfIndex = 0;
  for (const item of COLLECTION_ITEMS) {
    if (shelfIndex >= shelfSlots.length) break;
    if (ownedCollectibleCount(owned as Record<string, number>, item.id, 'plush') <= 0) continue;
    shelfSlots[shelfIndex] = homePlacementId(item.id, 'plush', 1);
    shelfIndex += 1;
  }
  return { version: 1, wallSlots, shelfSlots };
}

function normalizeSlots(
  raw: unknown,
  count: number,
  kind: HomePlacementKind,
  owned: Readonly<Record<string, number>>,
  used: Set<HomePlacementId>,
) {
  const slots = emptySlots(count);
  if (!Array.isArray(raw)) return slots;
  raw.slice(0, count).forEach((value, index) => {
    if (typeof value !== 'string' || !isOwnedPlacement(value, owned, kind)) return;
    const placement = resolveHomePlacement(value);
    if (!placement || used.has(placement.id)) return;
    slots[index] = placement.id;
    used.add(placement.id);
  });
  return slots;
}

export function decodeHomeLayout(raw: string | null, owned: Readonly<Record<string, number>>): HomeLayoutV1 {
  if (!raw) return createDefaultHomeLayout(owned);
  try {
    const parsed = JSON.parse(raw) as Partial<HomeLayoutV1>;
    if (parsed.version !== 1 || !Array.isArray(parsed.wallSlots) || !Array.isArray(parsed.shelfSlots)) {
      return createDefaultHomeLayout(owned);
    }
    const used = new Set<HomePlacementId>();
    return {
      version: 1,
      wallSlots: normalizeSlots(parsed.wallSlots, HOME_WALL_SLOT_COUNT, 'wall', owned, used),
      shelfSlots: normalizeSlots(parsed.shelfSlots, HOME_SHELF_SLOT_COUNT, 'plush', owned, used),
    };
  } catch {
    return createDefaultHomeLayout(owned);
  }
}

export function reconcileHomeLayout(layout: HomeLayoutV1, owned: Readonly<Record<string, number>>): HomeLayoutV1 {
  const used = new Set<HomePlacementId>();
  return {
    version: 1,
    wallSlots: normalizeSlots(layout.wallSlots, HOME_WALL_SLOT_COUNT, 'wall', owned, used),
    shelfSlots: normalizeSlots(layout.shelfSlots, HOME_SHELF_SLOT_COUNT, 'plush', owned, used),
  };
}

export function moveHomePlacement(layout: HomeLayoutV1, placementId: HomePlacementId, targetIndex: number): HomeLayoutV1 {
  const placement = resolveHomePlacement(placementId);
  if (!placement) return layout;
  const key = placement.kind === 'wall' ? 'wallSlots' : 'shelfSlots';
  const current = layout[key];
  const boundedTarget = Math.max(0, Math.min(current.length - 1, Math.round(targetIndex)));
  const sourceIndex = current.findIndex((slot) => resolveHomePlacement(slot)?.id === placement.id);
  if (sourceIndex === boundedTarget) return layout;
  const next = [...current];
  const displaced = resolveHomePlacement(next[boundedTarget])?.id ?? null;
  if (sourceIndex >= 0) next[sourceIndex] = displaced;
  next[boundedTarget] = placement.id;
  return { ...layout, [key]: next };
}

export function removeHomePlacement(layout: HomeLayoutV1, placementId: HomePlacementId): HomeLayoutV1 {
  const placement = resolveHomePlacement(placementId);
  if (!placement) return layout;
  const key = placement.kind === 'wall' ? 'wallSlots' : 'shelfSlots';
  if (!layout[key].some((id) => resolveHomePlacement(id)?.id === placement.id)) return layout;
  return {
    ...layout,
    [key]: layout[key].map((id) => resolveHomePlacement(id)?.id === placement.id ? null : id),
  };
}

export function placeHomeReward(layout: HomeLayoutV1, placementId: HomePlacementId): HomeLayoutV1;
export function placeHomeReward(layout: HomeLayoutV1, itemId: string, variant: CollectibleVariant, copyNumber?: number): HomeLayoutV1;
export function placeHomeReward(
  layout: HomeLayoutV1,
  placementIdOrItemId: HomePlacementId | string,
  variant?: CollectibleVariant,
  copyNumber = 1,
): HomeLayoutV1 {
  const id = variant === undefined
    ? resolveHomePlacement(placementIdOrItemId)?.id
    : homePlacementId(placementIdOrItemId, variant, copyNumber);
  if (!id) return layout;
  const placement = resolveHomePlacement(id);
  if (!placement) return layout;
  const key = placement.kind === 'wall' ? 'wallSlots' : 'shelfSlots';
  if (layout[key].some((slot) => resolveHomePlacement(slot)?.id === id)) return layout;
  const firstEmpty = layout[key].findIndex((slot) => slot === null);
  if (firstEmpty >= 0) return moveHomePlacement(layout, id, firstEmpty);

  // Match the previous home behavior when every display slot is occupied:
  // a newly earned key variant replaces that character's displayed variant,
  // while a new plush takes the lead shelf position. The displaced collectible
  // remains owned and immediately becomes available in the inventory tray.
  const sameCharacterIndex = layout[key].findIndex((slot) => resolveHomePlacement(slot)?.item.id === placement.item.id);
  return moveHomePlacement(layout, id, sameCharacterIndex >= 0 ? sameCharacterIndex : 0);
}
