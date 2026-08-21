import type { ImageSourcePropType } from 'react-native';

import { MOBBIES, type MobbyId } from '@/data/mobies';
import { PULL_REACTION_FRAMES } from '@/components/mobby/pullReactionFrames';

export const REACTION_COLLECTION_STORAGE_KEY = '@mobby/reaction-collection-v1';

export type ReactionSticker = {
  id: string;
  mobbyId: MobbyId;
  index: number;
  source: ImageSourcePropType;
  accessibilityLabel: string;
};

export const REACTION_MOBBY_IDS: readonly MobbyId[] = MOBBIES.map((mobby) => mobby.id);

export const REACTION_STICKERS: Readonly<Record<MobbyId, readonly ReactionSticker[]>> = Object.fromEntries(
  REACTION_MOBBY_IDS.map((mobbyId) => [
    mobbyId,
    (PULL_REACTION_FRAMES[mobbyId] ?? []).map((source, index) => ({
      id: `${mobbyId}:pull:${index + 1}`,
      mobbyId,
      index,
      source,
      accessibilityLabel: `${mobbyId}のリアクション${index + 1}`,
    })),
  ]),
) as unknown as Readonly<Record<MobbyId, readonly ReactionSticker[]>>;

const REACTION_IDS = new Set(
  REACTION_MOBBY_IDS.flatMap((mobbyId) => REACTION_STICKERS[mobbyId].map((sticker) => sticker.id)),
);

export function normalizeCollectedReactionIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && REACTION_IDS.has(id)))];
}
