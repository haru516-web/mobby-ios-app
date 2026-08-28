import type { ImageSourcePropType } from 'react-native';

import { PULL_ASSETS, type MobbyPullAsset, type PullFrame } from './mobbyPullAssets';
import type { EnemyId } from './enemies';

/**
 * Black-star pull assets deliberately use the same expression contract as
 * regular mobies.  The base image is kept separate from the face layers so a
 * generated featureless base can be swapped in without changing interaction
 * code. Every enemy id is required to have a generated base below.
 */
export type BlackStarPullAsset = MobbyPullAsset & { featurelessBase: boolean };

// The generated face parts were authored on a full 1254px canvas.  The
// interaction layer places a part inside a face frame, so using that canvas
// directly made the visible eye/mouth shrink to a tiny mark.  These cropped
// render assets keep the generated fur edge while making the visible feature
// occupy the frame at the intended size.
const blackStarEye = require('../../assets/black-stars/pull/blackstar-eye-serious-cropped.png');
const blackStarMouth = require('../../assets/black-stars/pull/blackstar-mouth-surprised-cropped.png');
// Keep the generated black-star parts as the neutral state, then reuse the
// proven directional expression variants for the remaining pull strengths.
const sharedEyes = [blackStarEye, ...PULL_ASSETS.mobiyan.eyes.slice(1)];
const sharedMouths = [blackStarMouth, ...PULL_ASSETS.mobiyan.mouths.slice(1)];
const sharedEyePairs = PULL_ASSETS.mobiyan.eyePairs;
const sharedMouthPairs = PULL_ASSETS.mobiyan.mouthPairs;

// The generated black-star base keeps each character's fixed mechanical lens.
// The expression layer occupies the organic eye area beside it.  These are
// deliberately per-character: the seven costumes place the fixed lens at
// different heights, and one shared frame visibly drifted on the cap, hat,
// and cloak silhouettes.
const faceFrames: Record<EnemyId, PullFrame> = {
  magician: { x: 365, y: 375, width: 220, height: 140 },
  informant: { x: 446, y: 402, width: 180, height: 115 },
  tracker: { x: 410, y: 414, width: 190, height: 121 },
  safecracker: { x: 410, y: 345, width: 220, height: 140 },
  'veiled-duchess': { x: 420, y: 384, width: 190, height: 121 },
  courier: { x: 370, y: 405, width: 220, height: 140 },
  commander: { x: 410, y: 415, width: 210, height: 134 },
};
const mouthFrames: Record<EnemyId, PullFrame> = {
  magician: { x: 520, y: 545, width: 180, height: 108 },
  informant: { x: 520, y: 545, width: 180, height: 108 },
  tracker: { x: 520, y: 545, width: 180, height: 108 },
  safecracker: { x: 520, y: 545, width: 180, height: 108 },
  'veiled-duchess': { x: 520, y: 545, width: 180, height: 108 },
  courier: { x: 520, y: 545, width: 180, height: 108 },
  commander: { x: 520, y: 545, width: 180, height: 108 },
};

const generatedFeaturelessBases = {
  magician: require('../../assets/black-stars/pull/magician-noneye.png'),
  informant: require('../../assets/black-stars/pull/informant-noneye.png'),
  tracker: require('../../assets/black-stars/pull/tracker-noneye.png'),
  safecracker: require('../../assets/black-stars/pull/safecracker-noneye.png'),
  'veiled-duchess': require('../../assets/black-stars/pull/veiled-duchess-noneye.png'),
  courier: require('../../assets/black-stars/pull/courier-noneye.png'),
  commander: require('../../assets/black-stars/pull/commander-noneye.png'),
} satisfies Record<EnemyId, ImageSourcePropType>;

function fallback(enemyId: EnemyId, image: ImageSourcePropType): BlackStarPullAsset {
  return {
    body: image,
    eyes: sharedEyes,
    mouths: sharedMouths,
    sourceSize: 1254,
    eyeFrame: faceFrames[enemyId],
    eyeResizeMode: 'contain',
    mouthFrame: mouthFrames[enemyId],
    eyePairs: sharedEyePairs,
    mouthPairs: sharedMouthPairs,
    featurelessBase: false,
  };
}

/** All seven black-star profiles use their generated featureless bases. */
export function getBlackStarPullAsset(enemyId: EnemyId, image: ImageSourcePropType): BlackStarPullAsset {
  const generatedBase = generatedFeaturelessBases[enemyId];
  return { ...fallback(enemyId, generatedBase), featurelessBase: true };
}
