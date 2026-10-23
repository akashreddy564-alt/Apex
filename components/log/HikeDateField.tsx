import DateTimePicker from '@expo/ui/community/datetime-picker';
import { View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { useSettings } from '@/stores/settingsStore';

interface HikeDateFieldProps {
  value: Date;
  maximumDate: Date;
  onChange: (date: Date) => void;
}

/** Native system date picker. Web uses HikeDateField.web.tsx. */
export function HikeDateField({ value, maximumDate, onChange }: HikeDateFieldProps) {
  const c = useColors();
  const appearance = useSettings((s) => s.appearance);
  return (
    <View
      className="overflow-hidden border border-raised bg-surface"
      style={{ borderRadius: 12 }}
    >
      <DateTimePicker
        value={value}
        mode="date"
        display="inline"
        presentation="inline"
        maximumDate={maximumDate}
        accentColor={c.accent}
        themeVariant={appearance}
        onValueChange={(_event, selected) => onChange(selected)}
      />
    </View>
  );
}
