import type { ImageSourcePropType } from 'react-native';

import { MOBBIES, type MobbyId } from '@/data/mobies';
import { PULL_REACTION_FRAMES } from '@/components/mobby/pullReactionFrames';
import { BLACK_STAR_PROFILES } from '@/domain/characters/blackStars';
import { getBlackStarReactionCatalog } from '@/domain/characters/blackStarReactions';
import type { CharacterId } from '@/domain/characters/types';

export const REACTION_COLLECTION_STORAGE_KEY = '@mobby/reaction-collection-v1';

export type ReactionSticker = {
  id: string;
  characterId: CharacterId;
  index: number;
  source: ImageSourcePropType;
  accessibilityLabel: string;
};

export const REACTION_MOBBY_IDS: readonly MobbyId[] = MOBBIES.map((mobby) => mobby.id);
export const REACTION_BLACK_STAR_IDS = BLACK_STAR_PROFILES.map((profile) => profile.id);
export const REACTION_CHARACTER_IDS: readonly CharacterId[] = [
  ...REACTION_MOBBY_IDS,
  ...REACTION_BLACK_STAR_IDS,
];

export const REACTION_STICKERS: Readonly<Record<CharacterId, readonly ReactionSticker[]>> = Object.fromEntries([
  ...REACTION_MOBBY_IDS.map((mobbyId) => [
    mobbyId,
    (PULL_REACTION_FRAMES[mobbyId] ?? []).map((source, index) => ({
      id: `${mobbyId}:pull:${index + 1}`,
      characterId: mobbyId,
      index,
      source,
      accessibilityLabel: `${mobbyId}のリアクション${index + 1}`,
    })),
  ] as const),
  ...BLACK_STAR_PROFILES.map((profile) => [
    profile.id,
    getBlackStarReactionCatalog(profile.enemyId).map((reaction, index) => ({
      id: reaction.id,
      characterId: profile.id,
      index,
      source: reaction.source,
      accessibilityLabel: reaction.accessibilityLabel,
    })),
  ] as const),
]) as unknown as Readonly<Record<CharacterId, readonly ReactionSticker[]>>;

export const ALL_REACTION_IDS: readonly string[] = REACTION_CHARACTER_IDS.flatMap(
  (characterId) => REACTION_STICKERS[characterId].map((sticker) => sticker.id),
);

const REACTION_IDS = new Set(ALL_REACTION_IDS);

export function normalizeCollectedReactionIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && REACTION_IDS.has(id)))];
}
