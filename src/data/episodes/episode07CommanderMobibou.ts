import { createComedyEpisode } from './createComedyEpisode';
export const EPISODE_07_COMMANDER_MOBIBOU = createComedyEpisode({
  episode: 7, title: '司令官と不可抗力だらけの最終作戦', synopsis: '六人の技術を束ねる司令官の作戦を、もびぼうの不可抗力が連鎖して書き換える。', enemyId: 'commander', mobbyId: 'mobibou', cast: 'もびぼう／司令官', relationship: '作戦変更（理由：不可抗力）',
  crime: [['ナレーション', '赤い司令印が光り、情報・追跡・分身・解錠・潜入・配送が秒単位で動いた。'], ['司令官', '六つの技術と信念を、一つの勝利へ束ねる。'], ['もびぼう', 'すごい計画！　紙の端、ジュースで濡れた。不可抗力。']], search: ['青い封蝋、鈴、落とし物札が同じ袋。', '第2〜4話の指示時刻を発見！', '仮面写真、受領印、赤い荷札もある。', '第5〜6話の経路がつながった！'],
  lair: [['司令官', '六人の失敗もデータだ。偶然は排除した。'], ['もびぼう', 'ごめん、耳栓の箱につまずいた。'], ['ナレーション', '返品された消音靴が飛び、作戦盤の駒を全部ずらした。']], actions: ['予定表を右へ戻す！', '全指示が一時間後ろへ！', '赤い司令ボタンを押さえる！', '47分の音声が再生された！', '停止キーを連打！', '家族グループ通知まで開いた！'],
  reversal: [['司令官', 'なぜ音声、鈴、帽子がここに！'], ['もびぼう', '記念写真と受領印も落ちてきた。'], ['ナレーション', '六つの小さな失敗が順番に発動し、完璧な計画だけが配送された。']], choicePrompt: '作戦名を直す？　理由欄を直す？', endings: [{ label: '作戦名を「だいたい成功」', title: '評価変更', lines: [['司令官', '目標は一体も確保できていない。'], ['もびぼう', 'いたずら仲間は全員集合できたよ。'], ['司令官', '親睦会ではない！']] }, { label: '理由を「全部不可抗力」', title: '報告書の勝利', lines: [['司令官', '原因分析になっていない。'], ['もびぼう', 'でも欄にぴったり入った。'], ['ナレーション', '司令官はレイアウトだけ認めた。']] }],
  relationshipLines: [['司令官', '作戦変更。理由は……不可抗力。'], ['もびぼう', '次は消せるペン貸すね。'], ['司令官', 'まず君を計画書から遠ざける。']], key: ['七人分の作戦変更', '📋「不可抗力」×7\n☕🔔🎩📸📦', '六話分の品に埋まり作戦変更印を押す司令官', '作戦盤は耳栓、鈴、帽子、写真、箱で埋まり、中央に「不可抗力」と押されていた。'], after: ['反省会兼親睦会', '七人は初めて全員そろい、次の作戦より先に経費精算を始めた。'],
  outcomeCaption: '作戦報告：全小物回収、オチは不可抗力',
  sceneAssets: {
    opening: 'bg-episode-7-command-room', search: 'bg-episode-7-command-room', lair: 'bg-episode-7-command-room',
    action: 'bg-episode-7-command-room', reversal: 'bg-episode-7-command-room', relationship: 'bg-episode-7-command-room',
    keyVisual: 'bg-episode-7-command-room', afterCredits: 'bg-episode-7-command-room',
  },
  sceneTitles: {
    searchOne: '六話分の記録を照合', searchTwo: '作戦盤がつながる', lair: '司令室の小さな事故',
    actionOne: '予定表を戻す', actionTwo: '赤いボタンを守る', actionThree: '停止キーの連打',
    reversal: '小さな失敗の連鎖', choice: '報告書の題名を決める',
  },
});
