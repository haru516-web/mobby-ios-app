import type { EpisodeAssetRegistry, EpisodeData, Scene } from '@/data/episodes/types';

export type EpisodeValidationError = { code: string; path: string; message: string };

const isNonEmptyId = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isFinitePositive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

function sceneDestinations(scene: Scene): readonly string[] {
  if (scene.interaction?.kind === 'choice') {
    return Array.isArray(scene.interaction.options)
      ? scene.interaction.options.map((option) => option?.nextSceneId).filter((id): id is string => typeof id === 'string')
      : [];
  }
  return typeof scene.nextSceneId === 'string' ? [scene.nextSceneId] : [];
}

export function validateEpisode(episode: EpisodeData, assets?: EpisodeAssetRegistry): EpisodeValidationError[] {
  const errors: EpisodeValidationError[] = [];
  const add = (code: string, path: string, message: string) => errors.push({ code, path, message });
  const sceneIds = new Set<string>();
  const sceneById = new Map<string, Scene>();
  const sceneIndexById = new Map<string, number>();
  const interactionIds = new Set<string>();

  if (!isNonEmptyId(episode.id)) add('empty-id', 'id', 'Episode id must not be empty.');
  if (episode.version !== 2) add('invalid-version', 'version', 'Episode schema version must be 2.');
  if (!Number.isInteger(episode.contentVersion) || episode.contentVersion < 1) add('invalid-content-version', 'contentVersion', 'Content version must be a positive integer.');
  if (!isNonEmptyId(episode.entrySceneId)) add('empty-id', 'entrySceneId', 'Entry scene id must not be empty.');
  if (!Array.isArray(episode.scenes) || !episode.scenes.length) add('empty-scenes', 'scenes', 'At least one scene is required.');

  episode.scenes.forEach((scene, index) => {
    const path = `scenes[${index}]`;
    if (!isNonEmptyId(scene.id)) add('empty-id', `${path}.id`, 'Scene id must not be empty.');
    else {
      if (sceneIds.has(scene.id)) add('duplicate-scene', `${path}.id`, `Duplicate scene id: ${scene.id}`);
      else {
        sceneIds.add(scene.id);
        sceneById.set(scene.id, scene);
        sceneIndexById.set(scene.id, index);
      }
    }
    if (!isNonEmptyId(scene.backgroundAssetId)) add('empty-id', `${path}.backgroundAssetId`, 'Background asset id must not be empty.');
    else if (assets && !assets[scene.backgroundAssetId]) add('missing-asset', `${path}.backgroundAssetId`, `Unknown asset: ${scene.backgroundAssetId}`);
    if (!Array.isArray(scene.lines) || !scene.lines.length) add('empty-lines', `${path}.lines`, 'At least one line is required.');
    const lineIds = new Set<string>();
    scene.lines.forEach((line, lineIndex) => {
      const linePath = `${path}.lines[${lineIndex}].id`;
      if (!isNonEmptyId(line.id)) add('empty-id', linePath, 'Line id must not be empty.');
      else if (lineIds.has(line.id)) add('duplicate-line', linePath, `Duplicate line id in scene: ${line.id}`);
      else lineIds.add(line.id);
    });
    const actorIds = new Set<string>();
    scene.actors?.forEach((actor, actorIndex) => {
      const actorPath = `${path}.actors[${actorIndex}]`;
      if (!isNonEmptyId(actor.id)) add('empty-id', `${actorPath}.id`, 'Actor id must not be empty.');
      else if (actorIds.has(actor.id)) add('duplicate-actor', `${actorPath}.id`, `Duplicate actor id in scene: ${actor.id}`);
      else actorIds.add(actor.id);
      if (!isNonEmptyId(actor.assetId)) add('empty-id', `${actorPath}.assetId`, 'Actor asset id must not be empty.');
      else if (assets && !assets[actor.assetId]) add('missing-asset', `${actorPath}.assetId`, `Unknown asset: ${actor.assetId}`);
      if (actor.scale !== undefined && !isFinitePositive(actor.scale)) add('invalid-scale', `${actorPath}.scale`, 'Actor scale must be finite and positive.');
    });

    const interactiveKinds = ['tap', 'swipe', 'hold', 'choice'];
    if (interactiveKinds.includes(scene.kind) && scene.interaction?.kind !== scene.kind) add('interaction-kind', `${path}.interaction`, `${scene.kind} scene requires a matching interaction.`);
    if (!interactiveKinds.includes(scene.kind) && scene.interaction) add('unexpected-interaction', `${path}.interaction`, `${scene.kind} scene must not have an interaction.`);
    if (scene.interaction) {
      const interaction = scene.interaction;
      if (!isNonEmptyId(interaction.id)) add('empty-id', `${path}.interaction.id`, 'Interaction id must not be empty.');
      else if (interactionIds.has(interaction.id)) add('duplicate-interaction', `${path}.interaction.id`, `Duplicate interaction id: ${interaction.id}`);
      else interactionIds.add(interaction.id);
      if (interaction.kind === 'tap') {
        if (!isNonEmptyId(interaction.targetId)) add('empty-id', `${path}.interaction.targetId`, 'Tap target id must not be empty.');
        if (interaction.requiredTaps !== undefined && (!Number.isInteger(interaction.requiredTaps) || interaction.requiredTaps < 1)) add('invalid-required-taps', `${path}.interaction.requiredTaps`, 'Required taps must be an integer of at least 1.');
      }
      if (interaction.kind === 'swipe' && interaction.threshold !== undefined && !isFinitePositive(interaction.threshold)) add('invalid-threshold', `${path}.interaction.threshold`, 'Swipe threshold must be finite and positive.');
      if (interaction.kind === 'hold' && !isFinitePositive(interaction.durationMs)) add('invalid-duration', `${path}.interaction.durationMs`, 'Hold duration must be finite and positive.');
      if (interaction.kind === 'choice') {
        if (scene.nextSceneId !== undefined) add('choice-next', `${path}.nextSceneId`, 'Choice navigation belongs on options.');
        const options = interaction.options;
        if (!Array.isArray(options) || options.length !== 2) add('choice-option-count', `${path}.interaction.options`, 'Choice must contain exactly two options.');
        const optionIds = new Set<string>();
        options?.forEach((option, optionIndex) => {
          const optionPath = `${path}.interaction.options[${optionIndex}]`;
          if (!isNonEmptyId(option?.id)) add('empty-id', `${optionPath}.id`, 'Choice option id must not be empty.');
          else if (optionIds.has(option.id)) add('duplicate-option', `${optionPath}.id`, `Duplicate choice option id: ${option.id}`);
          else optionIds.add(option.id);
          if (!isNonEmptyId(option?.nextSceneId)) add('empty-id', `${optionPath}.nextSceneId`, 'Choice destination id must not be empty.');
        });
        if (options?.length === 2 && options[0]?.nextSceneId === options[1]?.nextSceneId) add('identical-choice-destination', `${path}.interaction.options`, 'Choice options must lead to different scenes.');
      }
    }
    if (scene.kind === 'after-credits' && sceneDestinations(scene).length > 0) add('after-credits-transition', path, 'After-credits must be terminal.');
  });

  if (!sceneById.has(episode.entrySceneId)) add('missing-entry', 'entrySceneId', `Unknown entry scene: ${episode.entrySceneId}`);
  const terminals = episode.scenes.filter((scene) => scene.kind === 'after-credits' && sceneById.get(scene.id) === scene);
  if (!terminals.length) add('missing-terminal', 'scenes', 'At least one after-credits terminal is required.');

  const edges = new Map<string, string[]>();
  const reverseEdges = new Map<string, string[]>();
  sceneById.forEach((scene, id) => {
    const index = sceneIndexById.get(id) ?? 0;
    const nextIds = sceneDestinations(scene);
    edges.set(id, [...nextIds]);
    nextIds.forEach((destination) => {
      if (!sceneById.has(destination)) add('broken-link', `scenes[${index}]`, `Unknown next scene: ${destination}`);
      else reverseEdges.set(destination, [...(reverseEdges.get(destination) ?? []), id]);
    });
    if (scene.kind !== 'after-credits' && nextIds.length === 0) add('dead-end', `scenes[${index}]`, 'Only after-credits may end the episode.');
  });

  const reachable = new Set<string>();
  const queue = sceneById.has(episode.entrySceneId) ? [episode.entrySceneId] : [];
  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    if (reachable.has(id)) continue;
    reachable.add(id);
    (edges.get(id) ?? []).forEach((nextId) => { if (sceneById.has(nextId) && !reachable.has(nextId)) queue.push(nextId); });
  }
  sceneById.forEach((_scene, id) => {
    if (!reachable.has(id)) add('unreachable', `scenes[${sceneIndexById.get(id) ?? 0}].id`, `Unreachable scene: ${id}`);
  });

  const canReachTerminal = new Set<string>();
  const terminalQueue = terminals.map((scene) => scene.id);
  for (let index = 0; index < terminalQueue.length; index += 1) {
    const id = terminalQueue[index];
    if (canReachTerminal.has(id)) continue;
    canReachTerminal.add(id);
    (reverseEdges.get(id) ?? []).forEach((previousId) => { if (!canReachTerminal.has(previousId)) terminalQueue.push(previousId); });
  }
  sceneById.forEach((_scene, id) => {
    if (!canReachTerminal.has(id)) add('terminal-unreachable', `scenes[${sceneIndexById.get(id) ?? 0}].id`, `Scene cannot reach after-credits: ${id}`);
  });

  const color = new Map<string, 0 | 1 | 2>();
  const cycleEdges = new Set<string>();
  const visit = (id: string) => {
    color.set(id, 1);
    (edges.get(id) ?? []).forEach((nextId) => {
      if (!sceneById.has(nextId)) return;
      if (color.get(nextId) === 1) {
        const edge = `${id}->${nextId}`;
        if (!cycleEdges.has(edge)) {
          cycleEdges.add(edge);
          add('cycle', `scenes[${sceneIndexById.get(id) ?? 0}]`, `Cycle detected: ${edge}`);
        }
      } else if (!color.get(nextId)) visit(nextId);
    });
    color.set(id, 2);
  };
  sceneById.forEach((_scene, id) => { if (!color.get(id)) visit(id); });

  return errors;
}

export const isValidEpisode = (episode: EpisodeData, assets?: EpisodeAssetRegistry) => validateEpisode(episode, assets).length === 0;
