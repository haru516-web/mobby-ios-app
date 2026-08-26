import type { ImageSourcePropType } from 'react-native';

import type { MobbyId } from './mobies';

export type PullFrame = { x: number; y: number; width: number; height: number };
export type PullImageResizeMode = 'contain';

export type MobbyPullAsset = {
  body: ImageSourcePropType;
  eyes: ImageSourcePropType[];
  mouths: ImageSourcePropType[];
  sourceSize: number;
  eyeFrame: PullFrame;
  eyeResizeMode?: PullImageResizeMode;
  mouthFrame: PullFrame;
  defaultEye?: ImageSourcePropType;
  defaultEyeFrame?: PullFrame;
  eyePairs: [number, number][];
  mouthPairs: [number, number][];
};

const sourceSize = 1254;
const eyePairs: [number, number][] = [
  [1, 5],
  [2, 6],
  [3, 7],
  [4, 8],
  [0, 1],
];
const standardMouthPairs: [number, number][] = [
  [0, 1],
  [2, 3],
  [4, 5],
  [6, 7],
  [8, 9],
];
const darkMouthPairs: [number, number][] = [
  [0, 7],
  [2, 9],
  [4, 7],
  [6, 9],
  [8, 7],
];

const mobirinEyes = [
  require('../../assets/mobies/pull/mobirin-eye-1.webp'),
  require('../../assets/mobies/pull/mobirin-eye-2.webp'),
  require('../../assets/mobies/pull/mobirin-eye-3.webp'),
  require('../../assets/mobies/pull/mobirin-eye-4.webp'),
  require('../../assets/mobies/pull/mobirin-eye-5.webp'),
  require('../../assets/mobies/pull/mobirin-eye-6.webp'),
  require('../../assets/mobies/pull/mobirin-eye-7.webp'),
  require('../../assets/mobies/pull/mobirin-eye-8.webp'),
  require('../../assets/mobies/pull/mobirin-eye-9.webp'),
];
const mobichiEyes = [
  require('../../assets/mobies/pull/mobichi-eye-1.webp'),
  require('../../assets/mobies/pull/mobichi-eye-2.webp'),
  require('../../assets/mobies/pull/mobichi-eye-3.webp'),
  require('../../assets/mobies/pull/mobichi-eye-4.webp'),
  require('../../assets/mobies/pull/mobichi-eye-5.webp'),
  require('../../assets/mobies/pull/mobichi-eye-6.webp'),
  require('../../assets/mobies/pull/mobichi-eye-7.webp'),
  require('../../assets/mobies/pull/mobichi-eye-8.webp'),
  require('../../assets/mobies/pull/mobichi-eye-9.webp'),
];
const yamiEyes = [
  require('../../assets/mobies/pull/yami-eye-1.webp'),
  require('../../assets/mobies/pull/yami-eye-2.webp'),
  require('../../assets/mobies/pull/yami-eye-3.webp'),
  require('../../assets/mobies/pull/yami-eye-4.webp'),
  require('../../assets/mobies/pull/yami-eye-5.webp'),
  require('../../assets/mobies/pull/yami-eye-6.webp'),
  require('../../assets/mobies/pull/yami-eye-7.webp'),
  require('../../assets/mobies/pull/yami-eye-8.webp'),
  require('../../assets/mobies/pull/yami-eye-9.webp'),
];
const mobiyanEyes = [
  require('../../assets/mobies/pull/mobiyan-eye-1.webp'),
  require('../../assets/mobies/pull/mobiyan-eye-2.webp'),
  require('../../assets/mobies/pull/mobiyan-eye-3.webp'),
  require('../../assets/mobies/pull/mobiyan-eye-4.webp'),
  require('../../assets/mobies/pull/mobiyan-eye-5.webp'),
  require('../../assets/mobies/pull/mobiyan-eye-6.webp'),
  require('../../assets/mobies/pull/mobiyan-eye-7.webp'),
  require('../../assets/mobies/pull/mobiyan-eye-8.webp'),
  require('../../assets/mobies/pull/mobiyan-eye-9.webp'),
];
const mobiyanDefaultEye = require('../../assets/mobies/pull/mobiyan-eye-default.webp');

const sharedMouths = [
  require('../../assets/mobies/pull/mobiyan-mouth-1.webp'),
  require('../../assets/mobies/pull/mobiyan-mouth-2.webp'),
  require('../../assets/mobies/pull/mobiyan-mouth-3.webp'),
  require('../../assets/mobies/pull/mobiyan-mouth-4.webp'),
  require('../../assets/mobies/pull/mobiyan-mouth-5.webp'),
  require('../../assets/mobies/pull/mobiyan-mouth-6.webp'),
  require('../../assets/mobies/pull/mobiyan-mouth-7.webp'),
  require('../../assets/mobies/pull/mobiyan-mouth-8.webp'),
  require('../../assets/mobies/pull/mobiyan-mouth-9.webp'),
  require('../../assets/mobies/pull/mobiyan-mouth-10.webp'),
];
const mobiyanMixedMouths = [
  require('../../assets/mobies/pull/mobiyan-mouth-original-1.webp'),
  require('../../assets/mobies/pull/mobiyan-mouth-original-2.webp'),
  require('../../assets/mobies/pull/mobiyan-mouth-3.webp'),
  require('../../assets/mobies/pull/mobiyan-mouth-4.webp'),
  require('../../assets/mobies/pull/mobiyan-mouth-5.webp'),
  require('../../assets/mobies/pull/mobiyan-mouth-original-6.webp'),
  require('../../assets/mobies/pull/mobiyan-mouth-original-7.webp'),
  require('../../assets/mobies/pull/mobiyan-mouth-8.webp'),
  require('../../assets/mobies/pull/mobiyan-mouth-9.webp'),
  require('../../assets/mobies/pull/mobiyan-mouth-10.webp'),
];
const yankiMouths = mobiyanMixedMouths.map((mouth, index) => (
  index === 6 ? require('../../assets/mobies/pull/mobiyan-mouth-yanki-7.webp') : mouth
));
const guideMouths = [
  require('../../assets/mobies/pull/guide-mouth-1.webp'),
  require('../../assets/mobies/pull/guide-mouth-2.webp'),
  require('../../assets/mobies/pull/guide-mouth-3.webp'),
  require('../../assets/mobies/pull/guide-mouth-4.webp'),
  require('../../assets/mobies/pull/guide-mouth-5.webp'),
  require('../../assets/mobies/pull/guide-mouth-6.webp'),
  require('../../assets/mobies/pull/guide-mouth-7.webp'),
  require('../../assets/mobies/pull/guide-mouth-8.webp'),
  require('../../assets/mobies/pull/guide-mouth-9.webp'),
  require('../../assets/mobies/pull/guide-mouth-10.webp'),
];

const standardEyeFrame = { x: 295, y: 280, width: 300, height: 270 };
const standardMouthFrame = { x: 490, y: 610, width: 255, height: 120 };

function createAsset({
  body,
  eyes,
  mouths,
  eyeFrame = standardEyeFrame,
  eyeResizeMode,
  mouthFrame = standardMouthFrame,
  defaultEye,
  defaultEyeFrame,
  mouthPairs = standardMouthPairs,
  pairs = eyePairs,
}: {
  body: ImageSourcePropType;
  eyes: ImageSourcePropType[];
  mouths: ImageSourcePropType[];
  eyeFrame?: PullFrame;
  eyeResizeMode?: PullImageResizeMode;
  mouthFrame?: PullFrame;
  defaultEye?: ImageSourcePropType;
  defaultEyeFrame?: PullFrame;
  mouthPairs?: [number, number][];
  pairs?: [number, number][];
}): MobbyPullAsset {
  return {
    body,
    eyes,
    mouths,
    sourceSize,
    eyeFrame,
    eyeResizeMode,
    mouthFrame,
    defaultEye,
    defaultEyeFrame,
    eyePairs: pairs,
    mouthPairs,
  };
}

const assets: Record<MobbyId, MobbyPullAsset> = {
  mobirin: createAsset({
    body: require('../../assets/mobies/pull/mobirin-noneye.webp'),
    eyes: mobirinEyes,
    mouths: sharedMouths,
    eyeFrame: { x: 295, y: 280, width: 300, height: 270 },
  }),
  mobichi: createAsset({
    body: require('../../assets/mobies/pull/mobichi-noneye.webp'),
    eyes: mobichiEyes,
    mouths: sharedMouths,
    eyeFrame: { x: 295, y: 270, width: 300, height: 270 },
    mouthFrame: { x: 560, y: 550, width: 110, height: 72 },
  }),
  yami: createAsset({
    body: require('../../assets/mobies/pull/yami-noneye.webp'),
    eyes: yamiEyes,
    mouths: mobiyanMixedMouths,
    eyeFrame: { x: 250, y: 380, width: 270, height: 180 },
    mouthPairs: standardMouthPairs,
  }),
  mobiyan: createAsset({
    body: require('../../assets/mobies/pull/mobiyan-noneye.webp'),
    eyes: mobiyanEyes,
    mouths: yankiMouths,
    // The generated reaction-eye files use a 400:170 transparent canvas.
    // Match that ratio in the face frame so the eye is never squeezed.
    eyeFrame: { x: 358, y: 498, width: 240, height: 102 },
    eyeResizeMode: 'contain',
    mouthFrame: standardMouthFrame,
    defaultEye: mobiyanDefaultEye,
    defaultEyeFrame: { x: 366, y: 465, width: 227, height: 166 },
    pairs: [[1, 5], [6, 8], [2, 7], [0, 4], [5, 3]],
  }),
  mobiyura: createAsset({
    body: require('../../assets/mobies/pull/yura-noneye.webp'),
    eyes: mobichiEyes,
    mouths: guideMouths,
    eyeFrame: { x: 400, y: 339, width: 195, height: 180 },
    mouthFrame: { x: 558, y: 564, width: 150, height: 75 },
    mouthPairs: darkMouthPairs,
  }),
  reomoby: createAsset({
    body: require('../../assets/mobies/pull/reo-noneye.webp'),
    eyes: mobichiEyes,
    mouths: guideMouths,
    eyeFrame: { x: 348, y: 334, width: 252, height: 222 },
    mouthFrame: { x: 558, y: 539, width: 150, height: 69 },
  }),
  potemoby: createAsset({
    body: require('../../assets/mobies/pull/pote-noneye.webp'),
    eyes: mobirinEyes,
    mouths: guideMouths,
    eyeFrame: { x: 416, y: 311, width: 199, height: 175 },
    mouthFrame: { x: 564, y: 477, width: 150, height: 69 },
  }),
  mobibou: createAsset({
    body: require('../../assets/mobies/pull/mobibou-noneye.webp'),
    eyes: mobirinEyes,
    mouths: guideMouths,
    eyeFrame: { x: 326, y: 327, width: 280, height: 235 },
    mouthFrame: { x: 558, y: 539, width: 150, height: 75 },
    mouthPairs: darkMouthPairs,
  }),
  babumoby: createAsset({
    body: require('../../assets/mobies/pull/babu-noneye.webp'),
    eyes: mobichiEyes,
    mouths: guideMouths,
    eyeFrame: { x: 379, y: 396, width: 227, height: 213 },
    mouthFrame: { x: 558, y: 577, width: 150, height: 69 },
  }),
};

export const PULL_ASSETS = assets;
