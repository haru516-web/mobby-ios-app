import { createComedyEpisode } from './createComedyEpisode';
export const EPISODE_05_VEILED_DUCHESS_MOBIRIN = createComedyEpisode({
  episode: 5, title: '仮面の貴婦人と怖がらない客', synopsis: '完璧な変装で侵入した仮面の貴婦人を、もびりんの異常な恐怖耐性が困惑させる。', enemyId: 'veiled-duchess', mobbyId: 'mobirin', cast: 'もびりん／仮面の貴婦人', relationship: '恐怖耐性：異常',
  crime: [['ナレーション', '仮面の貴婦人は主の歩幅、声、香りまでまとい、警戒の内側へ優雅に入った。'], ['仮面の貴婦人', '恐怖は鍵より静かに心の扉を開く。'], ['もびりん', 'わあ、仮面かわいい。裏側も見せて。']], search: ['手袋に棚のほこり。掃除してくれた？', '侵入経路の繊維を発見！', '鏡の影だけ帽子と合ってない。', '本物の姿が鏡に映った！'],
  lair: [['仮面の貴婦人', 'この館で悲鳴を上げなかった者はいない。'], ['もびりん', 'くしゃみなら出そう。'], ['ナレーション', '貴婦人の登場音楽だけが気まずく鳴った。']], actions: ['黒い幕、開けちゃうね。', '恐怖装置が丸見え！', 'びっくり箱を押さえるよ。', '骸骨が出られず会釈した！', '仮面の留め具を確認。', '仮面がくるりと裏返った！'],
  reversal: [['仮面の貴婦人', 'なぜ怖がらない！'], ['もびりん', '怖い役の人が準備を頑張ったと思うと応援したくなる。'], ['ナレーション', '貴婦人は初めて、脅かした相手から差し入れを受け取った。']], choicePrompt: 'お礼は記念撮影？　お化け役の追加？', endings: [{ label: '仮面のまま記念撮影', title: 'はい、チーズ', lines: [['仮面の貴婦人', 'これは人質写真ではないのか。'], ['もびりん', '笑って。あとで送るね。']] }, { label: '貴婦人を驚かせる', title: '逆お化け屋敷', lines: [['もびりん', '背後に請求書が！'], ['仮面の貴婦人', 'きゃっ！'], ['ナレーション', '唯一効いた恐怖は経費精算だった。']] }],
  relationshipLines: [['仮面の貴婦人', '次は必ず悲鳴を奪う。'], ['もびりん', '楽しみ。予約していい？']], key: ['恐怖耐性：異常', '📸🎭😊\n👻「…」', '笑顔で仮面の貴婦人と幽霊を記念撮影するもびりん', '恐怖の館の出口には、笑顔の記念写真と落ち込む幽霊が並んだ。'], after: ['脅かし度：再研修', '恐怖研修の講師欄に、なぜかもびりんの名前が仮登録された。'],
  outcomeCaption: '記念写真：恐怖度0、笑顔度100',
  sceneAssets: {
    opening: 'bg-episode-5-masked-conservatory', search: 'bg-episode-5-masked-conservatory', lair: 'bg-episode-5-masked-conservatory',
    action: 'bg-episode-5-masked-conservatory', reversal: 'bg-episode-5-masked-conservatory', relationship: 'bg-episode-5-masked-conservatory',
    keyVisual: 'bg-episode-5-masked-conservatory', afterCredits: 'bg-episode-5-masked-conservatory',
  },
  sceneTitles: {
    searchOne: '仮面の裏側をのぞく', searchTwo: '鏡にだけ残る影', lair: '悲鳴を待つ温室',
    actionOne: '幕の向こうへごあいさつ', actionTwo: 'びっくり箱を休ませる', actionThree: '留め具を確認',
    reversal: '怖がらない客への相談', choice: '記念撮影か、追加演出か',
  },
});
