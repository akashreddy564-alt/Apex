import { Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { fonts } from '@/theme/tokens';

interface LocationDeniedProps {
  /** Start the hike anyway: the timer runs, no route is drawn. */
  onTimeOnly: () => void;
  onDismiss: () => void;
}

/** Shown when location is denied, so starting a hike isn't a dead end. */
export function LocationDenied({ onTimeOnly, onDismiss }: LocationDeniedProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 justify-end bg-black/60">
      <View className="rounded-t-3xl bg-bg px-5 pt-5" style={{ paddingBottom: insets.bottom + 16 }}>
        <Text style={{ color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 26, lineHeight: 30 }}>
          Location is off for Apex
        </Text>
        <Text style={{ color: c.fg2, fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, marginTop: 8 }}>
          Turn it on in Settings to draw your route and count distance and elevation. Or record
          just the time for this hike.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Settings"
          onPress={() => void Linking.openSettings().catch(() => undefined)}
          className="mt-5 items-center py-4"
          style={{ borderRadius: 18, backgroundColor: c.accent }}
        >
          <Text style={{ color: c.onAccent, fontFamily: fonts.uiSemibold, fontSize: 16 }}>Open Settings</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Record time only"
          onPress={onTimeOnly}
          className="mt-2 items-center py-4"
          style={{ borderRadius: 18, borderWidth: 1, borderColor: c.raised, backgroundColor: c.surface }}
        >
          <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 16 }}>Record time only</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Not now" onPress={onDismiss} className="items-center py-3">
          <Text style={{ color: c.fg2, fontFamily: fonts.uiSemibold, fontSize: 15 }}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}
