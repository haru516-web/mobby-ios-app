import type { ImageSourcePropType } from 'react-native';

import type { EnemyId } from '@/data/enemies';
import type { InteractionKind, MobbyId } from '@/data/mobies';

export type BlackStarCharacterId = `black-star:${EnemyId}`;
export type CharacterId = MobbyId | BlackStarCharacterId;
export type CharacterKind = 'mobby' | 'black-star';

export type CharacterLineKind =
  | InteractionKind
  | 'introduction'
  | 'incident'
  | 'unlock';

export type CharacterPalette = {
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  onSurface: string;
};

export type CharacterVoice = {
  firstPerson: string;
  style: string;
  lines: Readonly<Record<CharacterLineKind, readonly string[]>>;
};

type CharacterProfileBase = {
  id: CharacterId;
  kind: CharacterKind;
  name: string;
  reading: string;
  catchphrase: string;
  role: string;
  personality: string;
  palette: CharacterPalette;
  image: ImageSourcePropType;
  tags: readonly string[];
  voice: CharacterVoice;
};

export type MobbyCharacterProfile = CharacterProfileBase & {
  id: MobbyId;
  kind: 'mobby';
  mobbyId: MobbyId;
};

export type BlackStarReactionArtDirection = {
  composure: string;
  signatureMotion: string;
  breakingPoint: string;
  immutableDetails: readonly string[];
};

export type BlackStarCharacterProfile = CharacterProfileBase & {
  id: BlackStarCharacterId;
  kind: 'black-star';
  enemyId: EnemyId;
  order: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  title: string;
  reactionArtDirection: BlackStarReactionArtDirection;
};

export type CharacterProfile = MobbyCharacterProfile | BlackStarCharacterProfile;
