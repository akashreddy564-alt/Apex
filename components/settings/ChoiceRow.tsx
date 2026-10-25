import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { fonts } from '@/theme/tokens';

export interface Choice<T extends string> {
  value: T;
  label: string;
  /** Shown above the label, e.g. a score badge sample. */
  preview?: ReactNode;
}

interface ChoiceRowProps<T extends string> {
  options: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** A row of mutually exclusive options, announced as radio buttons. */
export function ChoiceRow<T extends string>({ options, value, onChange }: ChoiceRowProps<T>) {
  const c = useColors();
  return (
    <View className="flex-row gap-2" accessibilityRole="radiogroup">
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked }}
            onPress={() => onChange(option.value)}
            className="flex-1 items-center gap-2 rounded-xl py-3"
            style={{
              backgroundColor: c.surface,
              borderWidth: 1.5,
              borderColor: checked ? c.accent : 'transparent',
            }}
          >
            {option.preview ? (
              <View style={{ height: 44, justifyContent: 'center' }}>{option.preview}</View>
            ) : null}
            <Text
              style={{
                color: checked ? c.fg : c.fgMuted,
                fontFamily: fonts.uiSemibold,
                fontSize: 13,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
