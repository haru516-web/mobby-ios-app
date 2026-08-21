import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export type LayoutSizeClass = 'compact' | 'phone' | 'tablet';

export const layoutTokens = {
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  minTapTarget: 44,
  typography: { supporting: 12, label: 14, body: 16, title: 22 },
  readableSceneMaxWidth: 720,
} as const;

export function useResponsiveLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  return useMemo(() => {
    const sizeClass: LayoutSizeClass = width <= 360 ? 'compact' : width < 600 ? 'phone' : 'tablet';
    const horizontalPadding = sizeClass === 'compact' ? 12 : sizeClass === 'phone' ? 16 : 24;
    return {
      width,
      height,
      fontScale,
      sizeClass,
      isCompact: sizeClass === 'compact',
      isTablet: sizeClass === 'tablet',
      horizontalPadding,
      contentWidth: Math.min(Math.max(0, width - horizontalPadding * 2), layoutTokens.readableSceneMaxWidth),
      tokens: layoutTokens,
    };
  }, [fontScale, height, width]);
}
