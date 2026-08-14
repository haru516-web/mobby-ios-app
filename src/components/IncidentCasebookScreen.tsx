import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text as RNText, View, type ImageSourcePropType, type TextProps } from 'react-native';

export type IncidentCasebookTab = 'active' | 'enemies' | 'comics';

export type IncidentCasebookActiveCase = {
  id: string;
  chapter: string;
  title: string;
  targetName: string;
  targetImage: ImageSourcePropType;
  progressLabel: string;
  objective: string;
  canResume: boolean;
  introSeen: boolean;
};

export type IncidentCasebookEnemyEntry =
  | {
      state: 'locked';
      id: string;
      revealOrder: 1 | 2 | 3 | 4 | 5 | 6 | 7;
      alias: string;
      unlockCondition: string;
    }
  | {
      state: 'revealed';
      id: string;
      caseId: string;
      revealOrder: 1 | 2 | 3 | 4 | 5 | 6 | 7;
      name: string;
      role: string;
      method: string;
      record: string;
      affiliationLabel: string;
      image: ImageSourcePropType;
      isNew?: boolean;
    };

export type IncidentCasebookComicFrame = {
  panel: 1 | 2 | 3 | 4;
  caption: string;
  alt: string;
  image?: ImageSourcePropType;
};

export type IncidentCasebookComicEntry = {
  id: string;
  caseId: string;
  targetName: string;
  targetImage: ImageSourcePropType;
  title: string;
  image?: ImageSourcePropType;
  frames: readonly [IncidentCasebookComicFrame, IncidentCasebookComicFrame, IncidentCasebookComicFrame, IncidentCasebookComicFrame];
  isNew?: boolean;
};

export type IncidentCasebookScreenProps = {
  activeCase: IncidentCasebookActiveCase | null;
  enemies: readonly IncidentCasebookEnemyEntry[];
  comics: readonly IncidentCasebookComicEntry[];
  initialTab?: IncidentCasebookTab;
  onSelectCase: (caseId: string) => void;
  onResume: () => void;
  onReplayIncidentIntro: () => void;
  onReplayOrganizationIntro: () => void;
  onClose: () => void;
  reduceMotion?: boolean;
};

const TABS: readonly { id: IncidentCasebookTab; label: string }[] = [
  { id: 'active', label: '未解決' },
  { id: 'enemies', label: '怪盗名簿' },
  { id: 'comics', label: '救出4コマ' },
];

function Text(props: TextProps) {
  return <RNText maxFontSizeMultiplier={1.25} {...props} />;
}

export function IncidentCasebookScreen({
  activeCase,
  enemies,
  comics,
  initialTab = 'active',
  onSelectCase,
  onResume,
  onReplayIncidentIntro,
  onReplayOrganizationIntro,
  onClose,
}: IncidentCasebookScreenProps) {
  const [tab, setTab] = useState<IncidentCasebookTab>(initialTab);
  const [selectedEnemy, setSelectedEnemy] = useState<Extract<IncidentCasebookEnemyEntry, { state: 'revealed' }> | null>(null);
  const [comicIndex, setComicIndex] = useState(0);

  useEffect(() => {
    setComicIndex((current) => Math.max(0, Math.min(current, comics.length - 1)));
  }, [comics.length]);

  const selectTab = (next: IncidentCasebookTab) => {
    setSelectedEnemy(null);
    setTab(next);
  };

  return <View style={styles.root} accessibilityLabel="事件手帳">
    <View style={styles.header}>
      <View>
        <Text style={styles.eyebrow}>COLLECTION & CASES</Text>
        <Text style={styles.heading}>事件手帳</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="事件手帳を閉じる" onPress={onClose} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
        <Text style={styles.closeText}>×</Text>
      </Pressable>
    </View>

    <View accessibilityRole="tablist" style={styles.segmented}>
      {TABS.map((item) => <Pressable
        key={item.id}
        accessibilityRole="tab"
        accessibilityState={{ selected: tab === item.id }}
        accessibilityLabel={`${item.label}タブ`}
        onPress={() => selectTab(item.id)}
        style={({ pressed }) => [styles.segment, tab === item.id && styles.segmentSelected, pressed && styles.pressed]}
      ><Text style={[styles.segmentText, tab === item.id && styles.segmentTextSelected]}>{item.label}</Text></Pressable>)}
    </View>

    <View style={styles.panel}>
      {tab === 'active' ? <ActiveCasePanel activeCase={activeCase} onSelectCase={onSelectCase} onResume={onResume} onReplayIncidentIntro={onReplayIncidentIntro} /> : null}
      {tab === 'enemies' ? selectedEnemy
        ? <EnemyDetail enemy={selectedEnemy} onBack={() => setSelectedEnemy(null)} />
        : <EnemyRoster enemies={enemies} onSelect={setSelectedEnemy} onReplayOrganizationIntro={onReplayOrganizationIntro} /> : null}
      {tab === 'comics' ? <ComicArchive comics={comics} index={comicIndex} onIndexChange={setComicIndex} /> : null}
    </View>
  </View>;
}

function ActiveCasePanel({ activeCase, onSelectCase, onResume, onReplayIncidentIntro }: Pick<IncidentCasebookScreenProps, 'activeCase' | 'onSelectCase' | 'onResume' | 'onReplayIncidentIntro'>) {
  if (!activeCase) return <View style={styles.empty} accessible accessibilityLabel="未解決事件はありません">
    <View style={styles.completeMark}><Text style={styles.completeMarkText}>✓</Text></View>
    <Text style={styles.emptyTitle}>未解決事件はありません</Text>
    <Text style={styles.bodyCenter}>新しい事件が起きたら、ここに手掛かりと続きから遊ぶボタンが届きます。</Text>
  </View>;

  const primaryLabel = activeCase.canResume
    ? activeCase.introSeen ? '捜査をつづける' : '事件を確認する'
    : activeCase.progressLabel.includes('解決済み') ? 'もう一度捜査する' : 'この事件を始める';
  const primaryAction = activeCase.canResume ? onResume : () => onSelectCase(activeCase.id);
  return <View style={styles.activePanel}>
    <View style={styles.activeCard} accessible accessibilityLabel={`${activeCase.chapter}、${activeCase.title}。${activeCase.canResume ? '被害モビー' : '事件の対象候補'}、${activeCase.targetName}。${activeCase.canResume && !activeCase.introSeen ? '事件通知は未確認。' : ''}${activeCase.progressLabel}。目的、${activeCase.objective}`}>
      <View style={styles.activeTop}>
        <View style={styles.targetHalo}><Image source={activeCase.targetImage} resizeMode="contain" style={styles.targetImage} /></View>
        <View style={styles.activeCopy}>
          <Text style={styles.chapter}>{activeCase.chapter}</Text>
          <Text numberOfLines={2} style={styles.activeTitle}>{activeCase.title}</Text>
          <Text style={styles.targetLabel}>{activeCase.canResume ? '被害モビー' : '事件の対象候補'}　{activeCase.targetName}</Text>
        </View>
      </View>
      <View style={styles.progressCard}>
        <Text style={styles.progressLabel}>{activeCase.canResume ? 'いまの進み具合' : '事件の状態'}</Text>
        <Text numberOfLines={1} style={styles.progressValue}>● {activeCase.progressLabel}</Text>
        <Text numberOfLines={2} style={styles.objective}>{activeCase.canResume ? '次' : '内容'}：{activeCase.objective}</Text>
      </View>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={primaryLabel} onPress={primaryAction} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
      <Text style={styles.primaryText}>{primaryLabel}</Text>
    </Pressable>
    {activeCase.canResume && activeCase.introSeen ? <Pressable accessibilityRole="button" accessibilityLabel="この事件の始まりをもう一度見る" onPress={onReplayIncidentIntro} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
      <Text style={styles.secondaryText}>事件の始まりをもう一度見る</Text>
    </Pressable> : null}
  </View>;
}

function EnemyRoster({ enemies, onSelect, onReplayOrganizationIntro }: { enemies: readonly IncidentCasebookEnemyEntry[]; onSelect: (enemy: Extract<IncidentCasebookEnemyEntry, { state: 'revealed' }>) => void; onReplayOrganizationIntro: () => void }) {
  const slots = Array.from({ length: 7 }, (_, index) => enemies.find((enemy) => enemy.revealOrder === index + 1));
  return <View style={styles.rosterPanel}>
    <View style={styles.panelHeadingRow}>
      <View style={styles.panelHeadingCopy}><Text style={styles.panelTitle}>七人の怪盗団</Text><Text style={styles.panelSubtitle}>{enemies.filter((enemy) => enemy.state === 'revealed').length} / 7　正体判明</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="怪盗団についてもう一度見る" onPress={onReplayOrganizationIntro} style={({ pressed }) => [styles.miniButton, pressed && styles.pressed]}><Text style={styles.miniButtonText}>7体について</Text></Pressable>
    </View>
    <View style={styles.rosterRows}>
      <View style={styles.rosterRow}>{slots.slice(0, 4).map((entry, index) => <EnemySlot key={entry?.id ?? `locked-${index}`} entry={entry} order={(index + 1) as 1 | 2 | 3 | 4} onSelect={onSelect} />)}</View>
      <View style={styles.rosterRow}>{slots.slice(4, 7).map((entry, index) => <EnemySlot key={entry?.id ?? `locked-${index + 4}`} entry={entry} order={(index + 5) as 5 | 6 | 7} onSelect={onSelect} />)}<View style={styles.rosterSpacer} /></View>
    </View>
  </View>;
}

function EnemySlot({ entry, order, onSelect }: { entry: IncidentCasebookEnemyEntry | undefined; order: 1 | 2 | 3 | 4 | 5 | 6 | 7; onSelect: (enemy: Extract<IncidentCasebookEnemyEntry, { state: 'revealed' }>) => void }) {
  if (!entry || entry.state === 'locked') {
    const rawUnlockCondition = entry?.unlockCondition ?? '今後の事件';
    const unlockCondition = rawUnlockCondition.includes('解放') ? rawUnlockCondition : `${rawUnlockCondition}で解放`;
    return <View style={[styles.enemyCard, styles.lockedCard]} accessible accessibilityLabel={`怪盗名簿${order}番、未解放。${unlockCondition}`}>
      <Text style={styles.slotNumber}>NO.{order}</Text>
      <GenericSilhouette compact />
      <Text style={styles.unknown}>???</Text>
      <Text numberOfLines={2} style={styles.unlockCopy}>{unlockCondition}</Text>
    </View>;
  }
  return <Pressable accessibilityRole="button" accessibilityLabel={`怪盗名簿${entry.revealOrder}番、${entry.name}。詳細を見る`} onPress={() => onSelect(entry)} style={({ pressed }) => [styles.enemyCard, styles.revealedCard, pressed && styles.pressed]}>
    {entry.isNew ? <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View> : null}
    <Text style={styles.slotNumber}>NO.{entry.revealOrder}</Text>
    <Image source={entry.image} resizeMode="contain" style={styles.rosterImage} />
    <Text numberOfLines={1} style={styles.enemyName}>{entry.name}</Text>
    <Text style={styles.detailCue}>詳細を見る ›</Text>
  </Pressable>;
}

function EnemyDetail({ enemy, onBack }: { enemy: Extract<IncidentCasebookEnemyEntry, { state: 'revealed' }>; onBack: () => void }) {
  const affiliation = enemy.affiliationLabel.includes('敵対') ? enemy.affiliationLabel : `${enemy.affiliationLabel}・敵対`;
  return <View style={styles.detailPanel}>
    <View style={styles.detailHeader}>
      <Pressable accessibilityRole="button" accessibilityLabel="怪盗名簿へ戻る" onPress={onBack} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><Text style={styles.backText}>‹</Text></Pressable>
      <Text style={styles.detailHeaderTitle}>怪盗記録 NO.{enemy.revealOrder}</Text><View style={styles.headerSpacer} />
    </View>
    <View style={styles.detailBody}>
      <View style={styles.detailPortrait}><Image source={enemy.image} resizeMode="contain" style={styles.detailImage} /></View>
      <View style={styles.detailCopy}>
        <Text style={styles.enemyDetailName}>{enemy.name}</Text>
        <Text style={styles.hostileBadge}>◆ {affiliation}</Text>
        <DetailRow label="役割" value={enemy.role} />
        <DetailRow label="盗み方" value={enemy.method} />
        <DetailRow label="事件記録" value={enemy.record} />
      </View>
    </View>
  </View>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text numberOfLines={3} style={styles.detailValue}>{value}</Text></View>;
}

function ComicArchive({ comics, index, onIndexChange }: { comics: readonly IncidentCasebookComicEntry[]; index: number; onIndexChange: (index: number) => void }) {
  if (comics.length === 0) return <View style={styles.empty} accessible accessibilityLabel="救出4コマはまだありません">
    <View style={styles.bookMark}><Text style={styles.bookMarkText}>4</Text></View>
    <Text style={styles.emptyTitle}>救出4コマはまだありません</Text>
    <Text style={styles.bodyCenter}>事件を解決すると、救出したモビーとの記録がここに保存されます。</Text>
  </View>;

  const safeIndex = Math.max(0, Math.min(index, comics.length - 1));
  const comic = comics[safeIndex];
  return <View style={styles.comicPanel}>
    <View style={styles.comicHeader}>
      <View style={styles.comicTarget}><Image source={comic.targetImage} resizeMode="contain" style={styles.comicTargetImage} /><View><Text style={styles.chapter}>救出記録</Text><Text numberOfLines={1} style={styles.comicTitle}>{comic.title}</Text><Text style={styles.comicName}>{comic.targetName}</Text></View></View>
      {comic.isNew ? <View style={styles.newBadgeStatic}><Text style={styles.newBadgeText}>NEW</Text></View> : null}
    </View>
    <View style={styles.comicCanvas} accessible accessibilityLabel={`${comic.title}。${comic.frames.map((frame) => `${frame.panel}コマ目、${frame.alt}`).join('。')}`}>
      {comic.image ? <Image source={comic.image} resizeMode="contain" style={styles.comicFullImage} /> : <View style={styles.frameGrid}>{comic.frames.map((frame) => <ComicFrame key={frame.panel} frame={frame} />)}</View>}
    </View>
    {!comic.image ? <Text style={styles.savedCopy}>✓ 事件記録は保存済み・イラスト準備中</Text> : <Text style={styles.savedCopy}>✓ 事件記録に保存済み</Text>}
    <View style={styles.pager}>
      <Pressable accessibilityRole="button" accessibilityLabel="前の4コマ" accessibilityState={{ disabled: safeIndex === 0 }} disabled={safeIndex === 0} onPress={() => onIndexChange(safeIndex - 1)} style={({ pressed }) => [styles.arrowButton, safeIndex === 0 && styles.disabled, pressed && styles.pressed]}><Text style={styles.arrowText}>‹</Text></Pressable>
      <Text style={styles.pageCount}>{safeIndex + 1} / {comics.length}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="次の4コマ" accessibilityState={{ disabled: safeIndex === comics.length - 1 }} disabled={safeIndex === comics.length - 1} onPress={() => onIndexChange(safeIndex + 1)} style={({ pressed }) => [styles.arrowButton, safeIndex === comics.length - 1 && styles.disabled, pressed && styles.pressed]}><Text style={styles.arrowText}>›</Text></Pressable>
    </View>
  </View>;
}

function ComicFrame({ frame }: { frame: IncidentCasebookComicFrame }) {
  return <View style={styles.frame}>
    <Text style={styles.frameNumber}>FRAME {frame.panel}</Text>
    {frame.image ? <Image source={frame.image} resizeMode="cover" style={styles.frameImage} /> : <View style={styles.framePlaceholder}><View style={styles.placeholderSpark}><Text style={styles.placeholderSparkText}>✦</Text></View><Text style={styles.preparing}>イラスト準備中</Text></View>}
    <Text numberOfLines={3} style={styles.caption}>{frame.caption}</Text>
  </View>;
}

function GenericSilhouette({ compact = false }: { compact?: boolean }) {
  return <View pointerEvents="none" style={[styles.silhouette, compact && styles.silhouetteCompact]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <View style={[styles.silhouetteHead, compact && styles.silhouetteHeadCompact]} />
    <View style={[styles.silhouetteBody, compact && styles.silhouetteBodyCompact]} />
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, height: '100%', overflow: 'hidden', paddingHorizontal: 14, paddingTop: 4, paddingBottom: 82, backgroundColor: '#F8F3F5' },
  header: { height: 52, flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#9B6877', fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: .8 },
  heading: { color: '#3C2932', fontSize: 24, lineHeight: 29, fontWeight: '900' },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEE4E8' },
  closeText: { color: '#513943', fontSize: 27, lineHeight: 30, fontWeight: '500' },
  backText: { color: '#513943', fontSize: 32, lineHeight: 34, fontWeight: '500' },
  headerSpacer: { width: 44, height: 44 },
  segmented: { height: 50, flexShrink: 0, flexDirection: 'row', padding: 3, borderRadius: 12, backgroundColor: '#E8DDE1' },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  segmentSelected: { backgroundColor: '#FFF', shadowColor: '#4A2330', shadowOpacity: .12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  segmentText: { color: '#725765', fontSize: 15, fontWeight: '800' },
  segmentTextSelected: { color: '#9D3E55' },
  panel: { flex: 1, minHeight: 0, paddingTop: 8, overflow: 'hidden' },
  activePanel: { flex: 1, minHeight: 0, justifyContent: 'flex-end', gap: 8 },
  activeCard: { flex: 1, minHeight: 0, maxHeight: 346, justifyContent: 'space-evenly', borderRadius: 22, padding: 16, backgroundColor: '#2A1B2F' },
  activeTop: { minHeight: 132, flexDirection: 'row', alignItems: 'center', gap: 12 },
  targetHalo: { width: 112, height: 126, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.08)' },
  targetImage: { width: 106, height: 116 },
  activeCopy: { flex: 1, gap: 4 },
  chapter: { color: '#B05066', fontSize: 13, lineHeight: 17, fontWeight: '900' },
  activeTitle: { color: '#FFF8F2', fontSize: 22, lineHeight: 27, fontWeight: '900' },
  targetLabel: { color: '#F6DCE3', fontSize: 17, lineHeight: 22, fontWeight: '700' },
  progressCard: { minHeight: 106, justifyContent: 'center', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,.09)', borderLeftWidth: 4, borderLeftColor: '#F3A1B0' },
  progressLabel: { color: '#E8C7D0', fontSize: 13, lineHeight: 17, fontWeight: '800' },
  progressValue: { color: '#FFF', fontSize: 18, lineHeight: 23, fontWeight: '900', marginTop: 2 },
  objective: { color: '#F6E9E5', fontSize: 17, lineHeight: 22, fontWeight: '700', marginTop: 4 },
  primary: { width: '100%', minHeight: 54, flexShrink: 0, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C8465E' },
  primaryText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  secondary: { width: '100%', minHeight: 44, flexShrink: 0, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#B9A5AC', backgroundColor: '#FFF' },
  secondaryText: { color: '#654A56', fontSize: 17, fontWeight: '800' },
  empty: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  completeMark: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DDEDE5' },
  completeMarkText: { color: '#3C7759', fontSize: 42, fontWeight: '900' },
  bookMark: { width: 84, height: 84, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEE0E5', borderWidth: 3, borderColor: '#B16A7D' },
  bookMarkText: { color: '#9C4058', fontSize: 42, fontWeight: '900' },
  emptyTitle: { color: '#3D2B34', fontSize: 21, lineHeight: 27, fontWeight: '900', textAlign: 'center' },
  bodyCenter: { color: '#6C5862', fontSize: 17, lineHeight: 24, fontWeight: '600', textAlign: 'center' },
  rosterPanel: { flex: 1, minHeight: 0 },
  panelHeadingRow: { minHeight: 52, flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelHeadingCopy: { flex: 1 },
  panelTitle: { color: '#3D2B34', fontSize: 20, lineHeight: 25, fontWeight: '900' },
  panelSubtitle: { color: '#705761', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  miniButton: { minWidth: 102, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#EEE2E6' },
  miniButtonText: { color: '#724A59', fontSize: 14, fontWeight: '900' },
  rosterRows: { flex: 1, minHeight: 0, justifyContent: 'space-evenly', gap: 6 },
  rosterRow: { flex: 1, minHeight: 0, maxHeight: 186, flexDirection: 'row', gap: 6 },
  rosterSpacer: { flex: 1 },
  enemyCard: { flex: 1, minWidth: 0, minHeight: 0, borderRadius: 15, paddingHorizontal: 5, paddingTop: 6, paddingBottom: 7, alignItems: 'center', overflow: 'hidden' },
  lockedCard: { backgroundColor: '#DDD3D8', borderWidth: 1, borderColor: '#CABDC3' },
  revealedCard: { backgroundColor: '#2B1E31', borderWidth: 1, borderColor: '#8F6B7A' },
  slotNumber: { alignSelf: 'flex-start', color: '#9B7481', fontSize: 11, lineHeight: 14, fontWeight: '900' },
  silhouette: { width: 116, height: 138, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 12 },
  silhouetteCompact: { width: 58, height: 82, paddingTop: 5 },
  silhouetteHead: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#615860' },
  silhouetteHeadCompact: { width: 27, height: 27, borderRadius: 14 },
  silhouetteBody: { width: 96, height: 82, marginTop: -2, borderTopLeftRadius: 46, borderTopRightRadius: 46, backgroundColor: '#615860' },
  silhouetteBodyCompact: { width: 54, height: 50, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  unknown: { color: '#443A40', fontSize: 17, lineHeight: 20, fontWeight: '900', letterSpacing: 1 },
  unlockCopy: { color: '#62535A', fontSize: 17, lineHeight: 20, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  rosterImage: { width: '100%', height: 92 },
  enemyName: { color: '#FFF8F4', fontSize: 17, lineHeight: 21, fontWeight: '900', textAlign: 'center' },
  detailCue: { color: '#F2B7C5', fontSize: 11, lineHeight: 14, fontWeight: '800', marginTop: 2 },
  newBadge: { position: 'absolute', top: 5, right: 5, zIndex: 2, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2, backgroundColor: '#D7526A' },
  newBadgeStatic: { borderRadius: 9, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: '#D7526A' },
  newBadgeText: { color: '#FFF', fontSize: 10, lineHeight: 13, fontWeight: '900' },
  detailPanel: { flex: 1, minHeight: 0 },
  detailHeader: { height: 44, flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailHeaderTitle: { color: '#4A333D', fontSize: 17, fontWeight: '900' },
  detailBody: { flex: 1, minHeight: 0, flexDirection: 'row', alignItems: 'stretch', gap: 12, paddingTop: 8 },
  detailPortrait: { width: '43%', minHeight: 0, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#2B1E31' },
  detailImage: { width: '118%', height: '100%' },
  detailCopy: { flex: 1, minHeight: 0, justifyContent: 'space-evenly' },
  enemyDetailName: { color: '#3D2933', fontSize: 25, lineHeight: 30, fontWeight: '900' },
  hostileBadge: { alignSelf: 'flex-start', color: '#7F263B', fontSize: 13, lineHeight: 17, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F7D4DB' },
  detailRow: { borderRadius: 13, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#FFF' },
  detailLabel: { color: '#A04C62', fontSize: 12, lineHeight: 15, fontWeight: '900' },
  detailValue: { color: '#4B3941', fontSize: 17, lineHeight: 21, fontWeight: '700', marginTop: 1 },
  comicPanel: { flex: 1, minHeight: 0, justifyContent: 'space-between' },
  comicHeader: { minHeight: 56, flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  comicTarget: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9 },
  comicTargetImage: { width: 54, height: 54 },
  comicTitle: { color: '#412F38', fontSize: 18, lineHeight: 22, fontWeight: '900', maxWidth: 270 },
  comicName: { color: '#765D68', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  comicCanvas: { flex: 1, minHeight: 0, maxHeight: 310, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFF', borderWidth: 2, borderColor: '#3C3036' },
  comicFullImage: { width: '100%', height: '100%' },
  frameGrid: { flex: 1, minHeight: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 4 },
  frame: { width: '49.3%', minHeight: 0, height: '49.3%', overflow: 'hidden', borderWidth: 1, borderColor: '#5B4A52', backgroundColor: '#FFFDF9' },
  frameNumber: { position: 'absolute', top: 3, left: 4, zIndex: 2, color: '#8B5D6B', fontSize: 10, lineHeight: 13, fontWeight: '900' },
  frameImage: { flex: 1, minHeight: 0, width: '100%' },
  framePlaceholder: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1E7EA' },
  placeholderSpark: { width: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DAC6CD' },
  placeholderSparkText: { color: '#8C6773', fontSize: 18, fontWeight: '900' },
  preparing: { color: '#715D65', fontSize: 11, lineHeight: 14, fontWeight: '800', marginTop: 3 },
  caption: { minHeight: 61, paddingHorizontal: 5, paddingVertical: 2, color: '#4A3941', fontSize: 17, lineHeight: 19, fontWeight: '700' },
  savedCopy: { color: '#496F5A', fontSize: 13, lineHeight: 17, fontWeight: '800', textAlign: 'center' },
  pager: { height: 44, flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  arrowButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7D9DE' },
  arrowText: { color: '#5E404C', fontSize: 32, lineHeight: 34, fontWeight: '600' },
  pageCount: { minWidth: 58, color: '#56424B', fontSize: 17, fontWeight: '900', textAlign: 'center' },
  disabled: { opacity: .35 },
  pressed: { opacity: .78, transform: [{ scale: .98 }] },
});
