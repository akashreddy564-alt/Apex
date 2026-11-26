import { Pressable, Text, View } from 'react-native';

import { haptics } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/theme/tokens';

/** Two or three tabs in a pill, styled like the board's PeriodSwitch. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const c = useColors();
  return (
    <View className="flex-row rounded-xl bg-surface p-1" accessibilityRole="tablist">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (on) return;
              haptics.select();
              onChange(option.value);
            }}
            className={`flex-1 items-center rounded-lg py-2 ${on ? 'bg-fg' : ''}`}
          >
            <Text style={{ color: on ? c.bg : c.fgMuted, fontFamily: fonts.uiSemibold, fontSize: 13 }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
