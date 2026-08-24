import { useEffect, useState } from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { MobbyAssetButton, MobbyAssetSurface } from '@/components/mobby-ui';
import {
  getBlackStarIdentity,
  type IncidentComic,
  type IncidentComicId,
} from '@/data/incidentComics';
import { getEnemy } from '@/data/enemies';
import { getMobby } from '@/data/mobies';
import { Text } from '@/ui/layout/visualPrimitives';

export type IncidentComicPlayerProps = {
  incident: IncidentComic;
  onComplete: (incidentId: IncidentComicId) => void;
  onSkip: (incidentId: IncidentComicId) => void;
  onPanelChange?: (panelIndex: number) => void;
};

export function IncidentComicPlayer({
  incident,
  onComplete,
  onSkip,
  onPanelChange,
}: IncidentComicPlayerProps) {
  const [panelIndex, setPanelIndex] = useState(0);
  const panel = incident.panels[panelIndex];
  const lastPanel = panelIndex === incident.panels.length - 1;
  const featuredMobby = getMobby(incident.featuredMobbyId);
  const blackStar = getEnemy(incident.enemyId);
  const identity = getBlackStarIdentity(incident.enemyId);

  useEffect(() => {
    setPanelIndex(0);
    onPanelChange?.(0);
  }, [incident.id, onPanelChange]);

  const showPanel = (nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(incident.panels.length - 1, nextIndex));
    setPanelIndex(boundedIndex);
    onPanelChange?.(boundedIndex);
  };

  const advance = () => {
    if (lastPanel) {
      onComplete(incident.id);
      return;
    }
    showPanel(panelIndex + 1);
  };

  const goBack = () => showPanel(panelIndex - 1);

  const panelAccessibilityLabel = [
    `${incident.title}、${panelIndex + 1}コマ目、${panel.heading}。`,
    panel.narration,
    ...panel.dialogue.map((line) => `${line.speaker}、${line.text}`),
    lastPanel ? 'タップすると事件を完了します。' : 'タップすると次のコマへ進みます。',
  ].join(' ');

  return (
    <View
      accessibilityLabel={`${incident.title}を表示中`}
      accessibilityViewIsModal
      style={styles.root}
      testID="incident-comic-player"
    >
      <View style={styles.topBar}>
        <View style={styles.titleCopy}>
          <Text numberOfLines={1} style={styles.eyebrow}>BLACK STAR INCIDENT</Text>
          <Text numberOfLines={1} style={styles.title}>{incident.title}</Text>
        </View>
        <MobbyAssetButton
          accessibilityLabel="事件をスキップして一覧に戻る"
          onPress={() => onSkip(incident.id)}
          tone="cream"
          style={styles.skipButton}
          contentStyle={styles.smallButtonContent}
        >
          <Text style={styles.skipText}>スキップ</Text>
        </MobbyAssetButton>
      </View>

      <Pressable
        accessibilityLabel={panelAccessibilityLabel}
        accessibilityRole="button"
        onPress={advance}
        style={({ pressed }) => [styles.panelPressable, pressed && styles.pressed]}
        testID={`incident-comic-panel-${panel.order}`}
      >
        <ImageBackground
          accessible={false}
          imageStyle={styles.panelBackgroundImage}
          resizeMode="cover"
          source={panel.image}
          style={styles.panelBackground}
        >
          <View pointerEvents="none" style={styles.sceneShade} />
          {panel.imageStatus === 'temporary-existing-background' ? <>
            <Image
              accessible={false}
              resizeMode="contain"
              source={featuredMobby.image}
              style={[styles.character, styles.mobbyCharacter]}
            />
            <Image
              accessible={false}
              resizeMode="contain"
              source={blackStar.image}
              style={[styles.character, styles.blackStarCharacter]}
            />
          </> : null}
          <MobbyAssetSurface
            pointerEvents="none"
            variant="darkTopbar"
            style={styles.panelNumber}
            contentStyle={styles.panelNumberContent}
          >
            <Text style={styles.panelNumberText}>{panel.order} / {incident.panels.length}</Text>
          </MobbyAssetSurface>
          <View pointerEvents="none" style={styles.tapHintWrap}>
            <Text style={styles.tapHint}>{lastPanel ? 'タップで完了' : 'タップで次へ'}</Text>
          </View>
        </ImageBackground>
      </Pressable>

      <MobbyAssetSurface
        accessible
        accessibilityLabel={panelAccessibilityLabel}
        variant="dialogue"
        style={styles.scriptSurface}
        contentStyle={styles.scriptContent}
      >
        <Text numberOfLines={1} style={styles.panelHeading}>{panel.heading}</Text>
        <Text numberOfLines={2} style={styles.narration}>{panel.narration}</Text>
        <View style={styles.dialogueList}>
          {panel.dialogue.map((line) => (
            <Text key={`${panel.id}-${line.speaker}`} numberOfLines={2} style={styles.dialogueLine}>
              <Text style={styles.speaker}>{line.speaker}：</Text>{line.text}
            </Text>
          ))}
        </View>
      </MobbyAssetSurface>

      <View style={styles.controls}>
        <MobbyAssetButton
          accessibilityLabel="前のコマへ戻る"
          disabled={panelIndex === 0}
          onPress={goBack}
          tone="cream"
          style={styles.pagerButton}
          contentStyle={styles.pagerButtonContent}
        >
          <Text style={styles.pagerText}>‹ 戻る</Text>
        </MobbyAssetButton>
        <View accessible accessibilityLabel={`${panelIndex + 1}コマ目、全${incident.panels.length}コマ`} style={styles.identityWrap}>
          <Text numberOfLines={1} style={styles.identityRole}>{identity.role}</Text>
          <Text numberOfLines={1} style={styles.identityName}>{identity.name}</Text>
        </View>
        <MobbyAssetButton
          accessibilityLabel={lastPanel ? '事件を完了する' : '次のコマへ進む'}
          onPress={advance}
          tone="coral"
          style={styles.pagerButton}
          contentStyle={styles.pagerButtonContent}
        >
          <Text style={styles.pagerTextNext}>{lastPanel ? '完了' : '進む ›'}</Text>
        </MobbyAssetButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 78,
    backgroundColor: '#1C1720',
  },
  topBar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 7,
  },
  titleCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: '#D6B1BC', fontSize: 8, lineHeight: 10, letterSpacing: 1.4, fontWeight: '900' },
  title: { color: '#FFF9EE', fontSize: 17, lineHeight: 22, fontWeight: '900', marginTop: 1 },
  skipButton: { width: 86, minHeight: 38, height: 38 },
  smallButtonContent: { minHeight: 38, paddingHorizontal: 8, paddingVertical: 5 },
  skipText: { color: '#684A5B', fontSize: 11, lineHeight: 14, fontWeight: '900' },
  panelPressable: {
    flex: 1,
    minHeight: 210,
    maxHeight: 410,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,243,220,0.88)',
    backgroundColor: '#312438',
  },
  pressed: { opacity: 0.91 },
  panelBackground: { flex: 1, overflow: 'hidden' },
  panelBackgroundImage: { borderRadius: 22 },
  sceneShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18,10,24,0.08)' },
  character: { position: 'absolute', bottom: -5, width: '51%', height: '72%' },
  mobbyCharacter: { left: -5 },
  blackStarCharacter: { right: -5 },
  panelNumber: { position: 'absolute', left: 10, top: 9, width: 62, height: 30, overflow: 'hidden' },
  panelNumberContent: { minHeight: 30, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center' },
  panelNumberText: { color: '#FFF8E8', fontSize: 10, lineHeight: 13, fontWeight: '900' },
  tapHintWrap: {
    position: 'absolute',
    right: 10,
    bottom: 9,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: 'rgba(28,19,32,0.76)',
  },
  tapHint: { color: '#FFF8E8', fontSize: 9, lineHeight: 12, fontWeight: '900' },
  scriptSurface: { minHeight: 152, marginTop: 7, overflow: 'hidden' },
  scriptContent: { minHeight: 152, paddingHorizontal: 18, paddingVertical: 13 },
  panelHeading: { color: '#644157', fontSize: 15, lineHeight: 19, fontWeight: '900' },
  narration: { color: '#735D63', fontSize: 10, lineHeight: 15, fontWeight: '700', marginTop: 3 },
  dialogueList: { marginTop: 6, gap: 2 },
  dialogueLine: { color: '#4E3545', fontSize: 11, lineHeight: 16, fontWeight: '800' },
  speaker: { color: '#A24E62', fontWeight: '900' },
  controls: {
    minHeight: 52,
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 7,
  },
  pagerButton: { width: 91, minHeight: 46, height: 46 },
  pagerButtonContent: { minHeight: 46, paddingHorizontal: 8, paddingVertical: 6 },
  pagerText: { color: '#684A5B', fontSize: 12, lineHeight: 16, fontWeight: '900' },
  pagerTextNext: { color: '#FFF9EE', fontSize: 12, lineHeight: 16, fontWeight: '900' },
  identityWrap: { flex: 1, minWidth: 0, alignItems: 'center' },
  identityRole: { color: '#C7A6AF', fontSize: 8, lineHeight: 11, fontWeight: '900' },
  identityName: { color: '#FFF8EB', fontSize: 10, lineHeight: 14, fontWeight: '900' },
});
