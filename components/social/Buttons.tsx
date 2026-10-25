import { ActivityIndicator, Pressable, Text } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { fonts } from '@/theme/tokens';

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  /** Accessibility label when it differs from the visible text. */
  a11y?: string;
  compact?: boolean;
}

/** Bone fill. One per screen. */
export function PrimaryButton({ label, onPress, disabled, busy, a11y, compact }: ButtonProps) {
  const c = useColors();
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: Boolean(off), busy: Boolean(busy) }}
      disabled={off}
      onPress={onPress}
      className="items-center justify-center rounded-2xl active:opacity-85"
      style={{
        backgroundColor: c.accent,
        opacity: off ? 0.5 : 1,
        paddingVertical: compact ? 9 : 14,
        paddingHorizontal: compact ? 16 : 20,
        minHeight: compact ? 38 : 48,
      }}
    >
      {busy ? (
        <ActivityIndicator color={c.onAccent} />
      ) : (
        <Text style={{ color: c.onAccent, fontFamily: fonts.uiSemibold, fontSize: compact ? 14 : 15 }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** Surface fill, for everything that isn't the main action. */
export function SecondaryButton({ label, onPress, disabled, busy, a11y, compact }: ButtonProps) {
  const c = useColors();
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: Boolean(off), busy: Boolean(busy) }}
      disabled={off}
      onPress={onPress}
      className="items-center justify-center rounded-2xl bg-surface active:opacity-80"
      style={{
        opacity: off ? 0.5 : 1,
        paddingVertical: compact ? 9 : 14,
        paddingHorizontal: compact ? 16 : 20,
        minHeight: compact ? 38 : 48,
      }}
    >
      {busy ? (
        <ActivityIndicator color={c.fg2} />
      ) : (
        <Text style={{ color: c.fg2, fontFamily: fonts.uiSemibold, fontSize: compact ? 14 : 15 }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
