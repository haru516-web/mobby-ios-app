import { StyleSheet, Text as NativeText, type TextProps } from 'react-native';

import { useResponsiveLayout } from './responsive';
import { zenMaruFamily } from '../text/fontFamily';

function isDarkTextColor(color: unknown) {
  if (typeof color !== 'string') return true;
  const value = color.trim().toLowerCase();
  if (value === 'transparent') return false;
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i)?.[1];
  if (hex) {
    const normalized = hex.length === 3 ? hex.split('').map((digit) => `${digit}${digit}`).join('') : hex.slice(0, 6);
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    return red * 0.299 + green * 0.587 + blue * 0.114 < 205;
  }
  const rgb = value.match(/^rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i);
  if (rgb) return Number(rgb[1]) * 0.299 + Number(rgb[2]) * 0.587 + Number(rgb[3]) * 0.114 < 205;
  return value !== 'white';
}

/** Keep display headings playful while body copy stays rounded, bold, and readable. */
export function Text({ style, maxFontSizeMultiplier = 1.2, ...props }: TextProps) {
  const { scale } = useAppLayout();
  const flattened = StyleSheet.flatten(style);
  const fontSize = typeof flattened?.fontSize === 'number' ? flattened.fontSize : 12;
  const lineHeight = typeof flattened?.lineHeight === 'number' ? flattened.lineHeight : undefined;
  const compactTypeScale = Math.min(1.22, Math.max(1, 0.9 / Math.max(scale, 0.01)));
  const compactType = compactTypeScale > 1.005 && fontSize < 15
    ? { fontSize: fontSize * compactTypeScale, ...(lineHeight ? { lineHeight: lineHeight * compactTypeScale } : null) }
    : null;
  const fontWeight = flattened?.fontWeight;
  const fontFamily = zenMaruFamily(fontWeight);
  const ivoryEdge = isDarkTextColor(flattened?.color) && !flattened?.textShadowColor
    ? { textShadowColor: 'rgba(255,250,237,0.94)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 1.15 }
    : null;
  return <NativeText {...props} maxFontSizeMultiplier={maxFontSizeMultiplier} style={[style, compactType, ivoryEdge, { fontFamily, fontWeight: 'normal' }]} />;
}

export function useAppLayout() {
  const { width, height } = useResponsiveLayout();
  return { width: Math.min(width, 720), height, scale: 1 };
}
