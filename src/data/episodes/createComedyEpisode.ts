import type { EpisodeData, EpisodeId, Line, Scene } from './types';
import type { EnemyId } from '@/data/enemyCases';
import type { MobbyId } from '@/data/mobies';

export type ComedyEpisodeCopy = {
  episode: number; title: string; synopsis: string; enemyId: EnemyId; mobbyId: MobbyId; cast: string; relationship: string;
  crime: readonly [string, string][]; search: readonly [string, string, string, string]; lair: readonly [string, string][];
  actions: readonly [string, string, string, string, string, string]; reversal: readonly [string, string][]; choicePrompt: string;
  endings: readonly [{ label: string; title: string; lines: readonly [string, string][] }, { label: string; title: string; lines: readonly [string, string][] }];
  relationshipLines: readonly [string, string][]; key: readonly [string, string, string, string]; after: readonly [string, string];
};

export function createComedyEpisode(c: ComedyEpisodeCopy): EpisodeData {
  const p = `ep${String(c.episode).padStart(2, '0')}`;
  const id = (s: string) => `${p}-${s}`;
  const ls = (s: string, rows: readonly [string, string][]): readonly Line[] => rows.map(([speaker, text], i) => ({ id: id(`${s}-line-${i + 1}`), speaker, text }));
  const scenes: Scene[] = [
    { id: id('01-crime'), kind: 'cutscene', title: '鮮やかな犯行', backgroundAssetId: 'bg-mansion', visualOverlay: { text: '🌙 ✦', accessibilityLabel: '月夜に現れる怪盗' }, lines: ls('01', c.crime), nextSceneId: id('02-search-one'), cues: ['transition-flash'] },
    { id: id('02-search-one'), kind: 'tap', title: '手がかり 1/2', backgroundAssetId: 'bg-evidence', lines: ls('02', [[c.cast, c.search[0]]]), interaction: { id: id('search-one'), kind: 'tap', targetId: id('evidence-one'), prompt: '手がかりをタップ（ボタンでも進めます）', successText: c.search[1], cue: 'zoom-in' }, nextSceneId: id('03-search-two') },
    { id: id('03-search-two'), kind: 'tap', title: '手がかり 2/2', backgroundAssetId: 'bg-corridor', lines: ls('03', [[c.cast, c.search[2]]]), interaction: { id: id('search-two'), kind: 'tap', targetId: id('evidence-two'), requiredTaps: 2, prompt: '2回タップ（ボタンでも進めます）', successText: c.search[3], cue: 'vibrate-light' }, nextSceneId: id('04-lair') },
    { id: id('04-lair'), kind: 'cutscene', title: '怪盗のアジト', backgroundAssetId: 'bg-service', visualOverlay: { text: '🕵️‍♂️ ⚙️', accessibilityLabel: '怪盗の秘密アジト' }, lines: ls('04', c.lair), nextSceneId: id('05-swipe') },
    { id: id('05-swipe'), kind: 'swipe', title: '突破 1/3', backgroundAssetId: 'bg-confrontation', lines: ls('05', [[c.cast, c.actions[0]]]), interaction: { id: id('swipe'), kind: 'swipe', direction: 'right', threshold: 48, prompt: '右へスワイプ（ボタンでも進めます）', successText: c.actions[1], cue: 'vibrate-light' }, nextSceneId: id('06-hold') },
    { id: id('06-hold'), kind: 'hold', title: '突破 2/3', backgroundAssetId: 'bg-confrontation', lines: ls('06', [[c.cast, c.actions[2]]]), interaction: { id: id('hold'), kind: 'hold', durationMs: 1200, prompt: '長押し（ボタンでも進めます）', successText: c.actions[3], cue: 'vibrate-heavy' }, nextSceneId: id('07-tap') },
    { id: id('07-tap'), kind: 'tap', title: '突破 3/3', backgroundAssetId: 'bg-evidence', lines: ls('07', [[c.cast, c.actions[4]]]), interaction: { id: id('tap'), kind: 'tap', targetId: id('final-target'), requiredTaps: 3, prompt: '3回タップ（ボタンでも進めます）', successText: c.actions[5], cue: 'transition-flash' }, nextSceneId: id('08-reversal') },
    { id: id('08-reversal'), kind: 'cutscene', title: '後半逆転', backgroundAssetId: 'bg-confrontation', visualOverlay: { text: '！？ ↩️', accessibilityLabel: '計画が逆転する瞬間' }, lines: ls('08', c.reversal), nextSceneId: id('09-choice') },
    { id: id('09-choice'), kind: 'choice', title: '正解のない二択', backgroundAssetId: 'bg-service', lines: ls('09', [[c.cast, c.choicePrompt]]), interaction: { id: id('choice'), kind: 'choice', prompt: 'どちらも正解ではない', successText: '決定！', options: [{ id: id('option-a'), label: c.endings[0].label, nextSceneId: id('10a-ending') }, { id: id('option-b'), label: c.endings[1].label, nextSceneId: id('10b-ending') }] } },
    { id: id('10a-ending'), kind: 'cutscene', title: `ENDING A：${c.endings[0].title}`, backgroundAssetId: 'bg-corridor', lines: ls('10a', c.endings[0].lines), nextSceneId: id('11-relationship') },
    { id: id('10b-ending'), kind: 'cutscene', title: `ENDING B：${c.endings[1].title}`, backgroundAssetId: 'bg-mansion', lines: ls('10b', c.endings[1].lines), nextSceneId: id('11-relationship') },
    { id: id('11-relationship'), kind: 'cutscene', title: c.relationship, backgroundAssetId: 'bg-mansion', lines: ls('11', c.relationshipLines), nextSceneId: id('12-key-visual') },
    { id: id('12-key-visual'), kind: 'key-visual', title: c.key[0], backgroundAssetId: 'bg-mansion', visualOverlay: { text: c.key[1], accessibilityLabel: c.key[2] }, lines: ls('12', [['ナレーション', c.key[3]]]), nextSceneId: id('13-after-credits'), cues: ['transition-fade'] },
    { id: id('13-after-credits'), kind: 'after-credits', title: 'AFTER CREDITS', backgroundAssetId: 'bg-evidence', visualOverlay: { text: c.after[0], accessibilityLabel: '怪盗団の舞台裏' }, lines: ls('13', [['ナレーション', `組織の裏側：${c.after[1]}`], ['ナレーション', `第${c.episode}話 完`]]) },
  ];
  return { id: `episode-${c.episode}` as EpisodeId, version: 2, contentVersion: 1, chapter: `第${c.episode}話`, title: c.title, synopsis: c.synopsis, enemyId: c.enemyId, featuredMobbyId: c.mobbyId, entrySceneId: id('01-crime'), scenes, credits: [`出演：${c.cast}`, `関係：${c.relationship}`, 'Episode Player v2'] };
}
