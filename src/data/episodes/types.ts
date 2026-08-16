import type { ImageSourcePropType } from 'react-native';

import type { EnemyId } from '@/data/enemyCases';
import type { MobbyId } from '@/data/mobies';

export type EpisodeId = `episode-${number}`;
export type SceneId = string;
export type AssetId = string;
export type SceneKind = 'cutscene' | 'tap' | 'swipe' | 'hold' | 'choice' | 'key-visual' | 'after-credits';
export type ActorSide = 'left' | 'center' | 'right';
export type Cue = 'vibrate-light' | 'vibrate-heavy' | 'zoom-in' | 'zoom-out' | 'transition-fade' | 'transition-flash';

export type Actor = {
  id: string;
  name: string;
  assetId: AssetId;
  side: ActorSide;
  scale?: number;
  mirrored?: boolean;
};

export type Line = {
  id: string;
  speaker: string;
  text: string;
  cue?: Cue;
};

type InteractionBase = { id: string; prompt: string; successText: string; cue?: Cue };
export type TapInteraction = InteractionBase & { kind: 'tap'; targetId: string; requiredTaps?: number };
export type SwipeInteraction = InteractionBase & { kind: 'swipe'; direction: 'left' | 'right' | 'up' | 'down'; threshold?: number };
export type HoldInteraction = InteractionBase & { kind: 'hold'; durationMs: number };
export type ChoiceInteraction = InteractionBase & {
  kind: 'choice';
  options: readonly [
    { id: string; label: string; nextSceneId: SceneId },
    { id: string; label: string; nextSceneId: SceneId },
  ];
};
export type Interaction = TapInteraction | SwipeInteraction | HoldInteraction | ChoiceInteraction;

export type Scene = {
  id: SceneId;
  kind: SceneKind;
  title?: string;
  backgroundAssetId: AssetId;
  actors?: readonly Actor[];
  /** Text/emoji composition used when dedicated episode art is unavailable. */
  visualOverlay?: { text: string; accessibilityLabel: string };
  lines: readonly Line[];
  interaction?: Interaction;
  nextSceneId?: SceneId;
  cues?: readonly Cue[];
};

export type EpisodeData = {
  id: EpisodeId;
  version: 2;
  /** Increment when saved playback state is no longer compatible with the episode content. */
  contentVersion: number;
  chapter: string;
  title: string;
  synopsis: string;
  enemyId: EnemyId;
  featuredMobbyId: MobbyId;
  entrySceneId: SceneId;
  scenes: readonly Scene[];
  credits: readonly string[];
};

export type PlaybackState = {
  episodeId: EpisodeId;
  contentVersion: number;
  sceneId: SceneId;
  lineIndex: number;
  completedInteractionIds: readonly string[];
  interactionProgress: Readonly<Record<string, number>>;
  choices: Readonly<Record<string, string>>;
  visitedSceneIds: readonly SceneId[];
};

export type CompletionResult = {
  episodeId: EpisodeId;
  contentVersion: number;
  completedAt: string;
  finalState: PlaybackState;
  enemyId: EnemyId;
  featuredMobbyId: MobbyId;
};

export type EpisodeAsset = { source: ImageSourcePropType; accessibilityLabel: string };
export type EpisodeAssetRegistry = Readonly<Record<AssetId, EpisodeAsset | undefined>>;
