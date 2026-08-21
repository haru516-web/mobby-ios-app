import { createComedyEpisode } from './createComedyEpisode';
export const EPISODE_04_MAGICIAN_MOBIYURA = createComedyEpisode({
  episode: 4, title: '奇術師の弟子ではありません', synopsis: '偽物を芸術にする奇術師へ、もびゆらが勝手な師弟認定を拒否する。', enemyId: 'magician', mobbyId: 'mobiyura', cast: 'もびゆら／奇術師', relationship: '弟子ではない',
  crime: [['ナレーション', '奇術師が指を鳴らすと、紙人形は呼吸も影も備えた完璧な分身になった。'], ['奇術師', '偽物は嘘ではない。信じた一秒だけ本物になる芸術だ。'], ['もびゆら', '拍手はする。でも弟子入りはしない。']], search: ['右の影だけ一拍遅い。', '銀粉の折り目を発見！', '「弟子用」の紙吹雪箱は返却。', '劇場地下への搬入口を発見！'],
  lair: [['奇術師', '見抜いた褒美に秘伝を授けよう。'], ['もびゆら', '見抜いた罰で弟子にするな。'], ['奇術師', 'その反抗心、弟子向きだ。']], actions: ['幕を舞台ごと開ける。', '隠し糸が丸見え！', '鏡を固定するよ。', '投影が一列に重なった！', '面倒な反応の中央が本物。', '紙人形が全部崩れた！'],
  reversal: [['ナレーション', 'もびゆらは帽子に「落とし物」の札を付けて受付へ届けた。'], ['奇術師', '私の象徴を遺失物扱いするな！'], ['もびゆら', '受取欄に本名を書いて。']], choicePrompt: '帽子を返す？　師匠役を審査する？', endings: [{ label: '帽子の受領印をもらう', title: '受領済', lines: [['奇術師', 'この署名も演出の一部だ。'], ['もびゆら', '身分確認できました。通報済み。']] }, { label: '師匠役の審査をする', title: '不合格', lines: [['もびゆら', '帽子は満点。勧誘がしつこいので不合格。'], ['奇術師', '審査する側は私だ！']] }],
  relationshipLines: [['奇術師', '次こそ君を舞台へ上げる。'], ['もびゆら', '客席なら買う。弟子席なら空席。']], key: ['主役は落とし物', '✨🎩✨\n番号007', 'スポットライトの帽子と返却を待つ奇術師', 'その夜いちばん拍手を浴びたのは、遺失物カウンターの帽子だった。'], after: ['弟子募集：応募0', '弟子募集要項に「本人の同意必須」が赤字で追記された。'],
  outcomeCaption: '弟子ノート：帽子→鏡→拍手、本人同意は最優先',
  sceneAssets: {
    opening: 'bg-episode-4-magic-backstage', search: 'bg-episode-4-magic-backstage', lair: 'bg-episode-4-magic-backstage',
    action: 'bg-episode-4-magic-backstage', reversal: 'bg-episode-4-magic-backstage', relationship: 'bg-episode-4-magic-backstage',
    keyVisual: 'bg-episode-4-magic-backstage', afterCredits: 'bg-episode-4-magic-backstage',
  },
  sceneTitles: {
    searchOne: '鏡の裏側を確認', searchTwo: '弟子箱は返却', lair: '舞台裏の師弟問答',
    actionOne: '幕を開けたら全部見えた', actionTwo: '鏡の列をそろえる', actionThree: '落とし物を中央へ',
    reversal: '帽子を受付へ', choice: '返却するか、審査するか',
  },
});
