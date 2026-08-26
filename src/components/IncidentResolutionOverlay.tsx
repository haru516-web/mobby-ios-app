import { Image } from 'expo-image';
import { StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { Text } from '@/ui/layout/visualPrimitives';

import { MobbyAssetButton, MobbyAssetSurface } from '@/components/mobby-ui';

export type IncidentResolutionOverlayProps = {
  phase: 'returning' | 'aftermath'; targetName: string; targetImage: ImageSourcePropType;
  enemyName: string; endingLabel: string; relationshipLabel: string;
  onReturnComplete: () => void; onDismiss: () => void; onOpenCasebook: () => void;
};

export function IncidentResolutionOverlay({ phase, targetName, targetImage, enemyName, endingLabel, relationshipLabel, onReturnComplete, onDismiss, onOpenCasebook }: IncidentResolutionOverlayProps) {
  return <View style={styles.overlay} accessibilityViewIsModal><MobbyAssetSurface variant="darkCaseTall" style={styles.card} contentStyle={styles.cardContent}>
    <Text style={styles.kicker}>{phase === 'returning' ? 'ターゲット帰還' : 'オチ／後日談'}</Text>
    <Image accessibilityLabel={targetName} source={targetImage} contentFit="contain" style={styles.image} />
    <Text style={styles.title}>{phase === 'returning' ? `おかえり、${targetName}` : '金庫より難しい王子様'}</Text>
    <Text style={styles.copy}>{phase === 'returning' ? `${targetName}は無事ホームへ戻った。` : `${enemyName}は金庫を開けられず、なぜか紅茶係に任命された。`}</Text>
    {phase === 'aftermath' ? <><MobbyAssetSurface variant="notice" style={styles.relationship} contentStyle={styles.relationshipContent}><Text style={styles.label}>関係性</Text><Text style={styles.relationshipText}>{relationshipLabel}</Text></MobbyAssetSurface><Text style={styles.ending}>ENDING：{endingLabel}</Text></> : null}
    <MobbyAssetButton accessibilityLabel={phase === 'returning' ? '後日談へ' : '関係性アルバムを見る'} onPress={phase === 'returning' ? onReturnComplete : onOpenCasebook} style={styles.primary}><Text style={styles.primaryText}>{phase === 'returning' ? '後日談へ' : '関係性アルバムを見る'}</Text></MobbyAssetButton>
    {phase === 'aftermath' ? <MobbyAssetButton accessibilityLabel="ホームへ" tone="cream" onPress={onDismiss} style={styles.secondary}><Text style={styles.secondaryText}>ホームへ</Text></MobbyAssetButton> : null}
  </MobbyAssetSurface></View>;
}
const styles = StyleSheet.create({ overlay:{...StyleSheet.absoluteFillObject,zIndex:180,backgroundColor:'rgba(10,6,14,.95)',alignItems:'center',justifyContent:'center',padding:20},card:{width:'100%',minHeight:560},cardContent:{minHeight:560,padding:28,alignItems:'center',justifyContent:'center',gap:12},kicker:{color:'#FFB8C2',fontWeight:'900'},image:{width:220,height:230},title:{color:'#FFF8EF',fontSize:26,fontWeight:'900',textAlign:'center'},copy:{color:'#F3DFDC',fontSize:16,lineHeight:23,textAlign:'center'},relationship:{width:'100%',minHeight:70},relationshipContent:{minHeight:70,paddingHorizontal:18,paddingVertical:14},label:{color:'#A55368',fontSize:12,fontWeight:'900'},relationshipText:{color:'#4C3045',fontSize:17,fontWeight:'900',marginTop:3},ending:{color:'#FFD38A',fontWeight:'900'},primary:{width:'100%',minHeight:54},primaryText:{color:'#FFF',fontSize:17,fontWeight:'900'},secondary:{width:'100%',minHeight:48},secondaryText:{color:'#70485E',fontWeight:'800'} });
