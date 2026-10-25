import { Pressable, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { displayXL, fonts } from '@/theme/tokens';

export type LogView = 'hikes' | 'rankings';

interface LogHeaderProps {
  view: LogView;
  onView: (view: LogView) => void;
  onStart: () => void;
  onLogPast: () => void;
  onProfile: () => void;
}

/** Log title, profile avatar, the two ways to add a hike, and the Hikes/Rankings switch. */
export function LogHeader({ view, onView, onStart, onLogPast, onProfile }: LogHeaderProps) {
  const c = useColors();
  return (
    <View className="px-4">
      <View className="flex-row items-center justify-between">
        <Text style={{ ...displayXL, color: c.fg }}>Log</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile and settings"
          onPress={onProfile}
          hitSlop={8}
          className="h-8 w-8 items-center justify-center rounded-full bg-raised"
        >
          <View className="h-3 w-3 rounded-full bg-fg-muted" />
        </Pressable>
      </View>

      <View className="mt-4 flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          onPress={onStart}
          className="flex-[1.4] flex-row items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 active:opacity-80"
        >
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.onAccent }} />
          <Text style={{ color: c.onAccent, fontFamily: fonts.uiSemibold, fontSize: 15 }}>
            Start a hike
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onLogPast}
          className="flex-1 items-center justify-center rounded-2xl bg-surface py-3.5 active:opacity-80"
        >
          <Text style={{ color: c.fg2, fontFamily: fonts.uiSemibold, fontSize: 14 }}>
            Log past hike
          </Text>
        </Pressable>
      </View>

      <View className="mt-3 flex-row rounded-xl bg-surface p-1" accessibilityRole="tablist">
        {(['hikes', 'rankings'] as const).map((option) => {
          const on = option === view;
          return (
            <Pressable
              key={option}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => onView(option)}
              className={`flex-1 items-center rounded-lg py-2 ${on ? 'bg-fg' : ''}`}
            >
              <Text
                style={{
                  color: on ? c.bg : c.fgMuted,
                  fontFamily: fonts.uiSemibold,
                  fontSize: 13,
                }}
              >
                {option === 'hikes' ? 'Hikes' : 'Rankings'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
