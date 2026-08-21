import type { TextStyle } from 'react-native';

export const ZEN_MARU_FONT = {
  regular: 'ZenMaruGothic_400Regular',
  medium: 'ZenMaruGothic_500Medium',
  bold: 'ZenMaruGothic_700Bold',
  black: 'ZenMaruGothic_900Black',
} as const;

export function zenMaruFamily(fontWeight: TextStyle['fontWeight']) {
  const weight = String(fontWeight ?? '400');
  if (weight === '900' || weight === '800') return ZEN_MARU_FONT.black;
  if (weight === 'bold' || weight === '700' || weight === '600') return ZEN_MARU_FONT.bold;
  if (weight === '500') return ZEN_MARU_FONT.medium;
  return ZEN_MARU_FONT.regular;
}
