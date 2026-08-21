import type { EpisodeData, Line, Scene } from './types';

const lines = (...items: readonly [speaker: string, text: string][]): readonly Line[] =>
  items.map(([speaker, text], index) => ({ id: `line-${index + 1}`, speaker, text }));

const scene = (value: Scene): Scene => {
  const sceneNumber = Number(value.id.match(/ep01-(\d+)/)?.[1] ?? 0);
  const variant = value.kind === 'choice' || value.kind === 'key-visual' || value.kind === 'after-credits'
    ? 'joy'
    : sceneNumber % 3 === 0
      ? 'sulk'
      : 'startled';
  return { ...value, reactionAssetId: value.reactionAssetId ?? `reaction-reomoby-${variant}` };
};

const reo = { id: 'reo', name: 'れおもび', assetId: 'mobby-reomoby', side: 'left' } as const;
const safecracker = { id: 'safecracker', name: '金庫破り', assetId: 'enemy-safecracker', side: 'right' } as const;

export const EPISODE_01_SAFECRACKER_REOMOBY: EpisodeData = {
  id: 'episode-1',
  version: 2,
  contentVersion: 4,
  chapter: '第1話',
  title: '金庫破りと王子様のティータイム',
  synopsis: '超一流の金庫破りを、れおもびの王子待遇と紅茶へのこだわりが調子を狂わせる夜。',
  enemyId: 'safecracker',
  featuredMobbyId: 'reomoby',
  entrySceneId: 'ep01-01-prologue',
  credits: ['出演：れおもび／金庫破り', '紅茶監修：金庫破り（本人は否定）', 'Episode Player v2'],
  scenes: [
    scene({
      id: 'ep01-01-prologue',
      kind: 'cutscene',
      title: '王子様からの条件',
      backgroundAssetId: 'bg-mansion',
      actors: [reo],
      lines: lines(
        ['ナレーション', '月夜の屋敷。思い出の金庫に、七人のいたずら仲間から招待状が届いた。'],
        ['れおもび', '守る前に大事な確認だ。今夜の僕は「王子」、君は「お姫様」。呼び方を間違えないでね。'],
        ['ナレーション', 'おはなしより先に、配役が決まった。'],
      ),
      nextSceneId: 'ep01-02-break-in',
      cues: ['transition-fade'],
    }),
    scene({
      id: 'ep01-02-break-in',
      kind: 'cutscene',
      title: '音のない解錠',
      backgroundAssetId: 'bg-corridor',
      actors: [safecracker],
      lines: lines(
        ['金庫破り', '錠は力で壊すものではない。呼吸を読み、機構の迷いを解く。'],
        ['ナレーション', '三本の工具が踊り、難攻不落の補助錠が音もなく開いた。'],
        ['れおもび', '見事だね。ところで王子の客室は、そっちじゃないよ。'],
        ['金庫破り', '……私は宿泊客ではない。'],
      ),
      nextSceneId: 'ep01-03-search-lock',
      cues: ['transition-flash', 'vibrate-heavy'],
    }),
    scene({
      id: 'ep01-03-search-lock',
      kind: 'cutscene',
      title: '持ち出し成功、のはず',
      backgroundAssetId: 'bg-mansion',
      actors: [reo, safecracker],
      lines: lines(
        ['金庫破り', '中身は確保した。誰にも気づかれず、これを持ち帰る。'],
        ['れおもび', '待って。王子の屋敷から出るなら、まず客室でお茶を一杯。'],
        ['ナレーション', '盗み出した箱より、歓迎のほうが重かった。'],
      ),
      nextSceneId: 'ep01-04-search-floor',
      cues: ['transition-fade'],
    }),
    scene({
      id: 'ep01-04-search-floor',
      kind: 'cutscene',
      title: '関係ない寄り道',
      backgroundAssetId: 'bg-service',
      actors: [reo, safecracker],
      lines: lines(
        ['金庫破り', '私は盗んだものを持って出るだけだ。寄り道はしない。'],
        ['れおもび', 'その前に、茶葉の香りを当てて。あと、客室のカーテンも見てほしいな。'],
        ['ナレーション', '関係ない相談が増えるほど、玄関は遠ざかっていった。'],
      ),
      nextSceneId: 'ep01-05-search-window',
      cues: ['zoom-in'],
    }),
    scene({
      id: 'ep01-05-search-window',
      kind: 'cutscene',
      title: '出口の前で足止め',
      backgroundAssetId: 'bg-corridor',
      actors: [reo, safecracker],
      lines: lines(
        ['金庫破り', '出口はすぐそこだ。今度こそ帰る。'],
        ['れおもび', 'ねえ、王子のマントの留め具が曲がってる。直せる？'],
        ['金庫破り', 'なぜ私が……。私は金庫を開けに来たんだ！'],
        ['ナレーション', '金庫破りは、箱を抱えたまま三度目の足止めを受けた。'],
      ),
      nextSceneId: 'ep01-06-choice',
      cues: ['zoom-out'],
    }),
    scene({
      id: 'ep01-06-choice',
      kind: 'choice',
      title: '王子様の追跡作戦',
      backgroundAssetId: 'bg-corridor',
      actors: [{ ...reo, side: 'center' }],
      lines: lines(
        ['れおもび', '正面から王子らしく追うか、給仕通路から紅茶らしく追うか。お姫様、選んで。'],
      ),
      interaction: {
        id: 'route-choice',
        kind: 'choice',
        prompt: '追跡ルートを選ぶ',
        successText: '作戦決定！',
        options: [
          { id: 'stairs', label: '大階段から「王子のお通り！」', nextSceneId: 'ep01-07a-stairs' },
          { id: 'passage', label: '給仕通路から紅茶の香りを追う', nextSceneId: 'ep01-07b-passage' },
        ],
      },
    }),
    scene({
      id: 'ep01-07a-stairs',
      kind: 'cutscene',
      title: '大階段ルート',
      backgroundAssetId: 'bg-mansion',
      actors: [reo, safecracker],
      lines: lines(
        ['れおもび', '王子のお通りだ！　金庫破り、ひざまずくなら今だよ。'],
        ['金庫破り', '足音が十二段先から丸聞こえだ。追跡の基本を学べ。'],
        ['れおもび', '王子の登場は、聞こえるくらいがちょうどいい。'],
      ),
      nextSceneId: 'ep01-09-chase-one',
    }),
    scene({
      id: 'ep01-07b-passage',
      kind: 'cutscene',
      title: '給仕通路ルート',
      backgroundAssetId: 'bg-service',
      actors: [reo, safecracker],
      visualOverlay: { text: '🫖', accessibilityLabel: '給仕通路に置かれたティーポット' },
      lines: lines(
        ['れおもび', 'この香り、茶葉は良いのに蒸らしが二秒短い。'],
        ['金庫破り', '三秒だ。標高と湯温を計算に入れろ。'],
        ['ナレーション', '金庫破りは駆け出しながら、紅茶の訂正だけは振り返って行った。'],
      ),
      nextSceneId: 'ep01-09-chase-one',
    }),
    scene({
      id: 'ep01-09-chase-one',
      kind: 'cutscene',
      title: 'チェイス 1/3',
      backgroundAssetId: 'bg-corridor',
      lines: lines(
        ['金庫破り', '右は金庫、左は客室だ。私は右へ行く。'],
        ['れおもび', '客室を案内してくれるなんて親切だね。左へ！'],
        ['ナレーション', '金庫破りは左へ逃げたつもりで、王子の客室へ近づいていた。'],
      ),
      nextSceneId: 'ep01-10-chase-two',
      cues: ['vibrate-light'],
    }),
    scene({
      id: 'ep01-10-chase-two',
      kind: 'cutscene',
      title: 'チェイス 2/3',
      backgroundAssetId: 'bg-mansion',
      visualOverlay: { text: '☕', accessibilityLabel: '廊下を走る紅茶のカップ' },
      lines: lines(
        ['ナレーション', '金庫破りは迫るティーカートを、工具一本で一滴もこぼさず受け流した。'],
        ['れおもび', 'さすが。王子の紅茶もその技術でお願いするよ。'],
        ['金庫破り', '私は金庫を開けに来た！'],
        ['ナレーション', '逃走は止まったが、紅茶の作法だけは一歩前進した。'],
      ),
      nextSceneId: 'ep01-11-chase-three',
      cues: ['zoom-in'],
    }),
    scene({
      id: 'ep01-11-chase-three',
      kind: 'cutscene',
      title: 'チェイス 3/3',
      backgroundAssetId: 'bg-corridor',
      lines: lines(
        ['金庫破り', '客室でも紅茶室でもない。屋上金庫が私の目的だ！'],
        ['れおもび', '三度目でようやく金庫に戻ったね。上だ！'],
        ['ナレーション', '金庫破りは屋上へ向かうが、れおもびは王子の案内役として先回りした。'],
      ),
      nextSceneId: 'ep01-12-confrontation',
      cues: ['vibrate-heavy'],
    }),
    scene({
      id: 'ep01-12-confrontation',
      kind: 'cutscene',
      title: '金庫破りの信念',
      backgroundAssetId: 'bg-confrontation',
      actors: [reo, safecracker],
      lines: lines(
        ['金庫破り', 'どんな錠にも、作り手が残した答えがある。壊さず、美しく解く。それが私の信念だ。'],
        ['れおもび', '格好いいね。では王子のお願いも、美しく聞いてくれる？'],
        ['金庫破り', '王子扱いはしない。紅茶も淹れない。金庫だけを開ける。'],
        ['ナレーション', '四度目の宣言で、いちばん余計な二つが増えていた。'],
      ),
      nextSceneId: 'ep01-13-hold',
    }),
    scene({
      id: 'ep01-13-hold',
      kind: 'cutscene',
      title: '金庫を守れ',
      backgroundAssetId: 'bg-confrontation',
      lines: lines(
        ['れおもび', 'お姫様、金庫を押さえて。王子は最後の交渉をする。'],
        ['れおもび', '金庫を諦めたら、客室と最高の茶葉を用意しよう。'],
        ['金庫破り', '交渉条件がおかしい！'],
        ['ナレーション', '金庫を守るはずの時間は、いつの間にか次の約束を決める時間になっていた。'],
      ),
      nextSceneId: 'ep01-14-resolution',
      cues: ['vibrate-heavy'],
    }),
    scene({
      id: 'ep01-14-resolution',
      kind: 'cutscene',
      title: '金庫破り、まさかの一杯',
      backgroundAssetId: 'bg-evidence',
      actors: [{ ...safecracker, side: 'center' }],
      visualOverlay: { text: '🫖☕', accessibilityLabel: '金庫破りがティーポットから紅茶を淹れている' },
      lines: lines(
        ['ナレーション', 'そのとき、沸かしっぱなしの湯が鳴った。金庫破りの眉が動く。'],
        ['金庫破り', 'その茶葉に沸騰直後の湯を注ぐな。香りが死ぬ。'],
        ['ナレーション', '金庫破りは工具をティースプーンに持ち替え、正確な手つきで紅茶を淹れてしまった。'],
        ['れおもび', 'ありがとう。王子には砂糖をひとつ。'],
        ['金庫破り', '……私は何を開けに来たんだ。'],
      ),
      nextSceneId: 'ep01-15-promise',
      cues: ['transition-flash'],
    }),
    scene({
      id: 'ep01-15-promise',
      kind: 'cutscene',
      title: '王子様の判定',
      backgroundAssetId: 'bg-relationship',
      actors: [{ id: 'reo', name: 'れおもび', assetId: 'mobby-reomoby-joy', side: 'center' }],
      visualOverlay: { text: '☕', accessibilityLabel: 'れおもびが受け取った紅茶' },
      lines: lines(
        ['れおもび', '金庫は守れたし、紅茶は完璧。君、金庫破りより王室の給仕に向いているよ。'],
        ['金庫破り', '次に会うときは、必ず金庫だけを――'],
        ['れおもび', '客室も空けて待っているね。'],
      ),
      nextSceneId: 'ep01-16-key-visual',
      cues: ['zoom-in'],
    }),
    scene({
      id: 'ep01-16-key-visual',
      kind: 'key-visual',
      title: '金庫より難しい王子様',
      backgroundAssetId: 'bg-relationship',
      actors: [
        { id: 'reo', name: 'れおもび', assetId: 'mobby-reomoby-joy', side: 'left', scale: 1.1 },
        { ...safecracker, scale: 0.85 },
      ],
      visualOverlay: { text: '🔐☕', accessibilityLabel: '閉じた金庫と、金庫破りが淹れた紅茶' },
      lines: lines(
        ['ナレーション', '難攻不落の金庫は閉じたまま。ティーカップだけが、見事に開けられた夜だった。'],
      ),
      nextSceneId: 'ep01-17-after-credits',
      cues: ['transition-fade'],
    }),
    scene({
      id: 'ep01-17-after-credits',
      kind: 'after-credits',
      title: 'AFTER CREDITS',
      backgroundAssetId: 'bg-relationship',
      actors: [{ ...safecracker, side: 'center', scale: 0.75 }],
      visualOverlay: { text: '🫖', accessibilityLabel: '置き忘れられた金庫破りのティーポット' },
      lines: lines(
        ['金庫破り', '次こそは、紅茶にも客室にも惑わされず――'],
        ['れおもび', '次はないよ。もう王子専属の紅茶係に任命したから。'],
        ['金庫破り', '……金庫より、この屋敷のほうが難しい。'],
        ['ナレーション', '第1話 完'],
      ),
      cues: ['zoom-out'],
    }),
  ],
};
