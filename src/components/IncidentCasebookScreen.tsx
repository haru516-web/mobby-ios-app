import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageBackground,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
} from 'react-native';

import { MobbyAssetButton, MobbyAssetSelectable } from '@/components/mobby-ui';
import { Text } from '@/ui/layout/visualPrimitives';

export type IncidentCasebookTab = 'active' | 'episodes' | 'relationships';
export type IncidentCasebookActiveEpisode = { title: string; chapter: string; targetName: string; targetImage: ImageSourcePropType; enemyName: string; enemyImage: ImageSourcePropType; progressLabel: string };
export type IncidentCasebookEpisodeEntry = { episodeId: string; chapter: string; title: string; synopsis: string; enemyName: string; targetName: string; keyVisual: ImageSourcePropType; memorableLine: string; relationship: string; endingLabel: string | null; unseenEndingLabel: string | null; playCount: number; unlocked: boolean };
export type IncidentCasebookRelationshipEntry = { id: string; enemyName: string; mobbyName: string; label: string; image: ImageSourcePropType };
export type IncidentCasebookActiveCase = IncidentCasebookActiveEpisode;
export type IncidentCasebookComicEntry = IncidentCasebookEpisodeEntry;
export type IncidentCasebookEnemyEntry = IncidentCasebookRelationshipEntry;
export type IncidentCasebookScreenProps = { activeEpisode: IncidentCasebookActiveEpisode | null; episodes: readonly IncidentCasebookEpisodeEntry[]; relationships: readonly IncidentCasebookRelationshipEntry[]; initialTab?: IncidentCasebookTab; onResume: () => void; onRestart: () => void; onStart: () => void; onPlayEpisode: (episodeId: string) => void; onClose: () => void; entryNonce?: number; embedded?: boolean };

const CASEBOOK_BACKGROUND = require('../../assets/incidents/midnight-mansion-corridor-v2.png');
const CASEBOOK_FRAME = require('../../assets/generated-ui/surface-dark-case-tall-v1.png');
const CASEBOOK_BACKGROUND_RATIO = 941 / 1672;
const CASEBOOK_FRAME_RATIO = 1086 / 1448;

const TABS: readonly { id: IncidentCasebookTab; label: string }[] = [
  { id: 'active', label: '進行中' },
  { id: 'episodes', label: 'エピソード' },
  { id: 'relationships', label: '関係性' },
];

function balancedCaseTitle(title: string) {
  if (title.length < 12) return title;
  const midpoint = Math.ceil(title.length / 2);
  return `${title.slice(0, midpoint)}\n${title.slice(midpoint)}`;
}

function Pager({ index, length, label, onChange }: { index: number; length: number; label: string; onChange: (index: number) => void }) {
  if (length <= 1) return <Text style={styles.pagerCount}>{length ? '1 / 1' : '0 / 0'}</Text>;
  const previous = (index - 1 + length) % length;
  const next = (index + 1) % length;
  return <View accessibilityLabel={`${label} ${index + 1}件目、全${length}件`} style={styles.pager}>
    <MobbyAssetButton accessibilityLabel={`前の${label}`} backgroundResizeMode="contain" tone="cream" onPress={() => onChange(previous)} style={styles.pagerButton} contentStyle={styles.pagerButtonContent}>
      <Text style={styles.pagerArrow}>‹</Text>
    </MobbyAssetButton>
    <Text style={styles.pagerCount}>{index + 1} / {length}</Text>
    <MobbyAssetButton accessibilityLabel={`次の${label}`} backgroundResizeMode="contain" tone="cream" onPress={() => onChange(next)} style={styles.pagerButton} contentStyle={styles.pagerButtonContent}>
      <Text style={styles.pagerArrow}>›</Text>
    </MobbyAssetButton>
  </View>;
}

export function IncidentCasebookScreen({
  activeEpisode,
  episodes,
  relationships,
  initialTab = 'active',
  onResume,
  onRestart,
  onStart,
  onPlayEpisode,
  entryNonce = 0,
  embedded = false,
}: IncidentCasebookScreenProps) {
  const [tab, setTab] = useState(initialTab);
  const [episodeIndex, setEpisodeIndex] = useState(0);
  const [relationshipIndex, setRelationshipIndex] = useState(0);
  const [rootSize, setRootSize] = useState({ width: 455, height: 782 });
  const [stageSize, setStageSize] = useState({ width: 360, height: 500 });
  const entryMotion = useRef(new Animated.Value(1)).current;

  useEffect(() => setTab(initialTab), [initialTab]);
  useEffect(() => setEpisodeIndex((current) => Math.min(current, Math.max(0, episodes.length - 1))), [episodes.length]);
  useEffect(() => setRelationshipIndex((current) => Math.min(current, Math.max(0, relationships.length - 1))), [relationships.length]);
  useEffect(() => {
    entryMotion.stopAnimation();
    entryMotion.setValue(0);
    const animation = Animated.timing(entryMotion, { toValue: 1, duration: 460, useNativeDriver: typeof document === 'undefined' });
    animation.start();
    return () => animation.stop();
  }, [entryMotion, entryNonce]);

  const frameSize = useMemo(() => {
    const heightFromWidth = stageSize.width / CASEBOOK_FRAME_RATIO;
    const height = Math.max(1, Math.min(stageSize.height, heightFromWidth));
    return { width: height * CASEBOOK_FRAME_RATIO, height };
  }, [stageSize]);
  const backgroundSize = useMemo(() => {
    const availableWidth = Math.max(1, rootSize.width - 16);
    const availableHeight = Math.max(1, rootSize.height - 4);
    const widthFromHeight = availableHeight * CASEBOOK_BACKGROUND_RATIO;
    if (widthFromHeight <= availableWidth) return { width: widthFromHeight, height: availableHeight };
    return { width: availableWidth, height: availableWidth / CASEBOOK_BACKGROUND_RATIO };
  }, [rootSize]);
  const compact = frameSize.height < 455;
  const episode = episodes[episodeIndex] ?? null;
  const relationship = relationships[relationshipIndex] ?? null;
  const handleRootLayout = (event: LayoutChangeEvent) => setRootSize(event.nativeEvent.layout);
  const handleStageLayout = (event: LayoutChangeEvent) => setStageSize(event.nativeEvent.layout);

  const activeContent = activeEpisode ? <View style={styles.section}>
    <Text numberOfLines={1} style={styles.kicker}>{activeEpisode.chapter} ・ {activeEpisode.progressLabel}</Text>
    <Text accessibilityRole="header" numberOfLines={2} style={[styles.caseTitle, compact && styles.caseTitleCompact]}>{compact ? balancedCaseTitle(activeEpisode.title) : activeEpisode.title}</Text>
    <View style={[styles.pair, compact && styles.pairCompact]}>
      <Image accessible={false} source={activeEpisode.enemyImage} resizeMode="contain" style={styles.person} />
      <Text style={styles.cross}>×</Text>
      <Image accessible={false} source={activeEpisode.targetImage} resizeMode="contain" style={styles.person} />
    </View>
    <Text numberOfLines={1} style={styles.meta}>{activeEpisode.enemyName} × {activeEpisode.targetName}</Text>
    <View style={styles.actionRow}>
      <MobbyAssetButton accessibilityLabel={`${activeEpisode.title}を続きから再生`} backgroundResizeMode="cover" onPress={onResume} style={styles.actionButton} contentStyle={styles.actionContent}>
        <Text style={styles.primaryText}>続きから</Text>
      </MobbyAssetButton>
      <MobbyAssetButton accessibilityLabel={`${activeEpisode.title}を最初から再生`} backgroundResizeMode="cover" tone="cream" onPress={onRestart} style={styles.actionButton} contentStyle={styles.actionContent}>
        <Text style={styles.secondaryText}>最初から</Text>
      </MobbyAssetButton>
    </View>
  </View> : <View style={[styles.section, styles.centerSection]}>
    <Text style={styles.kicker}>CASE FILE 01</Text>
    <Text accessibilityRole="header" style={styles.caseTitle}>第1話を始めよう</Text>
    <Text style={styles.emptyLead}>金庫破りとれおもびの、妙に優雅なティータイム。</Text>
    <MobbyAssetButton accessibilityLabel="第1話を開始" backgroundResizeMode="cover" onPress={onStart} style={styles.startButton} contentStyle={styles.actionContent}>
      <Text style={styles.primaryText}>第1話を開始</Text>
    </MobbyAssetButton>
  </View>;

  const episodeContent = episode ? <View style={styles.section}>
    <Pager index={episodeIndex} length={episodes.length} label="エピソード" onChange={setEpisodeIndex} />
    <Text numberOfLines={1} style={styles.kicker}>{episode.chapter} ・ {episode.unlocked ? `再生 ${episode.playCount}回` : '前話クリアで解放'}</Text>
    <Text accessibilityRole="header" numberOfLines={compact ? 2 : 1} style={[styles.caseTitle, compact && styles.caseTitleCompact]}>{episode.unlocked && compact ? balancedCaseTitle(episode.title) : episode.unlocked ? episode.title : '？？？'}</Text>
    {episode.unlocked ? <>
      <Image accessible={false} source={episode.keyVisual} resizeMode="cover" style={[styles.episodeVisual, compact && styles.episodeVisualCompact]} />
      <Text numberOfLines={1} style={styles.meta}>{episode.enemyName} × {episode.targetName}</Text>
      <Text numberOfLines={compact ? 1 : 2} style={styles.body}>{episode.synopsis}</Text>
      {episode.playCount > 0 ? <View style={styles.record}>
        <Text numberOfLines={1} style={styles.quote}>「{episode.memorableLine}」</Text>
        <Text numberOfLines={1} style={styles.relationship}>関係性：{episode.relationship}</Text>
        <Text numberOfLines={1} style={styles.ending}>閲覧済み：{episode.endingLabel ?? 'なし'}</Text>
        <Text numberOfLines={1} style={styles.locked}>{episode.unseenEndingLabel ? `未閲覧：${episode.unseenEndingLabel}` : '両方のendingを閲覧済み'}</Text>
      </View> : <Text style={styles.locked}>未再生・ending未閲覧</Text>}
      <MobbyAssetButton accessibilityLabel={`${episode.title}を最初から再生`} backgroundResizeMode="cover" tone="cream" onPress={() => onPlayEpisode(episode.episodeId)} style={styles.replayButton} contentStyle={styles.actionContent}>
        <Text style={styles.secondaryText}>最初から再生</Text>
      </MobbyAssetButton>
    </> : <View style={styles.lockedSection}>
      <Text style={styles.locked}>第1話から順番にエピソードを完走してください。</Text>
    </View>}
  </View> : <View style={[styles.section, styles.centerSection]}><Text style={styles.emptyLead}>エピソードはまだありません。</Text></View>;

  const relationshipContent = relationship ? <View style={styles.section}>
    <Pager index={relationshipIndex} length={relationships.length} label="関係性" onChange={setRelationshipIndex} />
    <Text style={styles.kicker}>RELATIONSHIP RECORD</Text>
    <Image accessible={false} source={relationship.image} resizeMode="contain" style={[styles.relationshipImage, compact && styles.relationshipImageCompact]} />
    <Text accessibilityRole="header" numberOfLines={1} style={styles.caseTitle}>{relationship.enemyName} × {relationship.mobbyName}</Text>
    <Text numberOfLines={3} style={styles.relationshipLead}>{relationship.label}</Text>
  </View> : <View style={[styles.section, styles.centerSection]}>
    <Text style={styles.kicker}>RELATIONSHIP RECORD</Text>
    <Text style={styles.emptyLead}>関係性はエピソード完走後に記録されます。</Text>
  </View>;

  return <Animated.View onLayout={handleRootLayout} style={[styles.root, embedded && styles.rootEmbedded, {
    opacity: entryMotion.interpolate({ inputRange: [0, 0.42, 1], outputRange: [0.5, 0.84, 1] }),
    transform: [
      { translateY: entryMotion.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
      { scale: entryMotion.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
    ],
  }]}>
    <ImageBackground
      accessible={false}
      imageStyle={styles.backgroundImage}
      resizeMode={embedded ? 'cover' : 'contain'}
      source={CASEBOOK_BACKGROUND}
      style={[styles.background, embedded ? styles.backgroundEmbedded : backgroundSize]}
    >
      {embedded ? null : <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>CASE ARCHIVE</Text>
          <Text accessibilityRole="header" style={styles.heading}>事件ファイル</Text>
        </View>
      </View>}
      <View accessibilityRole="tablist" accessibilityLabel="事件ファイルの表示内容" style={[styles.tabs, embedded && styles.tabsEmbedded]}>
        {TABS.map((item) => <MobbyAssetSelectable key={item.id} variant="labelPill" accessibilityRole="tab" accessibilityLabel={item.label} selected={tab === item.id} onPress={() => setTab(item.id)} style={[styles.tab, tab !== item.id && styles.tabOff]} contentStyle={styles.tabContent}>
          <Text numberOfLines={1} style={[styles.tabText, tab === item.id && styles.tabTextOn]}>{item.label}</Text>
        </MobbyAssetSelectable>)}
      </View>
      <View onLayout={handleStageLayout} style={styles.stage}>
        <ImageBackground accessible={false} imageStyle={styles.frameImage} resizeMode="contain" source={CASEBOOK_FRAME} style={[styles.frame, frameSize]}>
          <View style={[styles.frameContent, compact && styles.frameContentCompact]}>
            {tab === 'active' ? activeContent : null}
            {tab === 'episodes' ? episodeContent : null}
            {tab === 'relationships' ? relationshipContent : null}
          </View>
        </ImageBackground>
      </View>
    </ImageBackground>
  </Animated.View>;
}

const lightTextShadow = { textShadowColor: 'rgba(30, 12, 21, 0.88)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 } as const;

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  rootEmbedded: { minHeight: 0, alignItems: 'stretch' },
  background: { minHeight: 0, paddingTop: 8, paddingBottom: 80, borderRadius: 28, overflow: 'hidden' },
  backgroundEmbedded: { flex: 1, alignSelf: 'stretch', paddingTop: 2, paddingBottom: 4 },
  backgroundImage: { opacity: 0.96, borderRadius: 28 },
  header: { minHeight: 62, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCopy: { flex: 1 },
  eyebrow: { color: '#E9A5AC', fontSize: 10, lineHeight: 13, fontWeight: '900', letterSpacing: 1.7, ...lightTextShadow },
  heading: { color: '#FFF0DB', fontSize: 24, lineHeight: 29, fontWeight: '900', ...lightTextShadow },
  tabs: { height: 45, paddingHorizontal: 12, paddingVertical: 3, flexDirection: 'row', gap: 5 },
  tabsEmbedded: { marginTop: 0 },
  tab: { flex: 1, height: 39, outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  tabOff: { opacity: 0.64 },
  tabContent: { height: 39, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  tabText: { color: '#694E63', fontSize: 11, lineHeight: 15, fontWeight: '900', textAlign: 'center' },
  tabTextOn: { color: '#9A4059' },
  stage: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  frame: { alignItems: 'stretch', borderRadius: 24, overflow: 'hidden' },
  frameImage: { borderRadius: 24 },
  frameContent: { flex: 1, paddingTop: '8%', paddingBottom: '8%', paddingHorizontal: '10%' },
  frameContentCompact: { paddingTop: '7%', paddingBottom: '7%' },
  section: { flex: 1, minHeight: 0, alignItems: 'stretch', gap: 4 },
  centerSection: { justifyContent: 'center', alignItems: 'center', gap: 16 },
  kicker: { color: '#E8A0A8', fontSize: 10, lineHeight: 13, fontWeight: '900', letterSpacing: 0.7, textAlign: 'center', ...lightTextShadow },
  caseTitle: { color: '#FFF1DF', fontSize: 20, lineHeight: 25, fontWeight: '900', textAlign: 'center', ...lightTextShadow },
  caseTitleCompact: { fontSize: 14, lineHeight: 18 },
  pair: { flex: 1, minHeight: 90, maxHeight: 155, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  pairCompact: { maxHeight: 112 },
  person: { width: '42%', height: '100%' },
  cross: { color: '#E58D9D', fontSize: 25, lineHeight: 29, fontWeight: '900', ...lightTextShadow },
  meta: { color: '#F4C8C4', fontSize: 12, lineHeight: 16, fontWeight: '900', textAlign: 'center', ...lightTextShadow },
  body: { color: '#F6E5D8', fontSize: 11, lineHeight: 15, textAlign: 'center', ...lightTextShadow },
  emptyLead: { maxWidth: 270, color: '#F6E5D8', fontSize: 13, lineHeight: 20, fontWeight: '700', textAlign: 'center', ...lightTextShadow },
  actionRow: { flexDirection: 'row', gap: 7, marginTop: 4 },
  actionButton: { flex: 1, height: 43 },
  startButton: { width: '78%', height: 46 },
  replayButton: { alignSelf: 'center', width: '76%', height: 39, marginTop: 2 },
  actionContent: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  primaryText: { color: '#FFF9ED', fontSize: 13, lineHeight: 17, fontWeight: '900', textAlign: 'center' },
  secondaryText: { color: '#70485E', fontSize: 12, lineHeight: 16, fontWeight: '900', textAlign: 'center' },
  pager: { height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  pagerButton: { width: 43, height: 30 },
  pagerButtonContent: { width: 43, height: 30, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 0, paddingVertical: 0 },
  pagerArrow: { color: '#70485E', fontSize: 21, lineHeight: 23, fontWeight: '900', marginTop: -2 },
  pagerCount: { minWidth: 48, color: '#F4D0C8', fontSize: 11, lineHeight: 15, fontWeight: '900', textAlign: 'center', ...lightTextShadow },
  episodeVisual: { alignSelf: 'center', width: '88%', flex: 1, minHeight: 68, maxHeight: 108, borderRadius: 12 },
  episodeVisualCompact: { maxHeight: 78 },
  record: { gap: 1 },
  quote: { color: '#F5C8CF', fontSize: 10, lineHeight: 14, fontWeight: '800', fontStyle: 'italic', textAlign: 'center', ...lightTextShadow },
  relationship: { color: '#C8DCBA', fontSize: 10, lineHeight: 14, fontWeight: '900', textAlign: 'center', ...lightTextShadow },
  ending: { color: '#E7C6D4', fontSize: 9, lineHeight: 12, fontWeight: '800', textAlign: 'center', ...lightTextShadow },
  locked: { color: '#C8AFB6', fontSize: 9, lineHeight: 13, textAlign: 'center', ...lightTextShadow },
  lockedSection: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  relationshipImage: { alignSelf: 'center', flex: 1, minHeight: 130, maxHeight: 235, width: '78%' },
  relationshipImageCompact: { maxHeight: 165 },
  relationshipLead: { color: '#D5E6C7', fontSize: 14, lineHeight: 20, fontWeight: '900', textAlign: 'center', ...lightTextShadow },
});
