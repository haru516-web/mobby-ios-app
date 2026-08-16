import { useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';

export type MobbyHaptics = {
  light: () => void;
  medium: () => void;
  heavy: () => void;
  success: () => void;
  error: () => void;
  stamp: () => void;
  threshold: () => void;
};

const THRESHOLD_THROTTLE_MS = 120;

/** Fire-and-forget haptics. Native/Web failures are intentionally non-fatal. */
export function useMobbyHaptics(enabled = true): MobbyHaptics {
  const lastThresholdAt = useRef(0);

  const safelyRun = useCallback(
    (effect: () => Promise<void>) => {
      if (!enabled) return;
      try {
        void effect().catch(() => undefined);
      } catch {
        // Unsupported native module, browser denial, and missing hardware are no-ops.
      }
    },
    [enabled],
  );

  const light = useCallback(
    () => safelyRun(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
    [safelyRun],
  );
  const medium = useCallback(
    () => safelyRun(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
    [safelyRun],
  );
  const heavy = useCallback(
    () => safelyRun(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
    [safelyRun],
  );
  const success = useCallback(
    () => safelyRun(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
    [safelyRun],
  );
  const error = useCallback(
    () => safelyRun(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
    [safelyRun],
  );
  const stamp = useCallback(
    () => safelyRun(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)),
    [safelyRun],
  );
  const threshold = useCallback(() => {
    const now = Date.now();
    if (now - lastThresholdAt.current < THRESHOLD_THROTTLE_MS) return;
    lastThresholdAt.current = now;
    safelyRun(Haptics.selectionAsync);
  }, [safelyRun]);

  return { light, medium, heavy, success, error, stamp, threshold };
}
