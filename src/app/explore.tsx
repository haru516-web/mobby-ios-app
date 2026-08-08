import { Image } from 'expo-image';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mobby2DScene } from '@/components/Mobby2DScene';
import { MobbyBadge, MobbyColors, PaperPanel } from '@/components/mobby-ui';
import { MOBBIES } from '@/data/mobies';
import { useMobbyGame } from '@/game/MobbyGameContext';

export default function MemoriesScreen() {
  const insets = useSafeAreaInsets();
  const { discoveredReactions, furniturePositions, interactions, memories, roomItems, selectMobby, selectedMobby, setFurniturePosition } = useMobbyGame();
  const webTabInset = Platform.OS === 'web' ? 86 : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={[styles.screen, { paddingBottom: webTabInset + Math.max(0, insets.bottom) }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>MOBBY COLLECTION</Text>
            <Text style={styles.title}>モビーをあつめる</Text>
          </View>
          <MobbyBadge tone="coral">{discoveredReactions.length}/36 反応</MobbyBadge>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statNumber}>{memories.length}</Text><Text style={styles.statLabel}>思い出</Text></View>
          <View style={styles.statCard}><Text style={styles.statNumber}>{new Set(memories.map((memory) => memory.mobbyId)).size}</Text><Text style={styles.statLabel}>出会った子</Text></View>
          <View style={styles.statCard}><Text style={styles.statNumber}>{interactions}</Text><Text style={styles.statLabel}>ちょっかい</Text></View>
        </View>

        <PaperPanel tone="pink" style={styles.featureCard}>
          <View style={styles.featureHeader}>
            <View style={styles.featureCopy}>
              <Text style={styles.featureKicker}>MY FAVORITE RIGHT NOW</Text>
              <Text style={styles.featureTitle}>{selectedMobby.name}の部屋</Text>
            </View>
            <Text style={styles.featureHint}>この子との暮らし</Text>
          </View>
          <View style={styles.featureScene}>
            <Mobby2DScene compact sceneHeight={205} mobby={selectedMobby} reaction="welcome" animationKey={`archive-${selectedMobby.id}`} roomItems={roomItems} furniturePositions={furniturePositions} onFurnitureMove={setFurniturePosition} />
          </View>
        </PaperPanel>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionKicker}>CHARACTER COLLECTION</Text>
            <Text style={styles.sectionTitle}>9種のモビー</Text>
          </View>
          <Text style={styles.sectionCount}>9 / 9</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.guideRow}>
          {MOBBIES.map((mobby) => (
            <Pressable
              key={mobby.id}
              accessibilityRole="button"
              onPress={() => selectMobby(mobby.id)}
              style={({ pressed }) => [styles.guideCard, selectedMobby.id === mobby.id && styles.guideCardSelected, pressed && styles.guideCardPressed]}
            >
              <View style={[styles.guideImageWrap, { backgroundColor: mobby.accent }]}>
                <Image source={mobby.image} contentFit="contain" style={styles.guideImage} />
              </View>
              <Text style={[styles.guideName, { color: mobby.color }]} numberOfLines={1}>{mobby.name}</Text>
              <Text style={styles.guideCatch} numberOfLines={1}>{selectedMobby.id === mobby.id ? 'この子と暮らす' : mobby.catchphrase}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.memoryHeader}>
          <View>
            <Text style={styles.sectionKicker}>MEMORY ALBUM</Text>
            <Text style={styles.sectionTitle}>思い出アルバム</Text>
          </View>
          <Text style={styles.sectionCount}>{memories.length}枚</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memoryRow}>
          {memories.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>♡</Text>
              <Text style={styles.emptyTitle}>まだ思い出はありません</Text>
              <Text style={styles.emptyText}>部屋タブでモビーにちょっかいを出して、記録してみよう。</Text>
            </View>
          ) : memories.map((memory) => (
            <PaperPanel key={memory.id} style={styles.memoryCard}>
              <Image source={MOBBIES.find((mobby) => mobby.id === memory.mobbyId)?.image} contentFit="cover" style={styles.memoryImage} />
              <Text style={styles.memoryDay}>DAY {String(memory.day).padStart(2, '0')} ・ {memory.mobbyName}</Text>
              <Text style={styles.memoryTitle} numberOfLines={1}>{memory.title}</Text>
            </PaperPanel>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: MobbyColors.paperDeep },
  screen: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', paddingHorizontal: 12, paddingTop: 10 },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 8 },
  eyebrow: { color: MobbyColors.coralDark, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: MobbyColors.ink, fontSize: 25, lineHeight: 30, fontWeight: '900', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 9 },
  statCard: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: MobbyColors.paper, borderRadius: 16, borderWidth: 1.5, borderColor: '#E7BF88' },
  statNumber: { color: MobbyColors.coralDark, fontSize: 18, fontWeight: '900' },
  statLabel: { color: MobbyColors.muted, fontSize: 9, fontWeight: '800', marginTop: 1 },
  featureCard: { padding: 10, borderRadius: 20 },
  featureHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  featureCopy: { flex: 1, minWidth: 0 },
  featureKicker: { color: '#A56F61', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  featureTitle: { color: MobbyColors.ink, fontSize: 16, fontWeight: '900', marginTop: 2 },
  featureHint: { color: MobbyColors.muted, fontSize: 9, fontWeight: '800' },
  featureScene: { overflow: 'hidden', borderRadius: 16, borderWidth: 1.5, borderColor: '#E4AA86' },
  sectionHeader: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingTop: 8 },
  sectionKicker: { color: MobbyColors.woodDark, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  sectionTitle: { color: MobbyColors.ink, fontSize: 16, fontWeight: '900', marginTop: 1 },
  sectionCount: { color: MobbyColors.muted, fontSize: 11, fontWeight: '900' },
  guideRow: { gap: 8, paddingVertical: 4, paddingRight: 8 },
  guideCard: { width: 102, padding: 7, borderRadius: 16, backgroundColor: MobbyColors.paper, borderWidth: 1.5, borderColor: '#E7BF88' },
  guideCardSelected: { backgroundColor: '#FFF0D7', borderColor: MobbyColors.coral, borderWidth: 2 },
  guideCardPressed: { opacity: 0.8, transform: [{ translateY: 1 }] },
  guideImageWrap: { height: 94, borderRadius: 11, overflow: 'hidden' },
  guideImage: { width: '100%', height: '100%' },
  guideName: { fontSize: 12, fontWeight: '900', marginTop: 6 },
  guideCatch: { color: MobbyColors.muted, fontSize: 9, marginTop: 1 },
  memoryHeader: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingTop: 5 },
  memoryRow: { gap: 8, paddingVertical: 4, paddingRight: 8 },
  emptyCard: { width: 330, minHeight: 82, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 16, borderWidth: 1.5, borderColor: '#E7BF88', backgroundColor: MobbyColors.paper },
  emptyEmoji: { color: MobbyColors.coral, fontSize: 22 },
  emptyTitle: { color: MobbyColors.ink, fontSize: 12, fontWeight: '900', marginTop: 2 },
  emptyText: { color: MobbyColors.muted, fontSize: 9, marginTop: 3, textAlign: 'center' },
  memoryCard: { width: 174, padding: 7, borderRadius: 16 },
  memoryImage: { width: '100%', height: 64, borderRadius: 11, backgroundColor: '#F1D6B3' },
  memoryDay: { color: MobbyColors.muted, fontSize: 8, fontWeight: '900', marginTop: 5 },
  memoryTitle: { color: MobbyColors.ink, fontSize: 11, fontWeight: '900', marginTop: 2 },
});
