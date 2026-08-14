import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text as RNText, View, type ImageSourcePropType, type TextProps } from 'react-native';

import type { IncidentAllyActor } from '@/components/InvestigationScreen';
import type { EnemyCase } from '@/data/enemyCases';
import { formatIncidentTemplate, type IncidentStory } from '@/data/incidentStory';

export type IncidentCutInProps = {
  caseData: EnemyCase;
  targetName: string;
  targetImage: ImageSourcePropType;
  allyActors?: readonly IncidentAllyActor[];
  onInvestigate: () => void;
  onLater: () => void;
  onCutChange?: (index: number) => void;
  showOrganizationIntro?: boolean;
  organizationIntroOnly?: boolean;
  onOrganizationIntroSeen?: () => void;
  reduceMotion?: boolean;
  story?: IncidentStory;
};

function Text(props: TextProps) {
  return <RNText maxFontSizeMultiplier={1.25} {...props} />;
}

export function IncidentCutIn(props: IncidentCutInProps) {
  const {
    caseData,
    targetName,
    targetImage,
    allyActors = [],
    onInvestigate,
    onLater,
    onCutChange,
    showOrganizationIntro = false,
    organizationIntroOnly = false,
    onOrganizationIntroSeen,
    reduceMotion = false,
    story,
  } = props;
  const [cut, setCut] = useState(organizationIntroOnly ? 1 : 0);
  const [includeOrganizationIntro] = useState(showOrganizationIntro || organizationIntroOnly);
  const motion = useRef(new Animated.Value(1)).current;
  const ally = allyActors.find((actor) => actor.slot === 'lead');
  const values = useMemo(() => ({
    targetName,
    allyLeadName: ally?.name ?? 'ナレーション',
    allySupportName: allyActors.find((actor) => actor.slot === 'support')?.name ?? ally?.name ?? 'ナレーション',
  }), [ally?.name, allyActors, targetName]);
  const title = story ? formatIncidentTemplate(story.cutIn.title, values) : `${targetName} 消失`;
  const threatCut = includeOrganizationIntro ? 2 : 1;
  const totalCuts = organizationIntroOnly ? 1 : includeOrganizationIntro ? 3 : 2;
  const displayedCut = organizationIntroOnly ? 1 : cut + 1;
  const evidenceLabels = caseData.evidence.slice(0, 3).map((evidence) => evidence.label);

  useEffect(() => {
    onCutChange?.(cut);
    motion.stopAnimation();
    motion.setValue(reduceMotion ? 1 : 0);
    Animated.timing(motion, {
      toValue: 1,
      duration: reduceMotion ? 1 : 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [cut, motion, onCutChange, reduceMotion]);

  const next = () => {
    if (organizationIntroOnly) {
      onOrganizationIntroSeen?.();
      onInvestigate();
      return;
    }
    if (cut === 0) {
      setCut(includeOrganizationIntro ? 1 : threatCut);
      return;
    }
    if (includeOrganizationIntro && cut === 1) {
      onOrganizationIntroSeen?.();
      setCut(threatCut);
      return;
    }
    onInvestigate();
  };

  const primaryLabel = organizationIntroOnly ? '事件手帳へ戻る' : cut === 0
    ? (includeOrganizationIntro ? '怪盗団の正体を追う' : '残された証拠を見る')
    : cut === threatCut ? '捜査を開始する' : '残された証拠を見る';

  return <View style={styles.overlay} accessibilityViewIsModal accessibilityLiveRegion="assertive" onAccessibilityEscape={onLater}>
    <View pointerEvents="none" style={styles.dim} />
    <Animated.View style={[styles.cinema, { opacity: motion, transform: [{ translateX: motion.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 0 : 24, 0] }) }] }]}>
      <View style={styles.progressRow}>
        <Text style={styles.progress}>{displayedCut} / {totalCuts}　{organizationIntroOnly ? '怪盗団記録' : '事件発生'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={organizationIntroOnly ? '怪盗団記録を閉じる' : '事件をあとで調べる'} onPress={onLater} hitSlop={8} style={({ pressed }) => [styles.close, pressed && styles.pressed]}><Text style={styles.closeText}>×</Text></Pressable>
      </View>

      {!organizationIntroOnly && cut === 0 ? <DisappearanceCut title={title} targetName={targetName} targetImage={targetImage} ally={ally} /> : null}
      {includeOrganizationIntro && cut === 1 ? <OrganizationCut /> : null}
      {!organizationIntroOnly && cut === threatCut ? <AnonymousThreatCut evidenceLabels={evidenceLabels} /> : null}

      <Pressable accessibilityRole="button" accessibilityLabel={primaryLabel} onPress={next} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>{primaryLabel}</Text></Pressable>
    </Animated.View>
  </View>;
}

function DisappearanceCut({ title, targetName, targetImage, ally }: { title: string; targetName: string; targetImage: ImageSourcePropType; ally?: IncidentAllyActor }) {
  return <View style={styles.cutBody}>
    <View style={styles.targetHero}>
      <Image source={targetImage} resizeMode="contain" style={styles.targetGhost} accessibilityLabel={`${targetName}の姿`} />
      <View style={styles.stolenBand}><Text style={styles.stolenText}>消えた</Text></View>
    </View>
    <View style={styles.speakerRow}>
      {ally ? <Image source={ally.image} resizeMode="contain" style={styles.speakerImage} accessibilityLabel={ally.name} /> : <View style={styles.narratorMark}><Text style={styles.narratorMarkText}>!</Text></View>}
      <View style={styles.speakerCopy}><Text style={styles.roleBadge}>{ally ? '協力モビー' : 'ナレーション'}</Text><Text style={styles.speakerName}>{ally?.name ?? '事件のお知らせ'}</Text></View>
    </View>
    <View><Text numberOfLines={2} style={styles.title}>{title}</Text><Text numberOfLines={2} style={styles.body}>{targetName}が連れ去られた。残された証拠を一緒に追おう。</Text></View>
    <Mission objective="消えたモビーの状況を知る" completion="残された手掛かりを見る" />
  </View>;
}

function OrganizationCut() {
  return <View style={styles.cutBody} accessible accessibilityLabel="モビーを狙う怪盗団は7体。全員が敵対する同じ組織です">
    <View style={styles.organizationHero} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: 7 }, (_, index) => <GenericSilhouette key={index} compact />)}
    </View>
    <View><Text style={styles.kicker}>はじめての怪盗団記録</Text><Text numberOfLines={2} style={styles.title}>モビーを狙う怪盗団は7体</Text><Text numberOfLines={3} style={styles.body}>全員が同じ組織の敵。事件を解決するたび、怪盗名簿で正体が明らかになる。</Text></View>
    <Mission objective="7体の怪盗団からモビーを救う" completion="事件ごとに1体ずつ正体を明かす" />
  </View>;
}

function AnonymousThreatCut({ evidenceLabels }: { evidenceLabels: readonly string[] }) {
  const evidenceCopy = evidenceLabels.length > 0 ? `${evidenceLabels.join('、')}。` : '現場に残された証拠。';
  return <View style={styles.cutBody}>
    <View style={styles.anonymousHero} accessible accessibilityLabel="正体不明の怪盗。正式な姿はまだ不明です">
      <GenericSilhouette />
      <View style={styles.unknownBadge}><Text style={styles.unknownBadgeText}>正体不明・敵対</Text></View>
    </View>
    <View><Text style={styles.kicker}>残された手掛かり</Text><Text style={styles.title}>証拠が、怪盗へつながる</Text><Text numberOfLines={2} style={styles.body}>{evidenceCopy}手掛かりを調べて、盗みの仕掛けを見破ろう。</Text></View>
    <Mission objective="正体不明の怪盗の仕掛けを見破る" completion={`${Math.max(1, evidenceLabels.length)}つの証拠を集めて救出へ進む`} />
  </View>;
}

function GenericSilhouette({ compact = false }: { compact?: boolean }) {
  return <View style={[styles.silhouette, compact && styles.silhouetteCompact]}>
    <View style={[styles.silhouetteHead, compact && styles.silhouetteHeadCompact]} />
    <View style={[styles.silhouetteBody, compact && styles.silhouetteBodyCompact]} />
  </View>;
}

function Mission({ objective, completion }: { objective: string; completion: string }) {
  return <View style={styles.mission} accessible accessibilityLabel={`いまの目的、${objective}。できたら完了、${completion}`}>
    <View style={styles.missionColumn}><Text style={styles.missionLabel}>いまの目的</Text><Text numberOfLines={2} style={styles.missionText}>{objective}</Text></View>
    <View style={styles.missionDivider} />
    <View style={styles.missionColumn}><Text style={styles.doneLabel}>✓ できたら完了</Text><Text numberOfLines={2} style={styles.doneText}>{completion}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 170, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#100C17' },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,4,11,.94)' },
  cinema: { width: '100%', height: '89%', maxHeight: 640, minHeight: 0, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, justifyContent: 'space-between', backgroundColor: '#1C1323', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#6E4C60' },
  progressRow: { height: 44, flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progress: { color: '#F3DDE2', fontSize: 14, fontWeight: '800' },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.1)' },
  closeText: { color: '#FFF', fontSize: 26, lineHeight: 30 },
  cutBody: { flex: 1, minHeight: 0, justifyContent: 'space-evenly', gap: 6, paddingVertical: 2, overflow: 'hidden' },
  targetHero: { flex: 1, minHeight: 112, maxHeight: 166, alignItems: 'center', justifyContent: 'center' },
  targetGhost: { width: 190, height: '100%', opacity: .33 },
  stolenBand: { position: 'absolute', width: 160, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#A8354D', transform: [{ rotate: '-6deg' }] },
  stolenText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  speakerRow: { minHeight: 48, flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  speakerImage: { width: 48, height: 48 },
  narratorMark: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#745B72' },
  narratorMarkText: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  speakerCopy: { flex: 1 },
  roleBadge: { alignSelf: 'flex-start', color: '#472836', fontSize: 12, fontWeight: '900', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, overflow: 'hidden', backgroundColor: '#FFD6D9' },
  speakerName: { color: '#FFF7F3', fontSize: 17, lineHeight: 22, fontWeight: '900', marginTop: 2 },
  kicker: { color: '#FF9CAD', fontSize: 13, lineHeight: 17, fontWeight: '900', letterSpacing: .6, marginBottom: 2 },
  title: { color: '#FFF8F2', fontSize: 26, lineHeight: 32, fontWeight: '900' },
  body: { color: '#F4E9E5', fontSize: 17, lineHeight: 23, fontWeight: '600', marginTop: 4 },
  organizationHero: { minHeight: 118, maxHeight: 142, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3, paddingHorizontal: 2, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.04)' },
  anonymousHero: { flex: 1, minHeight: 140, maxHeight: 216, alignItems: 'center', justifyContent: 'center' },
  silhouette: { width: 128, height: 164, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10 },
  silhouetteCompact: { width: 45, height: 108, paddingTop: 9 },
  silhouetteHead: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#514852' },
  silhouetteHeadCompact: { width: 25, height: 25, borderRadius: 13 },
  silhouetteBody: { width: 108, height: 100, marginTop: -2, borderTopLeftRadius: 52, borderTopRightRadius: 52, backgroundColor: '#514852' },
  silhouetteBodyCompact: { width: 43, height: 78, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  unknownBadge: { position: 'absolute', bottom: 4, paddingHorizontal: 13, paddingVertical: 5, borderRadius: 12, backgroundColor: '#9D344D', borderWidth: 1, borderColor: '#F4B4C0' },
  unknownBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  mission: { width: '100%', minHeight: 76, flexShrink: 0, flexDirection: 'row', borderRadius: 17, padding: 10, backgroundColor: 'rgba(255,248,242,.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,.16)' },
  missionColumn: { flex: 1, justifyContent: 'center' },
  missionDivider: { width: StyleSheet.hairlineWidth, marginHorizontal: 10, backgroundColor: 'rgba(255,255,255,.2)' },
  missionLabel: { color: '#FFADB7', fontSize: 12, fontWeight: '900' },
  missionText: { color: '#FFF', fontSize: 17, lineHeight: 21, fontWeight: '700', marginTop: 2 },
  doneLabel: { color: '#FFD891', fontSize: 12, fontWeight: '900' },
  doneText: { color: '#FFF', fontSize: 17, lineHeight: 21, fontWeight: '700', marginTop: 2 },
  primary: { width: '100%', minHeight: 54, flexShrink: 0, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D64E64' },
  primaryText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  pressed: { opacity: .8, transform: [{ scale: .98 }] },
});
