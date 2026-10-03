import DateTimePicker from '@expo/ui/community/datetime-picker';
import { View } from 'react-native';

interface HikeDateFieldProps {
  value: Date;
  maximumDate: Date;
  onChange: (date: Date) => void;
}

/** Native system date picker. Web uses HikeDateField.web.tsx. */
export function HikeDateField({ value, maximumDate, onChange }: HikeDateFieldProps) {
  return (
    <View
      className="overflow-hidden border border-zinc-800 bg-zinc-900"
      style={{ borderRadius: 12 }}
    >
      <DateTimePicker
        value={value}
        mode="date"
        display="inline"
        presentation="inline"
        maximumDate={maximumDate}
        accentColor="#8B9A6D"
        themeVariant="dark"
        onValueChange={(_event, selected) => onChange(selected)}
      />
    </View>
  );
}
