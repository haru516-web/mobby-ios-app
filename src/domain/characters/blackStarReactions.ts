import type { ImageSourcePropType } from 'react-native';

import type { EnemyId } from '@/data/enemies';

import { BLACK_STAR_PROFILES } from './blackStars';
import {
  BLACK_STAR_GENERATED_REACTION_ASSETS,
  type ExactlyTwenty,
} from './blackStarReactionAssets.generated';
import type { BlackStarCharacterId, BlackStarCharacterProfile } from './types';

export const BLACK_STAR_REACTION_COUNT = 20 as const;

export const BLACK_STAR_REACTION_SLOTS = [
  { index: 1, slug: 'startled', label: '不意打ち', pose: '突然つつかれ、片目を大きく見開いて帽子と全身がわずかに跳ねる' },
  { index: 2, slug: 'hold-cheek', label: '頬を押さえる', pose: 'つつかれた側の頬を片手でかばい、平静を装いながら相手を見る' },
  { index: 3, slug: 'protest', label: '抗議', pose: '姿勢を正して片手を前へ出し、威厳のある抗議を示す' },
  { index: 4, slug: 'sulk', label: '不機嫌', pose: '視線を逸らし、衣装を寄せて静かに不機嫌さを示す' },
  { index: 5, slug: 'notice', label: '察知', pose: '次のつつきを察知し、片目を細めて接触点へ意識を集中する' },
  { index: 6, slug: 'evade', label: '回避', pose: '衣装の輪郭を保ったまま素早く半歩引き、つつきを紙一重で避ける' },
  { index: 7, slug: 'parry', label: '払いのける', pose: '小さな腕で相手を横へ払い、鋭い視線で制止する' },
  { index: 8, slug: 'signature-counter', label: '固有の反撃', pose: 'キャラクター固有の所作で威厳を取り戻し、反撃へ移る瞬間' },
  { index: 9, slug: 'bawling-waterfall', label: '決壊', pose: '本気の人格が崩れるほど大泣きし、両目から誇張された滝の涙を流す' },
  { index: 10, slug: 'defensive-curl', label: '防御姿勢', pose: '外套と腕で身を包み、丸く縮こまって接触を完全に防ぐ' },
  { index: 11, slug: 'frantic-no', label: '全力拒否', pose: '両腕と頭を激しく横へ振り、必死に拒否する' },
  { index: 12, slug: 'dramatic-faint', label: '失神', pose: '威厳を保とうとしたまま力尽き、演劇的に後方へ倒れる' },
  { index: 13, slug: 'furious-stomp', label: '怒りの足踏み', pose: '片足を強く踏み込み、帽子や装飾が衝撃で跳ねる' },
  { index: 14, slug: 'backward-escape', label: '後ずさり', pose: '視線は相手から外さず、小さな歩幅で必死に後方へ逃げる' },
  { index: 15, slug: 'cheek-shield', label: '頬ガード', pose: '両腕で頬を隠し、次に触れられそうな側へ体を傾ける' },
  { index: 16, slug: 'floor-cling', label: '床にしがみつく', pose: '床へ低く伏せ、両腕と両足でその場から動かされまいと踏ん張る' },
  { index: 17, slug: 'starfish-tantrum', label: '大の字抗議', pose: '床で大の字になり、衣装を広げて子どものように全身で抗議する' },
  { index: 18, slug: 'offended-turnaway', label: '憤慨して背を向ける', pose: '外套を翻して背を向け、肩越しにだけ相手をにらむ' },
  { index: 19, slug: 'tiny-rage-shake', label: '怒り震え', pose: 'その場で小刻みに震え、帽子と全装飾が細かく揺れる' },
  { index: 20, slug: 'ultimate-enough', label: '我慢の限界', pose: '長く保ってきた平静が完全に壊れ、キャラクター固有の最大リアクションを見せる' },
] as const;

export type BlackStarReactionSlot = (typeof BLACK_STAR_REACTION_SLOTS)[number];
export type BlackStarReactionIndex = BlackStarReactionSlot['index'];
export type BlackStarReactionSlug = BlackStarReactionSlot['slug'];

export type BlackStarReactionCatalogEntry = {
  id: `${BlackStarCharacterId}:reaction:${string}`;
  characterId: BlackStarCharacterId;
  enemyId: EnemyId;
  index: BlackStarReactionIndex;
  slug: BlackStarReactionSlug;
  label: string;
  source: ImageSourcePropType;
  referenceSource: ImageSourcePropType;
  usesFallback: boolean;
  expectedAssetPath: string;
  accessibilityLabel: string;
  generationBrief: string;
};

export type BlackStarReactionCatalog = ExactlyTwenty<BlackStarReactionCatalogEntry>;

const BLACK_STAR_REACTION_ASSET_EXTENSIONS: Readonly<Record<EnemyId, 'png' | 'webp'>> = {
  magician: 'png',
  informant: 'webp',
  tracker: 'webp',
  safecracker: 'webp',
  'veiled-duchess': 'webp',
  courier: 'png',
  commander: 'png',
};

// The first generated magician set predates the normalized slot slugs. Keep
// its physical filenames explicit so diagnostics point to the asset Metro
// actually loads instead of reporting a non-existent canonical filename.
const MAGICIAN_PHYSICAL_SLUGS: Partial<Record<BlackStarReactionIndex, string>> = {
  6: 'escape',
  7: 'swatt',
  8: 'stomp',
  9: 'bawling',
  10: 'curl',
  12: 'faint',
  18: 'turnaway',
  19: 'rage-shake',
};

function assertExactlyTwenty<T>(values: readonly T[]): asserts values is ExactlyTwenty<T> {
  if (values.length !== BLACK_STAR_REACTION_COUNT) {
    throw new Error(`Black Star reactions must contain exactly ${BLACK_STAR_REACTION_COUNT} entries.`);
  }
}

function expectedAssetPath(enemyId: EnemyId, slot: BlackStarReactionSlot): string {
  const number = String(slot.index).padStart(2, '0');
  const slug = enemyId === 'magician' ? MAGICIAN_PHYSICAL_SLUGS[slot.index] ?? slot.slug : slot.slug;
  return `assets/black-stars/reactions/${enemyId}/${number}-${slug}.${BLACK_STAR_REACTION_ASSET_EXTENSIONS[enemyId]}`;
}

function generationBrief(profile: BlackStarCharacterProfile, slot: BlackStarReactionSlot): string {
  const specialDirection = slot.index === 8
    ? profile.reactionArtDirection.signatureMotion
    : slot.index === 20
      ? profile.reactionArtDirection.breakingPoint
      : profile.reactionArtDirection.composure;
  return [
    `既存静止画を参照し、黒星「${profile.name}（${profile.reading}）」の全身リアクション画像を生成する。`,
    `リアクション${slot.index}/20「${slot.label}」：${slot.pose}。`,
    `キャラクター固有の演技：${specialDirection}。`,
    `必ず維持する造形：${profile.reactionArtDirection.immutableDetails.join('、')}。`,
    `配色は主色${profile.palette.primary}、副色${profile.palette.secondary}、差し色${profile.palette.accent}。`,
    '元画像と同じ正面寄りのぬいぐるみ造形、単体、透過背景、文字・吹き出し・追加キャラクターなし。',
  ].join(' ');
}

function buildReactionCatalog(profile: BlackStarCharacterProfile): BlackStarReactionCatalog {
  const generatedAssets = BLACK_STAR_GENERATED_REACTION_ASSETS[profile.enemyId];
  const entries = BLACK_STAR_REACTION_SLOTS.map((slot) => {
    const generatedSource = generatedAssets[slot.index - 1];
    const paddedIndex = String(slot.index).padStart(2, '0');
    return {
      id: `${profile.id}:reaction:${paddedIndex}` as const,
      characterId: profile.id,
      enemyId: profile.enemyId,
      index: slot.index,
      slug: slot.slug,
      label: slot.label,
      source: generatedSource ?? profile.image,
      referenceSource: profile.image,
      usesFallback: generatedSource === undefined,
      expectedAssetPath: expectedAssetPath(profile.enemyId, slot),
      accessibilityLabel: `${profile.name}のリアクション${slot.index}、${slot.label}`,
      generationBrief: generationBrief(profile, slot),
    } satisfies BlackStarReactionCatalogEntry;
  });
  assertExactlyTwenty(entries);
  return entries;
}

export const BLACK_STAR_REACTION_CATALOG = Object.fromEntries(
  BLACK_STAR_PROFILES.map((profile) => [profile.enemyId, buildReactionCatalog(profile)]),
) as unknown as Readonly<Record<EnemyId, BlackStarReactionCatalog>>;

export const ALL_BLACK_STAR_REACTIONS: readonly BlackStarReactionCatalogEntry[] =
  BLACK_STAR_PROFILES.flatMap((profile) => BLACK_STAR_REACTION_CATALOG[profile.enemyId]);

if (ALL_BLACK_STAR_REACTIONS.length !== BLACK_STAR_PROFILES.length * BLACK_STAR_REACTION_COUNT) {
  throw new Error('Black Star reaction catalog must contain exactly 140 entries.');
}

export function getBlackStarReactionCatalog(enemyId: EnemyId): BlackStarReactionCatalog {
  return BLACK_STAR_REACTION_CATALOG[enemyId];
}

export function generatedBlackStarReactionCount(enemyId: EnemyId): number {
  return BLACK_STAR_REACTION_CATALOG[enemyId].filter((entry) => !entry.usesFallback).length;
}
