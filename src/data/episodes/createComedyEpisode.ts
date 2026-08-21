import type { AssetId, EpisodeData, EpisodeId, Line, Scene } from './types';
import type { EnemyId } from '@/data/enemies';
import type { MobbyId } from '@/data/mobies';

export type ComedyEpisodeCopy = {
  episode: number; title: string; synopsis: string; enemyId: EnemyId; mobbyId: MobbyId; cast: string; relationship: string;
  crime: readonly [string, string][]; search: readonly [string, string, string, string]; lair: readonly [string, string][];
  actions: readonly [string, string, string, string, string, string]; reversal: readonly [string, string][]; choicePrompt: string;
  endings: readonly [{ label: string; title: string; lines: readonly [string, string][] }, { label: string; title: string; lines: readonly [string, string][] }];
  relationshipLines: readonly [string, string][]; key: readonly [string, string, string, string]; after: readonly [string, string];
  /** Optional episode-specific art used to give the shared story structure a distinct stage. */
  sceneAssets?: {
    opening?: AssetId;
    search?: AssetId;
    lair?: AssetId;
    action?: AssetId;
    reversal?: AssetId;
    choice?: AssetId;
    endingA?: AssetId;
    endingB?: AssetId;
    relationship?: AssetId;
    keyVisual?: AssetId;
    afterCredits?: AssetId;
  };
  /** Optional episode-specific scene headings; copy remains the source of truth for dialogue. */
  sceneTitles?: {
    searchOne?: string;
    searchTwo?: string;
    lair?: string;
    actionOne?: string;
    actionTwo?: string;
    actionThree?: string;
    reversal?: string;
    choice?: string;
  };
  outcomeCaption?: string;
};

export function createComedyEpisode(c: ComedyEpisodeCopy): EpisodeData {
  const p = `ep${String(c.episode).padStart(2, '0')}`;
  const id = (s: string) => `${p}-${s}`;
  const ls = (s: string, rows: readonly [string, string][]): readonly Line[] => rows.map(([speaker, text], i) => ({ id: id(`${s}-line-${i + 1}`), speaker, text }));
  const mobbyName = c.cast.split('／')[0] ?? c.cast;
  const enemyName = c.cast.split('／')[1] ?? c.cast;
  const assets = c.sceneAssets ?? {};
  const titles = c.sceneTitles ?? {};
  const scenes: Scene[] = [
    { id: id('01-crime'), kind: 'cutscene', title: '鮮やかな出会い', backgroundAssetId: assets.opening ?? 'bg-mansion', visualOverlay: { text: '🌙 ✦', accessibilityLabel: '月夜に始まる出会い' }, lines: ls('01', c.crime), nextSceneId: id('02-search-one'), cues: ['transition-flash'] },
    { id: id('02-search-one'), kind: 'cutscene', title: titles.searchOne ?? '持ち出しの途中', backgroundAssetId: assets.search ?? 'bg-corridor', lines: ls('02', [[enemyName, c.search[0]], [mobbyName, c.search[1]], ['ナレーション', `${mobbyName}の関係ない一言で、出口がひとつ遠のいた。`]]), nextSceneId: id('03-search-two'), cues: ['zoom-in'] },
    { id: id('03-search-two'), kind: 'cutscene', title: titles.searchTwo ?? '出口が遠のく', backgroundAssetId: assets.search ?? 'bg-service', lines: ls('03', [[enemyName, c.search[2]], [mobbyName, c.search[3]], ['ナレーション', `${enemyName}は持ち出したものを抱えたまま、また別の用事に巻き込まれた。`]]), nextSceneId: id('04-lair'), cues: ['vibrate-light'] },
    { id: id('04-lair'), kind: 'cutscene', title: titles.lair ?? 'ふたりの舞台裏', backgroundAssetId: assets.lair ?? 'bg-service', visualOverlay: { text: '🎭 ⚙️', accessibilityLabel: 'ふたりが小道具を広げた舞台裏' }, lines: ls('04', c.lair), nextSceneId: id('05-swipe') },
    { id: id('05-swipe'), kind: 'cutscene', title: titles.actionOne ?? '息を合わせる 1/3', backgroundAssetId: assets.action ?? 'bg-confrontation', lines: ls('05', [[mobbyName, c.actions[0]], [enemyName, c.actions[1]], ['ナレーション', `${mobbyName}の勢いで、ふたりの計画は予定より派手に動き出した。`]]), nextSceneId: id('06-hold'), cues: ['vibrate-light'] },
    { id: id('06-hold'), kind: 'cutscene', title: titles.actionTwo ?? '息を合わせる 2/3', backgroundAssetId: assets.action ?? 'bg-confrontation', lines: ls('06', [[mobbyName, c.actions[2]], [enemyName, c.actions[3]], ['ナレーション', `${enemyName}は帰る理由を思い出すたび、別の用事に巻き込まれていった。`]]), nextSceneId: id('07-tap'), cues: ['vibrate-heavy'] },
    { id: id('07-tap'), kind: 'cutscene', title: titles.actionThree ?? '息を合わせる 3/3', backgroundAssetId: assets.action ?? 'bg-evidence', lines: ls('07', [[mobbyName, c.actions[4]], [enemyName, c.actions[5]], ['ナレーション', `${mobbyName}のひと手間で、脱出計画はまた予定外の方向へ進んだ。`]]), nextSceneId: id('08-reversal'), cues: ['transition-flash'] },
    { id: id('08-reversal'), kind: 'cutscene', title: titles.reversal ?? '後半逆転', backgroundAssetId: assets.reversal ?? 'bg-confrontation', visualOverlay: { text: '！？ ↩️', accessibilityLabel: '計画が逆転する瞬間' }, lines: ls('08', c.reversal), nextSceneId: id('09-choice') },
    { id: id('09-choice'), kind: 'choice', title: titles.choice ?? 'ふたりらしい二択', backgroundAssetId: assets.choice ?? 'bg-service', lines: ls('09', [[c.cast, c.choicePrompt]]), interaction: { id: id('choice'), kind: 'choice', prompt: 'どちらのオチにする？', successText: '決定！', options: [{ id: id('option-a'), label: c.endings[0].label, nextSceneId: id('10a-ending') }, { id: id('option-b'), label: c.endings[1].label, nextSceneId: id('10b-ending') }] } },
    { id: id('10a-ending'), kind: 'cutscene', title: `ENDING A：${c.endings[0].title}`, backgroundAssetId: assets.endingA ?? 'bg-corridor', lines: ls('10a', c.endings[0].lines), nextSceneId: id('11-relationship') },
    { id: id('10b-ending'), kind: 'cutscene', title: `ENDING B：${c.endings[1].title}`, backgroundAssetId: assets.endingB ?? 'bg-mansion', lines: ls('10b', c.endings[1].lines), nextSceneId: id('11-relationship') },
    { id: id('11-relationship'), kind: 'cutscene', title: c.relationship, backgroundAssetId: assets.relationship ?? 'bg-relationship', lines: ls('11', c.relationshipLines), nextSceneId: id('12-key-visual') },
    { id: id('12-key-visual'), kind: 'key-visual', title: c.key[0], backgroundAssetId: assets.keyVisual ?? 'bg-relationship', visualOverlay: { text: c.key[1], accessibilityLabel: c.key[2] }, lines: ls('12', [['ナレーション', c.key[3]]]), nextSceneId: id('13-after-credits'), cues: ['transition-fade'] },
    { id: id('13-after-credits'), kind: 'after-credits', title: 'AFTER CREDITS', backgroundAssetId: assets.afterCredits ?? assets.keyVisual ?? 'bg-relationship', visualOverlay: { text: c.after[0], accessibilityLabel: 'ふたりのお話の舞台裏' }, lines: ls('13', [['ナレーション', `ふたりのその後：${c.after[1]}`], ['ナレーション', `第${c.episode}話 完`]]) },
  ];
  for (const [index, scene] of scenes.entries()) {
    const reactionVariant = scene.kind === 'choice' || scene.kind === 'key-visual' || scene.kind === 'after-credits'
      ? 'joy'
      : index % 3 === 2
        ? 'sulk'
        : 'startled';
    scene.reactionAssetId = `reaction-${c.mobbyId}-${reactionVariant}`;
    scene.actors = [
    { id: id(`${scene.id}-mobby`), name: mobbyName, assetId: `mobby-${c.mobbyId}`, side: 'left' },
    { id: id(`${scene.id}-enemy`), name: enemyName, assetId: `enemy-${c.enemyId}`, side: 'right', mirrored: true },
    ];
  }
  return { id: `episode-${c.episode}` as EpisodeId, version: 2, contentVersion: 4, chapter: `第${c.episode}話`, title: c.title, synopsis: c.synopsis, enemyId: c.enemyId, featuredMobbyId: c.mobbyId, entrySceneId: id('01-crime'), scenes, credits: [`出演：${c.cast}`, `関係：${c.relationship}`, 'Episode Player v2'], outcomeCaption: c.outcomeCaption, keyVisualAssetId: assets.keyVisual ?? 'bg-relationship' };
}
