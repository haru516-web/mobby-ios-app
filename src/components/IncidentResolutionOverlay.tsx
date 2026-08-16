import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

export type IncidentResolutionOverlayProps = {
  phase: 'returning' | 'aftermath'; targetName: string; targetImage: ImageSourcePropType;
  enemyName: string; endingLabel: string; relationshipLabel: string;
  onReturnComplete: () => void; onDismiss: () => void; onOpenCasebook: () => void;
};

export function IncidentResolutionOverlay({ phase, targetName, targetImage, enemyName, endingLabel, relationshipLabel, onReturnComplete, onDismiss, onOpenCasebook }: IncidentResolutionOverlayProps) {
  return <View style={styles.overlay} accessibilityViewIsModal><View style={styles.card}>
    <Text style={styles.kicker}>{phase === 'returning' ? 'ターゲット帰還' : 'オチ／後日談'}</Text>
    <Image accessibilityLabel={targetName} source={targetImage} resizeMode="contain" style={styles.image} />
    <Text style={styles.title}>{phase === 'returning' ? `おかえり、${targetName}` : '金庫より難しい王子様'}</Text>
    <Text style={styles.copy}>{phase === 'returning' ? `${targetName}は無事ホームへ戻った。` : `${enemyName}は金庫を開けられず、なぜか紅茶係に任命された。`}</Text>
    {phase === 'aftermath' ? <><View style={styles.relationship}><Text style={styles.label}>関係性</Text><Text style={styles.relationshipText}>{relationshipLabel}</Text></View><Text style={styles.ending}>ENDING：{endingLabel}</Text></> : null}
    <Pressable accessibilityRole="button" onPress={phase === 'returning' ? onReturnComplete : onOpenCasebook} style={styles.primary}><Text style={styles.primaryText}>{phase === 'returning' ? '後日談へ' : '関係性事件簿を見る'}</Text></Pressable>
    {phase === 'aftermath' ? <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.secondary}><Text style={styles.secondaryText}>ホームへ</Text></Pressable> : null}
  </View></View>;
}
const styles = StyleSheet.create({ overlay:{...StyleSheet.absoluteFillObject,zIndex:180,backgroundColor:'rgba(10,6,14,.95)',alignItems:'center',justifyContent:'center',padding:20},card:{width:'100%',borderRadius:24,backgroundColor:'#25182D',padding:20,alignItems:'center',gap:12},kicker:{color:'#FFB8C2',fontWeight:'900'},image:{width:220,height:230},title:{color:'#FFF8EF',fontSize:26,fontWeight:'900',textAlign:'center'},copy:{color:'#F3DFDC',fontSize:16,lineHeight:23,textAlign:'center'},relationship:{width:'100%',borderRadius:15,backgroundColor:'#FFF1DA',padding:13},label:{color:'#A55368',fontSize:12,fontWeight:'900'},relationshipText:{color:'#4C3045',fontSize:17,fontWeight:'900',marginTop:3},ending:{color:'#FFD38A',fontWeight:'900'},primary:{width:'100%',minHeight:54,borderRadius:17,backgroundColor:'#D85C70',alignItems:'center',justifyContent:'center'},primaryText:{color:'#FFF',fontSize:17,fontWeight:'900'},secondary:{minHeight:42,justifyContent:'center'},secondaryText:{color:'#E8C9CF',fontWeight:'800'} });
