import { memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { MobbyAssetTabButton } from '@/components/mobby-ui';

export type BlackStarToggleProps = {
  active: boolean;
  onChange: (active: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Controlled on purpose: each screen owns its own boolean, so leaving that
 * screen naturally returns the next screen to the normal Mobby roster.
 */
export const BlackStarToggle = memo(function BlackStarToggle({
  active,
  onChange,
  disabled = false,
  style,
  testID,
}: BlackStarToggleProps) {
  return (
    <MobbyAssetTabButton
      accessibilityHint={active ? '通常のモビー表示に戻します' : '黒星の一覧に切り替えます'}
      accessibilityLabel="黒星"
      selected={active}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onChange(!active)}
      style={[
        styles.button,
        active && styles.buttonActive,
        disabled && styles.buttonDisabled,
        style,
      ]}
      testID={testID}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.star, active && styles.starActive]}>
        <Text style={[styles.starText, active && styles.starTextActive]}>★</Text>
      </View>
      <Text style={[styles.label, active && styles.labelActive]}>黒星</Text>
    </MobbyAssetTabButton>
  );
});

const styles = StyleSheet.create({
  button: {
    minWidth: 92,
    minHeight: 42,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#30273A',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  buttonActive: {
    borderColor: '#17131D',
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.42,
  },
  buttonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
  star: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#30273A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starActive: {
    backgroundColor: '#F0C766',
  },
  starText: {
    color: '#FFF8ED',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  starTextActive: {
    color: '#241B2B',
  },
  label: {
    color: '#30273A',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
    letterSpacing: 1,
  },
  labelActive: {
    color: '#FFF8ED',
  },
});
