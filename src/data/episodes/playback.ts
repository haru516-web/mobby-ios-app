import type { EpisodeData, PlaybackState, Scene } from './types';

export type MutableGate = { current: boolean };

export function claimGate(gate: MutableGate): boolean {
  if (gate.current) return false;
  gate.current = true;
  return true;
}

export function shouldAnimateEpisodeTransition(reduceMotion: boolean): boolean {
  return !reduceMotion;
}

export function createInitialPlaybackState(episode: EpisodeData): PlaybackState {
  return {
    episodeId: episode.id,
    contentVersion: episode.contentVersion,
    sceneId: episode.entrySceneId,
    lineIndex: 0,
    completedInteractionIds: [],
    interactionProgress: {},
    choices: {},
    visitedSceneIds: [episode.entrySceneId],
  };
}

const finiteInteger = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : fallback;

const uniqueStrings = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0))];
};

/**
 * Converts untrusted or stale persisted data into a state valid for the supplied
 * episode. A mismatched episode/content version always starts from the entry.
 */
export function normalizePlaybackState(
  episode: EpisodeData,
  input?: Partial<PlaybackState> | null,
): PlaybackState {
  const fresh = createInitialPlaybackState(episode);
  if (!input || input.episodeId !== episode.id || input.contentVersion !== episode.contentVersion) return fresh;

  const sceneById = new Map(episode.scenes.map((scene) => [scene.id, scene]));
  const interactionById = new Map(
    episode.scenes.flatMap((scene) => scene.interaction ? [[scene.interaction.id, scene.interaction] as const] : []),
  );
  const validSceneIds = new Set(sceneById.keys());
  const choices: Record<string, string> = {};
  const completed = new Set(uniqueStrings(input.completedInteractionIds).filter((id) => interactionById.has(id)));
  const interactionProgress: Record<string, number> = {};

  for (const [interactionId, interaction] of interactionById) {
    if (interaction.kind === 'choice') {
      const savedOptionId = input.choices?.[interactionId];
      if (typeof savedOptionId === 'string' && interaction.options.some((option) => option.id === savedOptionId)) choices[interactionId] = savedOptionId;
      else completed.delete(interactionId);
      continue;
    }
    if (interaction.kind !== 'tap') continue;
    const requiredTaps = interaction.requiredTaps ?? 1;
    const savedCount = Math.max(0, finiteInteger(input.interactionProgress?.[interactionId]));
    const count = Math.min(requiredTaps, savedCount);
    if (completed.has(interactionId)) interactionProgress[interactionId] = requiredTaps;
    else if (count >= requiredTaps) {
      interactionProgress[interactionId] = requiredTaps;
      completed.add(interactionId);
    } else if (count > 0) interactionProgress[interactionId] = count;
  }

  let sceneId = typeof input.sceneId === 'string' && validSceneIds.has(input.sceneId)
    ? input.sceneId
    : episode.entrySceneId;
  const visited = uniqueStrings(input.visitedSceneIds).filter((id) => validSceneIds.has(id));
  if (!visited.includes(sceneId)) visited.push(sceneId);

  // A persisted choice can be captured between marking the interaction complete
  // and navigating. Resume atomically at its selected destination.
  const normalizedChoiceScenes = new Set<string>();
  while (!normalizedChoiceScenes.has(sceneId)) {
    normalizedChoiceScenes.add(sceneId);
    const scene = sceneById.get(sceneId);
    if (scene?.interaction?.kind !== 'choice' || !completed.has(scene.interaction.id)) break;
    const optionId = choices[scene.interaction.id];
    const option = scene.interaction.options.find((candidate) => candidate.id === optionId);
    if (!option || !sceneById.has(option.nextSceneId)) break;
    sceneId = option.nextSceneId;
    if (!visited.includes(sceneId)) visited.push(sceneId);
  }

  const scene = sceneById.get(sceneId);
  const maxLineIndex = Math.max(0, (scene?.lines.length ?? 1) - 1);
  const lineIndex = Math.min(maxLineIndex, Math.max(0, finiteInteger(input.lineIndex)));

  return {
    episodeId: episode.id,
    contentVersion: episode.contentVersion,
    sceneId,
    lineIndex,
    completedInteractionIds: [...completed],
    interactionProgress,
    choices,
    visitedSceneIds: visited.length ? visited : [sceneId],
  };
}

export type EpisodeProgress = { current: number; total: number };

const destinations = (scene: Scene): readonly string[] =>
  scene.interaction?.kind === 'choice'
    ? scene.interaction.options.map((option) => option.nextSceneId)
    : scene.nextSceneId ? [scene.nextSceneId] : [];

/** Returns route depth, so mutually exclusive branches share the same step. */
export function getEpisodeProgress(episode: EpisodeData, sceneId: string): EpisodeProgress {
  const sceneById = new Map(episode.scenes.map((scene) => [scene.id, scene]));
  const depth = new Map<string, number>([[episode.entrySceneId, 1]]);
  const queue = [episode.entrySceneId];
  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    const scene = sceneById.get(id);
    if (!scene) continue;
    const nextDepth = (depth.get(id) ?? 0) + 1;
    destinations(scene).forEach((nextId) => {
      const previous = depth.get(nextId);
      if (previous === undefined || nextDepth < previous) {
        depth.set(nextId, nextDepth);
        queue.push(nextId);
      }
    });
  }
  const terminalDepths = episode.scenes
    .filter((scene) => scene.kind === 'after-credits')
    .map((scene) => depth.get(scene.id) ?? 0);
  const total = Math.max(1, ...terminalDepths, ...depth.values());
  return { current: Math.min(total, depth.get(sceneId) ?? 1), total };
}
