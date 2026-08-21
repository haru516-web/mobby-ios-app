import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text as NativeText, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';

import { ZEN_MARU_FONT } from './fontFamily';

type OutlinedTextProps = {
  children: ReactNode;
  accessibilityLabel?: string;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: TextStyle['fontWeight'];
  lineHeight?: number;
  outlineColor?: string;
  outlineWidth?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

/**
 * SVG-backed outlined display text. It intentionally handles one visual line:
 * wrapped or nested copy falls back to native Text so responsive layout and
 * screen-reader reading order remain predictable on iOS, Android, and web.
 */
export function OutlinedText({
  children,
  accessibilityLabel,
  color = '#5A351F',
  fontFamily = ZEN_MARU_FONT.bold,
  fontSize = 18,
  fontWeight = '700',
  lineHeight = Math.ceil(fontSize * 1.35),
  outlineColor = '#FFF8ED',
  outlineWidth = 2,
  style,
  textStyle,
}: OutlinedTextProps) {
  const plainText = useMemo(() => typeof children === 'string' || typeof children === 'number' ? String(children) : null, [children]);
  const label = accessibilityLabel ?? plainText ?? undefined;

  if (plainText === null || plainText.includes('\n')) {
    return (
      <NativeText
        accessibilityLabel={label}
        style={[{ color, fontFamily, fontSize, fontWeight: 'normal', lineHeight, textShadowColor: outlineColor, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: Math.max(1, outlineWidth / 2) }, textStyle]}
      >
        {children}
      </NativeText>
    );
  }

  return (
    <View accessible accessibilityLabel={label} accessibilityRole="text" style={[styles.container, { minHeight: lineHeight }, style]}>
      <Svg accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" width="100%" height={lineHeight} viewBox={`0 0 1000 ${lineHeight}`} preserveAspectRatio="xMinYMid meet">
        <SvgText
          x={outlineWidth}
          y={lineHeight - Math.max(2, (lineHeight - fontSize) / 2)}
          fill="none"
          fontFamily={fontFamily}
          fontSize={fontSize}
          fontWeight={fontWeight}
          stroke={outlineColor}
          strokeWidth={outlineWidth}
          strokeLinejoin="round"
        >
          {plainText}
        </SvgText>
        <SvgText
          x={outlineWidth}
          y={lineHeight - Math.max(2, (lineHeight - fontSize) / 2)}
          fill={color}
          fontFamily={fontFamily}
          fontSize={fontSize}
          fontWeight={fontWeight}
        >
          {plainText}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch', justifyContent: 'center', overflow: 'visible' },
});
