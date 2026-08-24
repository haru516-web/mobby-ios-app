import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ImageSourcePropType } from 'react-native';

import {
  getGachaCharacter,
  getGachaReward,
  isGachaThemeRewardId,
  type GachaCharacterSummary,
  type GachaThemeAssetSlot,
  type GachaThemeReward,
  type GachaThemeRewardId,
} from '@/data/gachaCatalog';

export type ResolvedGachaThemeAssets = Readonly<Record<GachaThemeAssetSlot, ImageSourcePropType>>;

export type ActiveGachaTheme = {
  id: GachaThemeRewardId;
  reward: GachaThemeReward;
  character: GachaCharacterSummary;
  assets: ResolvedGachaThemeAssets;
};

type GachaThemeContextValue = {
  activeTheme: ActiveGachaTheme | null;
};

const GachaThemeContext = createContext<GachaThemeContextValue>({ activeTheme: null });

export function GachaThemeProvider({ themeId, children }: {
  themeId: GachaThemeRewardId | null;
  children: ReactNode;
}) {
  const activeTheme = useMemo<ActiveGachaTheme | null>(() => {
    if (!themeId || !isGachaThemeRewardId(themeId)) return null;
    const reward = getGachaReward(themeId);
    if (reward.category !== 'theme') return null;
    const assets = Object.fromEntries(
      Object.entries(reward.assets).map(([slot, reference]) => [slot, reference.source ?? reference.fallbackSource]),
    ) as ResolvedGachaThemeAssets;
    return {
      id: themeId,
      reward,
      character: getGachaCharacter(reward.characterId),
      assets,
    };
  }, [themeId]);

  return <GachaThemeContext.Provider value={{ activeTheme }}>{children}</GachaThemeContext.Provider>;
}

export function useGachaTheme() {
  return useContext(GachaThemeContext);
}
