import type { EnemyId } from '@/data/enemies';
import { MOBBIES, type MobbyId } from '@/data/mobies';

import { BLACK_STAR_PROFILES } from './blackStars';
import type {
  BlackStarCharacterId,
  CharacterId,
  CharacterProfile,
  MobbyCharacterProfile,
} from './types';

const MOBBY_VOICE: Readonly<Record<MobbyId, { firstPerson: string; style: string; reading: string }>> = {
  mobirin: { firstPerson: '私', style: '穏やかな年長者の丁寧語。「ですぞ」を交えて、急がず本質を語る。', reading: 'もびりん' },
  mobichi: { firstPerson: 'うち', style: '明るくくだけたギャル口調。好きなものを素直に肯定し、相手を気軽に誘う。', reading: 'もびち' },
  yami: { firstPerson: '私', style: '小さく間を置く話し方。不安を隠さず、そばにいてほしい気持ちを静かに伝える。', reading: 'やみもびー' },
  mobiyan: { firstPerson: '俺', style: '勢いのある関西弁風。信念と行動をまっすぐな言葉で促す。', reading: 'もびやん' },
  mobiyura: { firstPerson: '我', style: '古風で大げさな王の口調。日常の出来事まで闇の運命として語る。', reading: 'もびゆら' },
  reomoby: { firstPerson: '僕', style: '余裕のある王子様口調。相手が主役になるよう、甘く華やかに話す。', reading: 'れおもび' },
  potemoby: { firstPerson: 'ぼく', style: '眠そうに語尾を伸ばす。頑張りすぎを止め、休むことを肯定する。', reading: 'ぽてもび' },
  mobibou: { firstPerson: 'ぼく', style: '口達者な子どもの軽口。強がりと言い訳の奥に、構ってほしい気持ちが見える。', reading: 'もびぼう' },
  babumoby: { firstPerson: 'ばぶ', style: '短いばぶ語、喃語、泣き声。今してほしいことを全身で伝える。', reading: 'ばぶもび' },
};

export const MOBBY_CHARACTER_PROFILES: readonly MobbyCharacterProfile[] = MOBBIES.map((mobby) => {
  const voice = MOBBY_VOICE[mobby.id];
  return {
    id: mobby.id,
    kind: 'mobby',
    mobbyId: mobby.id,
    name: mobby.name,
    reading: voice.reading,
    catchphrase: mobby.catchphrase,
    role: mobby.role,
    personality: `${mobby.role}。${mobby.tags.join('・')}を大切にする。`,
    palette: {
      primary: mobby.color,
      secondary: mobby.accent,
      accent: mobby.color,
      surface: mobby.accent,
      onSurface: '#302631',
    },
    image: mobby.image,
    tags: mobby.tags,
    voice: {
      firstPerson: voice.firstPerson,
      style: voice.style,
      lines: {
        introduction: [`${mobby.name}。${mobby.catchphrase}。`],
        incident: mobby.lines.tease.slice(0, 2),
        unlock: mobby.lines.care.slice(0, 1),
        tease: mobby.lines.tease,
        care: mobby.lines.care,
        gift: mobby.lines.gift,
      },
    },
  };
});

export const CHARACTER_PROFILES: readonly CharacterProfile[] = [
  ...MOBBY_CHARACTER_PROFILES,
  ...BLACK_STAR_PROFILES,
];

export const MOBBY_CHARACTER_IDS: readonly MobbyId[] = MOBBY_CHARACTER_PROFILES.map(
  (profile) => profile.mobbyId,
);

export const BLACK_STAR_CHARACTER_IDS: readonly BlackStarCharacterId[] = BLACK_STAR_PROFILES.map(
  (profile) => profile.id,
);

export const CHARACTER_IDS: readonly CharacterId[] = CHARACTER_PROFILES.map(
  (profile) => profile.id,
);

export const CHARACTER_PROFILE_BY_ID = Object.fromEntries(
  CHARACTER_PROFILES.map((profile) => [profile.id, profile]),
) as unknown as Readonly<Record<CharacterId, CharacterProfile>>;

const MOBBY_IDS = new Set<string>(MOBBY_CHARACTER_IDS);
const BLACK_STAR_IDS = new Set<string>(BLACK_STAR_CHARACTER_IDS);

export function toBlackStarCharacterId(enemyId: EnemyId): BlackStarCharacterId {
  return `black-star:${enemyId}`;
}

export function enemyIdFromBlackStarCharacterId(id: BlackStarCharacterId): EnemyId {
  return id.slice('black-star:'.length) as EnemyId;
}

export function isMobbyCharacterId(value: unknown): value is MobbyId {
  return typeof value === 'string' && MOBBY_IDS.has(value);
}

export function isBlackStarCharacterId(value: unknown): value is BlackStarCharacterId {
  return typeof value === 'string' && BLACK_STAR_IDS.has(value);
}

export function isCharacterId(value: unknown): value is CharacterId {
  return isMobbyCharacterId(value) || isBlackStarCharacterId(value);
}

export function getCharacterProfile(id: CharacterId): CharacterProfile {
  return CHARACTER_PROFILE_BY_ID[id];
}

/**
 * A single controlled 黒星 button can pass its boolean value here. `false`
 * means the normal nine; `true` means the seven Black Stars.
 */
export function characterProfilesForBlackStarToggle(
  showBlackStars: boolean,
): readonly CharacterProfile[] {
  return showBlackStars ? BLACK_STAR_PROFILES : MOBBY_CHARACTER_PROFILES;
}
