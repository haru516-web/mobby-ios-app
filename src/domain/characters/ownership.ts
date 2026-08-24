import type { ImageStyle } from 'react-native';

import type { EnemyId } from '@/data/enemies';
import type { MobbyId } from '@/data/mobies';

import { getCharacterProfile, isCharacterId, toBlackStarCharacterId } from './roster';
import type { CharacterId, CharacterProfile } from './types';

/**
 * Temporary local-development override requested for the large feature pass.
 * Keep the formal ownership path intact: production builds still respect
 * incident unlocks as soon as this switch is removed or disabled.
 */
export const CHARACTER_DEVELOPMENT_FLAGS = {
  temporaryUnlockAllCharacters: true,
} as const;

export type CharacterOwnership = ReadonlySet<CharacterId>;

export type CharacterOwnershipSeed = {
  mobbyIds?: readonly MobbyId[];
  completedBlackStarEnemyIds?: readonly EnemyId[];
};

export type CharacterOwnershipOptions = {
  /** Set false in previews/tests that need to inspect the locked silhouette. */
  applyDevelopmentOverride?: boolean;
};

export type CharacterOwnershipStatus = 'locked' | 'owned' | 'development-unlocked';

export const CHARACTER_SILHOUETTE_STYLE = {
  tintColor: '#121018',
  opacity: 0.38,
} as const satisfies ImageStyle;

export function isTemporaryCharacterUnlockEnabled(): boolean {
  return (
    typeof __DEV__ !== 'undefined' &&
    __DEV__ &&
    CHARACTER_DEVELOPMENT_FLAGS.temporaryUnlockAllCharacters
  );
}

export function createCharacterOwnership(seed: CharacterOwnershipSeed = {}): CharacterOwnership {
  return new Set<CharacterId>([
    ...(seed.mobbyIds ?? []),
    ...(seed.completedBlackStarEnemyIds ?? []).map(toBlackStarCharacterId),
  ]);
}

export function normalizeCharacterOwnership(value: unknown): CharacterOwnership {
  if (!Array.isArray(value)) return createCharacterOwnership();
  return new Set(value.filter(isCharacterId));
}

export function serializeCharacterOwnership(ownership: CharacterOwnership): readonly CharacterId[] {
  return [...ownership];
}

export function unlockBlackStarCharacter(
  ownership: CharacterOwnership,
  enemyId: EnemyId,
): CharacterOwnership {
  const next = new Set(ownership);
  next.add(toBlackStarCharacterId(enemyId));
  return next;
}

export function characterOwnershipStatus(
  id: CharacterId,
  ownership: CharacterOwnership,
  options: CharacterOwnershipOptions = {},
): CharacterOwnershipStatus {
  if (ownership.has(id)) return 'owned';
  if (options.applyDevelopmentOverride !== false && isTemporaryCharacterUnlockEnabled()) {
    return 'development-unlocked';
  }
  return 'locked';
}

export function isCharacterOwned(
  id: CharacterId,
  ownership: CharacterOwnership,
  options?: CharacterOwnershipOptions,
): boolean {
  return characterOwnershipStatus(id, ownership, options) !== 'locked';
}

export function shouldRenderCharacterAsSilhouette(
  id: CharacterId,
  ownership: CharacterOwnership,
  options?: CharacterOwnershipOptions,
): boolean {
  return !isCharacterOwned(id, ownership, options);
}

export function getCharacterUnlockHint(profile: CharacterProfile): string {
  return profile.kind === 'black-star'
    ? 'この黒星が登場する事件漫画を最後まで見ると解放されます'
    : 'まだお迎えしていません';
}

export function getCharacterPresentation(
  id: CharacterId,
  ownership: CharacterOwnership,
  options?: CharacterOwnershipOptions,
) {
  const profile = getCharacterProfile(id);
  const status = characterOwnershipStatus(id, ownership, options);
  const locked = status === 'locked';
  return {
    profile,
    status,
    owned: !locked,
    source: profile.image,
    imageStyle: locked ? CHARACTER_SILHOUETTE_STYLE : undefined,
    displayName: locked ? '？？？' : profile.name,
    accessibilityLabel: locked ? `未解放の${profile.kind === 'black-star' ? '黒星' : 'モビー'}` : profile.name,
    unlockHint: locked ? getCharacterUnlockHint(profile) : undefined,
  } as const;
}
