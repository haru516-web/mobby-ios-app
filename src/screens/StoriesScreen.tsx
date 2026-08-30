import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image, ImageBackground } from 'expo-image';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { MobbyAssetButton, MobbyAssetSurface, MobbyAssetTabButton } from '@/components/mobby-ui';
import { COMIC_CHARACTER_ORDER, COMIC_VOLUMES, getComicsForCharacter, type ComicVolumeId } from '@/data/comics';
import { getMobby, type MobbyId } from '@/data/mobies';
import { IncidentComicsScreen, type IncidentComicsScreenProps } from '@/screens/IncidentComicsScreen';
import { Text } from '@/ui/layout/visualPrimitives';

const STORY_BOARD = require('../../assets/backgrounds/trade-exchange-board.png');

const BOARD_ASPECT_RATIO = 2 / 3;
const COMIC_ASPECT_RATIO = 941 / 1672;
const TAB_BAR_CLEARANCE = 78;
const MAX_BOARD_WIDTH = 440;
const COMIC_PROGRESS_STORAGE = '@mobby/comic-progress-v1';
let comicProgressWriteQueue: Promise<void> = Promise.resolve();

type ComicViewedProgress = Record<MobbyId, ComicVolumeId[]>;

const initialComicProgress = (): ComicViewedProgress => COMIC_CHARACTER_ORDER.reduce<ComicViewedProgress>((progress, id) => {
  progress[id] = [];
  return progress;
}, {} as ComicViewedProgress);

const orderedViewedPrefix = (viewed: ReadonlySet<ComicVolumeId>) => {
  const prefix: ComicVolumeId[] = [];
  for (const volume of COMIC_VOLUMES) {
    if (!viewed.has(volume.id)) break;
    prefix.push(volume.id);
  }
  return prefix;
};

function decodeComicProgress(raw: string | null): ComicViewedProgress {
  const progress = initialComicProgress();
  if (!raw) return progress;
  try {
    const parsed = JSON.parse(raw) as { version?: unknown; viewedByCharacter?: unknown };
    if (parsed.version !== 1 || !parsed.viewedByCharacter || typeof parsed.viewedByCharacter !== 'object') return progress;
    const stored = parsed.viewedByCharacter as Record<string, unknown>;
    const validVolumeIds = new Set<ComicVolumeId>(COMIC_VOLUMES.map((volume) => volume.id));
    for (const id of COMIC_CHARACTER_ORDER) {
      const value = stored[id];
      if (!Array.isArray(value)) continue;
      const viewed = new Set(value.filter((volumeId): volumeId is ComicVolumeId => typeof volumeId === 'string' && validVolumeIds.has(volumeId as ComicVolumeId)));
      progress[id] = orderedViewedPrefix(viewed);
    }
  } catch {
    return progress;
  }
  return progress;
}

function persistComicProgress(progress: ComicViewedProgress) {
  const snapshot = JSON.stringify({ version: 1, viewedByCharacter: progress });
  comicProgressWriteQueue = comicProgressWriteQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(COMIC_PROGRESS_STORAGE, snapshot))
    .catch(() => undefined);
}

type StoriesScreenProps = {
  entryNonce?: number;
  onBlackStarUnlocked?: IncidentComicsScreenProps['onBlackStarUnlocked'];
};

export function StoriesScreen({ entryNonce = 0, onBlackStarUnlocked }: StoriesScreenProps) {
  const [rootSize, setRootSize] = useState({ width: 455, height: 782 });
  const [section, setSection] = useState<'comic' | 'incident'>('comic');
  const [incidentPlayerVisible, setIncidentPlayerVisible] = useState(false);
  const [characterId, setCharacterId] = useState<MobbyId>('mobichi');
  const [readerIndex, setReaderIndex] = useState<number | null>(null);
  const [viewedByCharacter, setViewedByCharacter] = useState<ComicViewedProgress>(initialComicProgress);
  const [progressHydrated, setProgressHydrated] = useState(false);
  const character = getMobby(characterId);
  const comics = useMemo(() => getComicsForCharacter(characterId), [characterId]);
  const selectedComic = readerIndex === null ? null : comics[readerIndex] ?? null;
  const selectedVolume = readerIndex === null ? null : COMIC_VOLUMES[readerIndex] ?? null;

  useEffect(() => {
    setReaderIndex(null);
    setSection('comic');
    setIncidentPlayerVisible(false);
  }, [entryNonce]);
  useEffect(() => {
    let cancelled = false;
    void comicProgressWriteQueue
      .catch(() => undefined)
      .then(() => AsyncStorage.getItem(COMIC_PROGRESS_STORAGE))
      .then((raw) => {
        if (cancelled) return;
        setViewedByCharacter(decodeComicProgress(raw));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setProgressHydrated(true);
      });
    return () => { cancelled = true; };
  }, []);

  const handleRootLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setRootSize((current) => current.width === width && current.height === height ? current : { width, height });
  };

  const availableWidth = Math.max(1, rootSize.width - 14);
  const availableHeight = Math.max(1, rootSize.height - TAB_BAR_CLEARANCE - 8);
  const boardWidth = Math.min(MAX_BOARD_WIDTH, availableWidth, availableHeight * BOARD_ASPECT_RATIO);
  const boardHeight = boardWidth / BOARD_ASPECT_RATIO;
  const compact = boardWidth < 370;

  const comicWidth = Math.min(
    Math.max(1, rootSize.width - 18),
    Math.max(1, availableHeight * COMIC_ASPECT_RATIO),
  );
  const comicHeight = comicWidth / COMIC_ASPECT_RATIO;

  const selectCharacter = (id: MobbyId) => {
    setCharacterId(id);
    setReaderIndex(null);
  };

  const isComicUnlocked = (index: number) => {
    // Mission linkage is intentionally unset for now. Keep every authored
    // volume available while still recording views for a future mission gate.
    return index >= 0 && index < comics.length;
  };

  const openComic = (index: number) => {
    if (!progressHydrated || index < 0 || index >= comics.length || !isComicUnlocked(index)) return;
    setReaderIndex(index);
    const volumeId = comics[index].volumeId;
    if (viewedByCharacter[characterId].includes(volumeId)) return;
    const nextProgress = { ...viewedByCharacter, [characterId]: [...viewedByCharacter[characterId], volumeId] };
    setViewedByCharacter(nextProgress);
    persistComicProgress(nextProgress);
  };

  if (section === 'incident') {
    const sectionValue = section as 'comic' | 'incident';
    return <View style={styles.incidentSectionRoot}>
      {!incidentPlayerVisible ? <MobbyAssetSurface
        pointerEvents="box-none"
        variant="labelPill"
        style={styles.incidentSectionTabsSurface}
        contentStyle={styles.incidentSectionTabsContent}
      >
        <View accessibilityLabel="ストーリーの種類" accessibilityRole="tablist" style={styles.incidentSectionTabs}>
          <MobbyAssetTabButton
            accessibilityLabel="4コマ漫画"
            selected={false}
            onPress={() => setSection('comic')}
            style={[styles.incidentSectionTab, sectionValue === 'comic' && styles.incidentSectionTabActive]}
          >
            <Text style={[styles.incidentSectionTabText, sectionValue === 'comic' && styles.incidentSectionTabTextActive]}>4コマ漫画</Text>
          </MobbyAssetTabButton>
          <MobbyAssetTabButton
            accessibilityLabel="事件"
            selected={section === 'incident'}
            onPress={() => setSection('incident')}
            style={[styles.incidentSectionTab, section === 'incident' && styles.incidentSectionTabActive]}
          >
            <Text style={[styles.incidentSectionTabText, section === 'incident' && styles.incidentSectionTabTextActive]}>事件</Text>
          </MobbyAssetTabButton>
        </View>
      </MobbyAssetSurface> : null}
      <IncidentComicsScreen
        entryNonce={entryNonce}
        onBlackStarUnlocked={onBlackStarUnlocked}
        onPlayerVisibilityChange={setIncidentPlayerVisible}
        style={styles.incidentSectionScreen}
      />
    </View>;
  }

  if (selectedComic && selectedVolume && readerIndex !== null) {
    const first = readerIndex === 0;
    const last = readerIndex === comics.length - 1;
    return <View
      accessibilityLabel={`${character.name}の${selectedVolume.label}「${selectedComic.title}」を表示中`}
      accessibilityViewIsModal
      onLayout={handleRootLayout}
      style={styles.readerRoot}
    >
      <View style={[styles.readerStage, { height: availableHeight }]}>
        <Image
          accessibilityLabel={`${character.name}の4コマ漫画、${selectedVolume.label}、${selectedComic.title}`}
          contentFit="contain"
          source={selectedComic.image}
          style={[styles.comicImage, { width: comicWidth, height: comicHeight }]}
        />
        <MobbyAssetButton
          accessibilityLabel="4コマ漫画一覧に戻る"
          onPress={() => setReaderIndex(null)}
          tone="cream"
          style={styles.readerBack}
          contentStyle={styles.readerButtonContent}
        >
          <Text style={styles.readerButtonText}>‹ 一覧</Text>
        </MobbyAssetButton>
        <MobbyAssetSurface
          accessible
          accessibilityLabel={`${selectedVolume.label}、${selectedComic.title}`}
          pointerEvents="none"
          variant="labelPill"
          style={styles.readerLabel}
          contentStyle={styles.readerLabelContent}
        >
          <Text numberOfLines={1} style={styles.readerVolume}>{selectedVolume.label}</Text>
          <Text numberOfLines={1} style={styles.readerTitle}>{selectedComic.title}</Text>
        </MobbyAssetSurface>
        <View style={styles.readerPager}>
          <MobbyAssetButton
            accessibilityLabel="前の4コマ漫画"
            disabled={first}
            onPress={() => openComic(readerIndex - 1)}
            tone="cream"
            style={styles.readerPagerButton}
            contentStyle={styles.readerButtonContent}
          >
            <Text style={styles.readerButtonText}>‹ 前へ</Text>
          </MobbyAssetButton>
          <MobbyAssetSurface
            pointerEvents="none"
            variant="labelPill"
            style={styles.readerCount}
            contentStyle={styles.readerCountContent}
          >
            <Text style={styles.readerCountText}>{readerIndex + 1} / {comics.length}</Text>
          </MobbyAssetSurface>
          <MobbyAssetButton
            accessibilityLabel="次の4コマ漫画"
            disabled={last || !isComicUnlocked(readerIndex + 1)}
            onPress={() => openComic(readerIndex + 1)}
            tone="cream"
            style={styles.readerPagerButton}
            contentStyle={styles.readerButtonContent}
          >
            <Text style={styles.readerButtonText}>次へ ›</Text>
          </MobbyAssetButton>
        </View>
      </View>
    </View>;
  }

  return <View onLayout={handleRootLayout} style={styles.root}>
    <ImageBackground
      accessible={false}
      imageStyle={styles.boardImage}
      contentFit="contain"
      contentPosition="center"
      source={STORY_BOARD}
      style={[styles.board, { width: boardWidth, height: boardHeight }]}
    >
      <View style={styles.topPanel}>
        <View style={styles.headingRow}>
          <View>
            <Text accessibilityRole="header" style={[styles.heading, compact && styles.headingCompact]}>ストーリー</Text>
          </View>
        </View>
        <View accessibilityLabel="ストーリーの種類" accessibilityRole="tablist" style={[styles.sectionTabs, compact && styles.sectionTabsCompact]}>
          <MobbyAssetTabButton
            accessibilityLabel="4コマ漫画"
            selected
            onPress={() => setSection('comic')}
            style={styles.sectionTab}
          >
            <Text style={[styles.sectionTabText, styles.sectionTabTextActive, compact && styles.sectionTabTextCompact]}>4コマ漫画</Text>
            <View style={styles.sectionTabUnderline} />
          </MobbyAssetTabButton>
          <MobbyAssetTabButton
            accessibilityLabel="事件"
            selected={false}
            onPress={() => setSection('incident')}
            style={styles.sectionTab}
          >
            <Text style={[styles.sectionTabText, compact && styles.sectionTabTextCompact]}>事件</Text>
          </MobbyAssetTabButton>
        </View>
        <ScrollView
          accessibilityLabel="4コマ漫画のキャラ選択"
          contentContainerStyle={[styles.characterRail, compact && styles.characterRailCompact]}
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.characterScroll}
        >
          {COMIC_CHARACTER_ORDER.map((id) => {
            const item = getMobby(id);
            const selected = id === characterId;
            return <Pressable
              key={id}
              accessibilityLabel={`${item.name}の4コマ`}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => selectCharacter(id)}
              style={({ pressed }) => [styles.characterTab, compact && styles.characterTabCompact, pressed && styles.pressed]}
            >
              <View style={[styles.characterImageWrap, compact && styles.characterImageWrapCompact, selected && styles.characterImageWrapSelected]}>
                <Image accessible={false} source={item.image} contentFit="contain" style={styles.characterImage} />
              </View>
              <Text numberOfLines={1} style={[styles.characterName, compact && styles.characterNameCompact, selected && styles.characterNameSelected]}>{item.name}</Text>
              {selected ? <View style={styles.characterUnderline} /> : null}
            </Pressable>;
          })}
        </ScrollView>
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.libraryHeading}>
          <Text numberOfLines={1} style={[styles.libraryTitle, compact && styles.libraryTitleCompact]}>{character.name}の4コマ</Text>
        </View>
        <ScrollView
          accessibilityLabel={`${character.name}の4コマ一覧`}
          contentContainerStyle={[styles.volumeRail, compact && styles.volumeRailCompact]}
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.volumeScroll}
        >
          {comics.map((comic, index) => {
            const volume = COMIC_VOLUMES[index];
            const unlocked = progressHydrated && isComicUnlocked(index);
            return <Pressable
              key={comic.id}
              accessibilityHint={unlocked ? 'タップすると4コマ漫画を大きく表示します' : '前の4コマを見ると解放されます'}
              accessibilityLabel={`${volume.label}、${comic.title}${unlocked ? '' : '、未開放'}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: !unlocked }}
              disabled={!unlocked}
              onPress={() => openComic(index)}
              style={({ pressed }) => [styles.volumeItem, compact && styles.volumeItemCompact, !unlocked && styles.volumeItemLocked, pressed && styles.volumePressed]}
            >
              <View style={[styles.thumbnailFrame, compact && styles.thumbnailFrameCompact]}>
                <Image accessible={false} contentFit="contain" source={comic.thumbnail} style={[styles.thumbnail, !unlocked && styles.thumbnailLocked]} />
                {!unlocked ? <View pointerEvents="none" style={styles.lockedCover}>
                  <Text style={[styles.lockIcon, compact && styles.lockIconCompact]}>🔒</Text>
                  <Text style={[styles.lockedText, compact && styles.lockedTextCompact]}>未開放</Text>
                </View> : null}
              </View>
              <Text numberOfLines={1} style={[styles.volumeLabel, compact && styles.volumeLabelCompact]}>{volume.label}</Text>
              <Text numberOfLines={2} style={[styles.comicTitle, compact && styles.comicTitleCompact]}>{comic.title}</Text>
              <Text style={[styles.readLabel, compact && styles.readLabelCompact, !unlocked && styles.readLabelLocked]}>{unlocked ? '見る ›' : '未開放'}</Text>
              {index < comics.length - 1 ? <View style={styles.volumeDivider} /> : null}
            </Pressable>;
          })}
        </ScrollView>
      </View>
    </ImageBackground>
  </View>;
}

const styles = StyleSheet.create({
  incidentSectionRoot: { flex: 1, minHeight: 0 },
  incidentSectionScreen: { flex: 1, minHeight: 0 },
  incidentSectionTabsSurface: { width: 226, height: 42, alignSelf: 'center', marginTop: 5, marginBottom: -3, zIndex: 5, overflow: 'hidden' },
  incidentSectionTabsContent: { minHeight: 42, paddingHorizontal: 5, paddingVertical: 4 },
  incidentSectionTabs: { flex: 1, flexDirection: 'row', gap: 4 },
  incidentSectionTab: { flex: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  incidentSectionTabActive: { borderBottomWidth: 2, borderBottomColor: '#8C667F' },
  incidentSectionTabText: { color: '#876C79', fontSize: 10, lineHeight: 13, fontWeight: '900' },
  incidentSectionTabTextActive: { color: '#68465F' },
  root: { flex: 1, minHeight: 0, paddingHorizontal: 7, paddingBottom: TAB_BAR_CLEARANCE, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  board: { position: 'relative', borderRadius: 30, overflow: 'hidden' },
  boardImage: { borderRadius: 30 },
  topPanel: { position: 'absolute', top: '12.6%', left: '13%', right: '13%', height: '31%', paddingTop: 4 },
  bottomPanel: { position: 'absolute', top: '46.5%', left: '13%', right: '13%', bottom: '7.2%', paddingTop: 7, paddingBottom: 6 },
  headingRow: { minHeight: 45, alignItems: 'flex-start' },
  heading: { color: '#62435C', fontSize: 21, lineHeight: 25, fontWeight: '900' },
  headingCompact: { fontSize: 18, lineHeight: 22 },
  sectionTabs: { height: 34, flexDirection: 'row', alignItems: 'stretch', borderBottomWidth: 1, borderBottomColor: 'rgba(148,99,102,0.24)' },
  sectionTabsCompact: { height: 29 },
  sectionTab: { flex: 1, alignItems: 'center', justifyContent: 'center', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  sectionTabText: { color: '#A88B87', fontSize: 11, lineHeight: 14, fontWeight: '900' },
  sectionTabTextCompact: { fontSize: 9, lineHeight: 12 },
  sectionTabTextActive: { color: '#724B66' },
  sectionTabUnderline: { position: 'absolute', left: '18%', right: '18%', bottom: -1, height: 3, borderRadius: 2, backgroundColor: '#D36F7D' },
  disabledTabLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  soon: { color: '#C93646', fontSize: 8, lineHeight: 11, fontWeight: '900', borderWidth: 1.2, borderColor: '#C93646', borderRadius: 7, paddingHorizontal: 5, paddingVertical: 1, backgroundColor: 'rgba(255,242,235,0.78)' },
  soonCompact: { fontSize: 7, lineHeight: 9, paddingHorizontal: 4 },
  characterScroll: { flex: 1, minHeight: 0 },
  characterRail: { paddingHorizontal: 2, paddingTop: 4, paddingBottom: 1, alignItems: 'flex-start', gap: 4 },
  characterRailCompact: { paddingTop: 2, gap: 2 },
  characterTab: { width: 54, minHeight: 75, alignItems: 'center', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  characterTabCompact: { width: 47, minHeight: 61 },
  characterImageWrap: { width: 45, height: 45, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  characterImageWrapCompact: { width: 36, height: 36, borderRadius: 18 },
  characterImageWrapSelected: { borderColor: '#D77982' },
  characterImage: { width: '92%', height: '92%' },
  characterName: { width: 54, marginTop: 1, color: '#987A7B', fontSize: 8, lineHeight: 11, fontWeight: '900', textAlign: 'center' },
  characterNameCompact: { width: 47, fontSize: 7, lineHeight: 9 },
  characterNameSelected: { color: '#6C4961' },
  characterUnderline: { width: 22, height: 2, marginTop: 1, borderRadius: 1, backgroundColor: '#D77982' },
  libraryHeading: { minHeight: 34, paddingHorizontal: 4, alignItems: 'flex-start', justifyContent: 'center' },
  libraryTitle: { color: '#65465E', fontSize: 16, lineHeight: 21, fontWeight: '900' },
  libraryTitleCompact: { fontSize: 13, lineHeight: 17 },
  volumeScroll: { flex: 1, minHeight: 0 },
  volumeRail: { alignItems: 'stretch', paddingTop: 3, paddingBottom: 3, paddingHorizontal: 2 },
  volumeRailCompact: { paddingTop: 1, paddingBottom: 1 },
  volumeItem: { position: 'relative', width: 122, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 2, alignItems: 'center', justifyContent: 'flex-start', outlineStyle: 'solid', outlineWidth: 0, outlineColor: 'transparent' },
  volumeItemCompact: { width: 96, paddingHorizontal: 8, paddingTop: 1, paddingBottom: 1 },
  volumeItemLocked: { opacity: 0.86 },
  volumePressed: { opacity: 0.72, transform: [{ translateY: 2 }] },
  thumbnailFrame: { position: 'relative', width: 98, height: 174, borderRadius: 9, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(151,102,103,0.34)' },
  thumbnailFrameCompact: { width: 70, height: 124, borderRadius: 7 },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailLocked: { opacity: 0.48 },
  lockedCover: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: 'rgba(104,103,110,0.61)' },
  lockIcon: { color: '#FFF9F0', fontSize: 18, lineHeight: 21, textShadowColor: 'rgba(40,38,45,0.72)', textShadowRadius: 2 },
  lockIconCompact: { fontSize: 15, lineHeight: 18 },
  lockedText: { color: '#FFF9F0', fontSize: 9, lineHeight: 12, fontWeight: '900', textShadowColor: 'rgba(40,38,45,0.72)', textShadowRadius: 2 },
  lockedTextCompact: { fontSize: 7, lineHeight: 10 },
  volumeLabel: { marginTop: 3, color: '#A05F6B', fontSize: 10, lineHeight: 13, fontWeight: '900', textAlign: 'center' },
  volumeLabelCompact: { fontSize: 8, lineHeight: 11 },
  comicTitle: { marginTop: 1, minHeight: 28, color: '#60445B', fontSize: 10, lineHeight: 14, fontWeight: '900', textAlign: 'center' },
  comicTitleCompact: { minHeight: 22, fontSize: 8, lineHeight: 11 },
  readLabel: { marginTop: 1, color: '#B05F6C', fontSize: 10, lineHeight: 13, fontWeight: '900' },
  readLabelCompact: { marginTop: 1, fontSize: 8, lineHeight: 11 },
  readLabelLocked: { color: '#77747A' },
  volumeDivider: { position: 'absolute', top: '12%', right: 0, bottom: '12%', width: 1, borderRightWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(167,113,112,0.42)' },
  pressed: { opacity: 0.7 },
  readerRoot: { flex: 1, minHeight: 0, paddingBottom: TAB_BAR_CLEARANCE, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  readerStage: { width: '100%', position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  comicImage: { borderRadius: 18, backgroundColor: 'transparent' },
  readerBack: { position: 'absolute', top: 7, left: 9, width: 82, minHeight: 42, height: 42, zIndex: 3 },
  readerButtonContent: { minHeight: 42, paddingHorizontal: 8, paddingVertical: 5 },
  readerButtonText: { color: '#68485F', fontSize: 11, lineHeight: 15, fontWeight: '900', textAlign: 'center' },
  readerLabel: { position: 'absolute', top: 7, left: 99, right: 9, height: 42, overflow: 'hidden', zIndex: 2 },
  readerLabelContent: { height: 42, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center' },
  readerVolume: { color: '#A15F6B', fontSize: 8, lineHeight: 10, fontWeight: '900' },
  readerTitle: { maxWidth: '100%', color: '#65455D', fontSize: 12, lineHeight: 15, fontWeight: '900', textAlign: 'center' },
  readerPager: { position: 'absolute', left: 9, right: 9, bottom: 7, minHeight: 42, zIndex: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  readerPagerButton: { width: 82, minHeight: 42, height: 42 },
  readerCount: { width: 72, height: 38, overflow: 'hidden' },
  readerCountContent: { height: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  readerCountText: { color: '#745167', fontSize: 10, lineHeight: 13, fontWeight: '900', textAlign: 'center' },
});
