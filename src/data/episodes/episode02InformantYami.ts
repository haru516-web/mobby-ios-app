import { createComedyEpisode } from './createComedyEpisode';
export const EPISODE_02_INFORMANT_YAMI = createComedyEpisode({
  episode: 2, title: '情報屋と午前三時の既読地獄', synopsis: '完璧な情報網へ、やみの情報量過多な独り言が逆流する。', enemyId: 'informant', mobbyId: 'yami', cast: 'やみ／情報屋', relationship: '情報量過多',
  crime: [['ナレーション', '情報屋は音もなく名簿を抜き取り、全モビーの行動時刻を一息で暗唱した。'], ['情報屋', '情報は刃だ。多いほど相手の選択肢を奪える。'], ['やみ', '午前三時なら空いてる。眠れない理由を四十七個話せるよ。']],
  search: ['青い封蝋に「質問は一件まで」って書いてある。', '通信先を発見！', '偽住所が一個。返事が遅い場所が本物っぽい。', '地下通信室への経路を発見！'],
  lair: [['情報屋', '君の癖も沈黙も把握済みだ。'], ['やみ', '沈黙は苦手。じゃあ全部話すね。'], ['ナレーション', 'やみは本題と無関係な夢の話から始めた。']],
  actions: ['独り言を全回線へ流そう。', 'いたずら仲間の回線へ転送！', '要点のない話ほど止めちゃだめ。', '連続送信に成功！', '好きな深夜食も重要機密にしよう。', '未読が9999件を超えた！'],
  reversal: [['ナレーション', '端末は独り言で埋まり、盗んだ名簿を自動排出した。'], ['情報屋', '情報は精度と選別だ。量だけでは知性にならない！'], ['やみ', 'いい言葉。今のも全員へ送った。']], choicePrompt: '最後は47分の音声？　それとも家族グループ招待？',
  endings: [{ label: '47分の音声を送る', title: '等速再生', lines: [['情報屋', '私は倍速で聞く。'], ['やみ', '途中から半速で録ったよ。'], ['ナレーション', '情報屋は初めて計算を諦めた。']] }, { label: '家族グループに招待', title: '退会不可', lines: [['情報屋', '潜入より脱退が難しいだと……。'], ['やみ', '朝の挨拶、毎日来るから。'], ['ナレーション', '秘密の多い男に親戚が増えた。']] }],
  relationshipLines: [['情報屋', '次は必要な情報だけを盗む。'], ['やみ', '必要か決める資料、百二十件送るね。']], key: ['受信箱に埋まる情報屋', '📱9999+\n🕵️‍♂️\n💬💬💬', '通知に腰まで埋まり、名簿を返す情報屋', '名簿は無傷。情報屋だけが未読通知の山から手を振っていた。'], after: ['極秘：耳栓×7', '翌朝、経費に「最高級耳栓×7」が追加された。'],
  outcomeCaption: '受信箱記録：今聞いてほしい一言、未読9999件',
  sceneAssets: {
    opening: 'bg-episode-2-communications', search: 'bg-episode-2-communications', lair: 'bg-episode-2-communications',
    action: 'bg-episode-2-communications', reversal: 'bg-episode-2-communications', relationship: 'bg-episode-2-communications',
    keyVisual: 'bg-episode-2-communications', afterCredits: 'bg-episode-2-communications',
  },
  sceneTitles: {
    searchOne: '既読のない通信室', searchTwo: '返信の山を越えて', lair: '午前三時の送信席',
    actionOne: '一言目が長すぎる', actionTwo: '要点が行方不明', actionThree: '未読の山をひらく',
    reversal: '返すはずの名簿', choice: 'どの通知で夜を閉じる？',
  },
});
