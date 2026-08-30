import { useEffect, useState } from 'react';
import { Image, ImageBackground } from 'expo-image';
import {
  Modal,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IncidentComicPlayer } from '@/components/incidents/IncidentComicPlayer';
import {
  MobbyAssetButton,
  MobbyAssetSelectable,
  MobbyAssetSurface,
} from '@/components/mobby-ui';
import {
  BLACK_STAR_IDENTITIES,
  INCIDENT_COMIC_BY_ID,
  INCIDENT_COMICS,
  type IncidentComicId,
} from '@/data/incidentComics';
import type { EnemyId } from '@/data/enemies';
import { INCIDENT_COMIC_DEVELOPMENT } from '@/features/incidentComics/incidentComicDevelopment';
import { useIncidentComicProgress } from '@/features/incidentComics/useIncidentComicProgress';
import { Text } from '@/ui/layout/visualPrimitives';

const INCIDENT_BOARD = require('../../assets/backgrounds/incident-archive-board-transparent-v1.png');
const BOARD_ASPECT_RATIO = 2 / 3;
const INCIDENT_CARD_ASPECT_RATIO = 2 / 3;
const TAB_BAR_CLEARANCE = 78;
const MAX_BOARD_WIDTH = 440;

export type IncidentComicsScreenProps = {
  entryNonce?: number;
  onBlackStarUnlocked?: (enemyId: EnemyId, incidentId: IncidentComicId) => void;
  onPlayerVisibilityChange?: (visible: boolean) => void;
  showDeveloperTools?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IncidentComicsScreen({
  entryNonce = 0,
  onBlackStarUnlocked,
  onPlayerVisibilityChange,
  showDeveloperTools = INCIDENT_COMIC_DEVELOPMENT.showForceAppearanceControl,
  style,
}: IncidentComicsScreenProps) {
  const [rootSize, setRootSize] = useState({ width: 455, height: 782 });
  const [readerIncidentId, setReaderIncidentId] = useState<IncidentComicId | null>(null);
  const controller = useIncidentComicProgress({ entryNonce, onBlackStarUnlocked });
  const selectedIncident = readerIncidentId ? INCIDENT_COMIC_BY_ID[readerIncidentId] : null;

  useEffect(() => {
    setReaderIncidentId(null);
    onPlayerVisibilityChange?.(false);
  }, [entryNonce, onPlayerVisibilityChange]);

  const handleRootLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setRootSize((current) => current.width === width && current.height === height
      ? current
      : { width, height });
  };

  const openIncident = (incidentId: IncidentComicId) => {
    if (!controller.hydrated || !controller.isIncidentVisible(incidentId)) return;
    setReaderIncidentId(incidentId);
    onPlayerVisibilityChange?.(true);
  };

  const closePlayer = () => {
    setReaderIncidentId(null);
    onPlayerVisibilityChange?.(false);
  };

  const completeIncident = (incidentId: IncidentComicId) => {
    controller.complete(incidentId);
    closePlayer();
  };

  const skipIncident = (incidentId: IncidentComicId) => {
    controller.skip(incidentId);
    closePlayer();
  };

  if (selectedIncident) {
    return (
      <Modal
        animationType="none"
        onRequestClose={() => skipIncident(selectedIncident.id)}
        presentationStyle="fullScreen"
        visible
      >
        <SafeAreaView onLayout={handleRootLayout} style={[styles.readerHost, style]}>
          <IncidentComicPlayer
            incident={selectedIncident}
            onComplete={completeIncident}
            onSkip={skipIncident}
          />
        </SafeAreaView>
      </Modal>
    );
  }

  const availableWidth = Math.max(1, rootSize.width - 14);
  const availableHeight = Math.max(1, rootSize.height - TAB_BAR_CLEARANCE - 8);
  const boardWidth = Math.min(MAX_BOARD_WIDTH, availableWidth, availableHeight * BOARD_ASPECT_RATIO);
  const boardHeight = boardWidth / BOARD_ASPECT_RATIO;
  const compact = boardWidth < 370;
  const completedCount = controller.progress.completedIncidentIds.length;
  const allComplete = completedCount === INCIDENT_COMICS.length;
  const statusTitle = !controller.hydrated
    ? '事件記録を確認中…'
    : controller.availableIncident
      ? `新事件「${controller.availableIncident.shortTitle}」が出現中`
      : allComplete
        ? 'すべての事件を解決しました'
        : '次の事件は不定期に現れます';
  const statusCaption = controller.availableIncident
    ? `${BLACK_STAR_IDENTITIES[controller.availableIncident.enemyId].name}の事件を視聴できます`
    : `解決済み ${completedCount} / ${INCIDENT_COMICS.length}`;

  return (
    <View onLayout={handleRootLayout} style={[styles.root, style]} testID="incident-comics-screen">
      <ImageBackground
        accessible={false}
        imageStyle={styles.boardImage}
        contentFit="contain"
        contentPosition="center"
        source={INCIDENT_BOARD}
        style={[styles.board, { width: boardWidth, height: boardHeight }]}
      >
        <View style={styles.content}>
          <View style={styles.headingRow}>
            <View style={styles.headingCopy}>
              <Text accessibilityRole="header" style={[styles.heading, compact && styles.headingCompact]}>事件</Text>
            </View>
            <MobbyAssetSurface
              pointerEvents="none"
              variant="labelPill"
              style={styles.progressPill}
              contentStyle={styles.progressPillContent}
            >
              <Text style={styles.progressPillText}>{completedCount} / {INCIDENT_COMICS.length}</Text>
            </MobbyAssetSurface>
          </View>

          <MobbyAssetSurface
            accessible
            accessibilityLabel={`${statusTitle}。${statusCaption}`}
            accessibilityLiveRegion="polite"
            variant="notice"
            style={[styles.statusSurface, compact && styles.statusSurfaceCompact]}
            contentStyle={[styles.statusContent, compact && styles.statusContentCompact]}
          >
            <View style={styles.statusCopy}>
              <Text numberOfLines={1} style={[styles.statusTitle, compact && styles.statusTitleCompact]}>{statusTitle}</Text>
              <Text numberOfLines={1} style={[styles.statusCaption, compact && styles.statusCaptionCompact]}>{statusCaption}</Text>
            </View>
            {showDeveloperTools && !allComplete ? (
              <MobbyAssetButton
                accessibilityLabel="開発用、次の事件を今すぐ出現させる"
                onPress={() => controller.forceNextIncident()}
                tone="cream"
                style={styles.forceButton}
                contentStyle={styles.forceButtonContent}
              >
                <Text style={styles.forceButtonText}>今すぐ出現</Text>
              </MobbyAssetButton>
            ) : null}
          </MobbyAssetSurface>

          <View style={styles.libraryHeading}>
            <Text style={[styles.libraryTitle, compact && styles.libraryTitleCompact]}>事件ファイル</Text>
            <Text style={[styles.libraryCaption, compact && styles.libraryCaptionCompact]}>最後まで見ると黒星が解放されます</Text>
          </View>

          <ScrollView
            accessibilityLabel="事件漫画一覧"
            contentContainerStyle={[styles.cardRail, compact && styles.cardRailCompact]}
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.cardScroll}
          >
            {INCIDENT_COMICS.map((incident) => {
              const identity = BLACK_STAR_IDENTITIES[incident.enemyId];
              const completed = controller.isIncidentCompleted(incident.id);
              const visible = controller.hydrated && controller.isIncidentVisible(incident.id);
              const appearing = controller.progress.availableIncidentId === incident.id;
              const status = completed ? '視聴済み' : appearing ? '出現中' : '未出現';
              return (
                <MobbyAssetSelectable
                  key={incident.id}
                  accessibilityLabel={`事件${incident.order}、${incident.title}、${identity.role}${identity.name}、${status}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !visible }}
                  disabled={!visible}
                  onPress={() => openIncident(incident.id)}
                  style={[styles.card, compact && styles.cardCompact]}
                  contentStyle={[styles.cardContent, compact && styles.cardContentCompact]}
                  variant="modalPortrait"
                >
                  <View style={[styles.thumbnailFrame, appearing && styles.thumbnailFrameAppearing]}>
                    <Image
                      accessible={false}
                      contentFit="contain"
                      source={incident.thumbnail}
                      style={[styles.thumbnail, !visible && styles.thumbnailLocked]}
                    />
                    {!visible ? (
                      <View pointerEvents="none" style={styles.lockedCover}>
                        <Text style={styles.lockIcon}>🔒</Text>
                        <Text style={styles.lockText}>未出現</Text>
                      </View>
                    ) : null}
                    {appearing ? (
                      <View pointerEvents="none" style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text numberOfLines={1} style={styles.roleText}>{identity.role}</Text>
                  <Text numberOfLines={1} style={styles.nameText}>{visible ? identity.name : '？？？'}</Text>
                  <Text numberOfLines={2} style={styles.cardTitle}>{visible ? incident.title : 'まだ現れていない事件'}</Text>
                  <Text style={[styles.readLabel, !visible && styles.readLabelLocked]}>
                    {completed ? 'もう一度見る ›' : appearing ? '事件を見る ›' : '未出現'}
                  </Text>
                </MobbyAssetSelectable>
              );
            })}
          </ScrollView>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 7,
    paddingBottom: TAB_BAR_CLEARANCE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  readerHost: { flex: 1, minHeight: 0 },
  board: { position: 'relative', borderRadius: 30, overflow: 'hidden' },
  boardImage: { borderRadius: 30 },
  content: { position: 'absolute', top: '12.5%', left: '12.5%', right: '12.5%', bottom: '7.2%' },
  headingRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  headingCopy: { flex: 1, minWidth: 0 },
  heading: { color: '#62435C', fontSize: 21, lineHeight: 25, fontWeight: '900' },
  headingCompact: { fontSize: 18, lineHeight: 22 },
  progressPill: { width: 68, height: 34, overflow: 'hidden' },
  progressPillContent: { minHeight: 34, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  progressPillText: { color: '#745167', fontSize: 10, lineHeight: 13, fontWeight: '900' },
  statusSurface: { minHeight: 72, overflow: 'hidden' },
  statusSurfaceCompact: { minHeight: 62 },
  statusContent: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  statusContentCompact: { minHeight: 62, paddingHorizontal: 11, paddingVertical: 7 },
  statusCopy: { flex: 1, minWidth: 0 },
  statusTitle: { color: '#644157', fontSize: 11, lineHeight: 15, fontWeight: '900' },
  statusTitleCompact: { fontSize: 9, lineHeight: 13 },
  statusCaption: { color: '#896B69', fontSize: 8, lineHeight: 12, fontWeight: '800', marginTop: 2 },
  statusCaptionCompact: { fontSize: 7, lineHeight: 10 },
  forceButton: { width: 82, minHeight: 36, height: 36 },
  forceButtonContent: { minHeight: 36, paddingHorizontal: 6, paddingVertical: 5 },
  forceButtonText: { color: '#6D4B5E', fontSize: 8, lineHeight: 11, fontWeight: '900' },
  libraryHeading: { minHeight: 58, justifyContent: 'flex-end', paddingBottom: 8 },
  libraryTitle: { color: '#62435C', fontSize: 15, lineHeight: 19, fontWeight: '900' },
  libraryTitleCompact: { fontSize: 13, lineHeight: 17 },
  libraryCaption: { color: '#9B7775', fontSize: 8, lineHeight: 11, fontWeight: '800', marginTop: 1 },
  libraryCaptionCompact: { fontSize: 7, lineHeight: 9 },
  cardScroll: { flex: 1, minHeight: 0 },
  cardRail: { gap: 10, paddingRight: 10, paddingBottom: 5 },
  cardRailCompact: { gap: 7, paddingRight: 7 },
  card: { width: 190, aspectRatio: INCIDENT_CARD_ASPECT_RATIO, overflow: 'hidden' },
  cardCompact: { width: 168 },
  cardContent: { minHeight: 285, paddingHorizontal: 13, paddingTop: 15, paddingBottom: 13 },
  cardContentCompact: { minHeight: 252, paddingHorizontal: 10, paddingTop: 12, paddingBottom: 10 },
  thumbnailFrame: {
    height: 136,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#302536',
    borderWidth: 1.5,
    borderColor: 'rgba(109,72,92,0.3)',
  },
  thumbnailFrameAppearing: { borderColor: '#D56B7B', borderWidth: 2 },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailLocked: { opacity: 0.18 },
  lockedCover: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(48,37,54,0.32)' },
  lockIcon: { fontSize: 24, lineHeight: 29 },
  lockText: { color: '#FFF4E3', fontSize: 9, lineHeight: 12, fontWeight: '900', marginTop: 2 },
  newBadge: { position: 'absolute', right: 6, top: 6, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: '#D5576B' },
  newBadgeText: { color: '#FFF8EB', fontSize: 7, lineHeight: 9, fontWeight: '900', letterSpacing: 0.6 },
  roleText: { color: '#A16A75', fontSize: 8, lineHeight: 11, fontWeight: '900', marginTop: 8 },
  nameText: { color: '#5D4053', fontSize: 11, lineHeight: 14, fontWeight: '900', marginTop: 1 },
  cardTitle: { color: '#684E5E', fontSize: 10, lineHeight: 14, fontWeight: '800', minHeight: 28, marginTop: 5 },
  readLabel: { color: '#C35568', fontSize: 9, lineHeight: 12, fontWeight: '900', marginTop: 'auto' },
  readLabelLocked: { color: '#A49191' },
});
