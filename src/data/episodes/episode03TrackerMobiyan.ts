import { createComedyEpisode } from './createComedyEpisode';
export const EPISODE_03_TRACKER_MOBIYAN = createComedyEpisode({
  episode: 3, title: '追跡者と忍べない忍者', synopsis: '痕跡を読む追跡者を、もびやんの派手すぎる隠密任務が正面突破する。', enemyId: 'tracker', mobbyId: 'mobiyan', cast: 'もびやん／追跡者', relationship: '隠密任務失敗',
  crime: [['ナレーション', '追跡者は床の一滴と寝息の間隔だけで隠れ場所を射抜いた。'], ['追跡者', '消した痕跡ほど雄弁だ。逃げ道はもうない。'], ['もびやん', 'ならば痕跡を増やして隠すでござる！']], search: ['濡れた足あと。拙者なら泥も追加する。', '追跡者の靴跡を発見！', 'カーテンの糸が北へ。たぶん北！', '秘密通路が開いた！'],
  lair: [['追跡者', 'ここまで音を立てた侵入者は初めてだ。'], ['もびやん', '初記録でござる！'], ['追跡者', '隠密としては失敗だ。']], actions: ['煙幕、横一文字！', '煙幕が派手に発光！', '忍法・動かぬ術！', '静止成功、くしゃみ以外は！', '足あとを百個置くでござる。', '床一面が足あとだらけ！'],
  reversal: [['追跡者', '百個でも歩幅と重心で見切れる。'], ['もびやん', 'ならば名乗る！　もびやん、ここにあり！'], ['ナレーション', '追跡者が地図を読む間に、もびやんは地図を抱えて走った。']], choicePrompt: '撤退は天井か、正面玄関か！', endings: [{ label: '天井で鈴を鳴らす', title: '鈴の道', lines: [['追跡者', '音で天井の形まで分かる。'], ['もびやん', '地図作りに貢献したでござる！']] }, { label: '正面から忍び足', title: '堂々退場', lines: [['もびやん', 'ただいま右足を静かに着地！'], ['追跡者', '実況をやめろ。']] }],
  relationshipLines: [['追跡者', '痕跡を消す技術を教えてやる。'], ['もびやん', '成功祝いの花火のあとに！'], ['追跡者', '何が成功した。']], key: ['隠れる気だけは満点', '🎆\n🥷「隠密！」\n👣👣', '花火の下で隠密と叫び足跡を残すもびやん', '追跡者は標的を見失わなかった。ただし笑いすぎて追えなかった。'], after: ['消音靴：返品', '消音靴は「相手が自分で位置を叫ぶため不要」と返品された。'],
  outcomeCaption: '作戦名：しずしず足跡ゼロ（予定）',
  sceneAssets: {
    opening: 'bg-episode-3-archive', search: 'bg-episode-3-archive', lair: 'bg-episode-3-archive',
    action: 'bg-episode-3-archive', reversal: 'bg-episode-3-archive', relationship: 'bg-episode-3-archive',
    keyVisual: 'bg-episode-3-archive', afterCredits: 'bg-episode-3-archive',
  },
  sceneTitles: {
    searchOne: '足跡だらけの保管庫', searchTwo: '静かにするほど目立つ', lair: '追跡者の記録棚',
    actionOne: '煙幕は目立つ色', actionTwo: '動かない練習', actionThree: '足跡を増やす作戦',
    reversal: '地図を抱えて逃げる', choice: '最後の退場ルート',
  },
});
