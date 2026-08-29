import type { ImageSourcePropType } from 'react-native';

import { PULL_ASSETS, type MobbyPullAsset, type PullFrame } from './mobbyPullAssets';
import type { EnemyId } from './enemies';

/**
 * Black-star pull assets deliberately use the same expression contract as
 * regular mobies.  The base image is kept separate from the face layers so a
 * generated featureless base can be swapped in without changing interaction
 * code. Every enemy id is required to have a generated base below.
 */
export type BlackStarPullAsset = MobbyPullAsset & {
  featurelessBase: boolean;
  fixedAccessoryParts?: BlackStarFixedAccessoryParts;
};

export type BlackStarFixedAccessoryParts = {
  lens: ImageSourcePropType;
  cross: ImageSourcePropType;
  buttonLeft: ImageSourcePropType;
  buttonRight: ImageSourcePropType;
};

// Keep memoized pull assets in sync when a fixed facial frame is adjusted.
export const BLACK_STAR_PULL_LAYOUT_VERSION = 3;

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

// The generated black-star body keeps the deformable costume pixels, while
// the fixed mechanical hardware is extracted into a sibling layer. The
// expression layer occupies the organic eye area beside it. These are
// deliberately per-character: the seven costumes place the fixed lens at
// different heights, and one shared frame visibly drifted on the cap, hat,
// and cloak silhouettes.
const faceFrames: Record<EnemyId, PullFrame> = {
  magician: { x: 365, y: 435, width: 220, height: 140 },
  informant: { x: 446, y: 462, width: 180, height: 115 },
  tracker: { x: 410, y: 474, width: 190, height: 121 },
  safecracker: { x: 410, y: 405, width: 220, height: 140 },
  'veiled-duchess': { x: 420, y: 444, width: 190, height: 121 },
  courier: { x: 370, y: 465, width: 220, height: 140 },
  commander: { x: 410, y: 475, width: 210, height: 134 },
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

// These are filled body images: the accessory regions stay opaque and are
// covered by the independent fixed-part images during a pull.
const generatedFeaturelessBases = {
  magician: require('../../assets/black-stars/pull/magician-body-clean.png'),
  informant: require('../../assets/black-stars/pull/informant-body-clean.png'),
  tracker: require('../../assets/black-stars/pull/tracker-body-clean.png'),
  safecracker: require('../../assets/black-stars/pull/safecracker-body-clean.png'),
  'veiled-duchess': require('../../assets/black-stars/pull/veiled-duchess-body-clean.png'),
  courier: require('../../assets/black-stars/pull/courier-body-clean.png'),
  commander: require('../../assets/black-stars/pull/commander-body-clean.png'),
} satisfies Record<EnemyId, ImageSourcePropType>;

const fixedAccessoryParts = {
  magician: {
    lens: require('../../assets/black-stars/pull/magician-lens.webp'),
    cross: require('../../assets/black-stars/pull/magician-cross.webp'),
    buttonLeft: require('../../assets/black-stars/pull/magician-button-left.webp'),
    buttonRight: require('../../assets/black-stars/pull/magician-button-right.webp'),
  },
  informant: {
    lens: require('../../assets/black-stars/pull/informant-lens.webp'),
    cross: require('../../assets/black-stars/pull/informant-cross.webp'),
    buttonLeft: require('../../assets/black-stars/pull/informant-button-left.webp'),
    buttonRight: require('../../assets/black-stars/pull/informant-button-right.webp'),
  },
  tracker: {
    lens: require('../../assets/black-stars/pull/tracker-lens.webp'),
    cross: require('../../assets/black-stars/pull/tracker-cross.webp'),
    buttonLeft: require('../../assets/black-stars/pull/tracker-button-left.webp'),
    buttonRight: require('../../assets/black-stars/pull/tracker-button-right.webp'),
  },
  safecracker: {
    lens: require('../../assets/black-stars/pull/safecracker-lens.webp'),
    cross: require('../../assets/black-stars/pull/safecracker-cross.webp'),
    buttonLeft: require('../../assets/black-stars/pull/safecracker-button-left.webp'),
    buttonRight: require('../../assets/black-stars/pull/safecracker-button-right.webp'),
  },
  'veiled-duchess': {
    lens: require('../../assets/black-stars/pull/veiled-duchess-lens.webp'),
    cross: require('../../assets/black-stars/pull/veiled-duchess-cross.webp'),
    buttonLeft: require('../../assets/black-stars/pull/veiled-duchess-button-left.webp'),
    buttonRight: require('../../assets/black-stars/pull/veiled-duchess-button-right.webp'),
  },
  courier: {
    lens: require('../../assets/black-stars/pull/courier-lens.webp'),
    cross: require('../../assets/black-stars/pull/courier-cross.webp'),
    buttonLeft: require('../../assets/black-stars/pull/courier-button-left.webp'),
    buttonRight: require('../../assets/black-stars/pull/courier-button-right.webp'),
  },
  commander: {
    lens: require('../../assets/black-stars/pull/commander-lens.webp'),
    cross: require('../../assets/black-stars/pull/commander-cross.webp'),
    buttonLeft: require('../../assets/black-stars/pull/commander-button-left.webp'),
    buttonRight: require('../../assets/black-stars/pull/commander-button-right.webp'),
  },
} satisfies Record<EnemyId, BlackStarFixedAccessoryParts>;

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
  return {
    ...fallback(enemyId, generatedBase),
    featurelessBase: true,
    fixedAccessoryParts: fixedAccessoryParts[enemyId],
  };
}
