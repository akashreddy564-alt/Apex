import { Pressable, Text, View } from 'react-native';

import { haptics } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { useFollowToggle } from '@/hooks/useFollows';
import { fonts } from '@/theme/tokens';

/**
 * Follow / Following, Strava-style. Following shows you their hikes; it
 * doesn't make you friends (friends boards and groups still need a request).
 * Shows the new state at once while the server catches up.
 */
export function FollowButton({
  personId,
  name,
  following,
  compact = false,
}: {
  personId: string;
  name: string;
  following: boolean;
  compact?: boolean;
}) {
  const c = useColors();
  const toggle = useFollowToggle();
  const pending = toggle.isPending ? toggle.variables : null;
  const on = pending && pending.personId === personId ? pending.follow : following;
  const label = on ? 'Following' : 'Follow';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={on ? `Following ${name}. Tap to unfollow` : `Follow ${name}`}
      onPress={() => {
        haptics.select();
        toggle.mutate({ personId, follow: !on });
      }}
      disabled={toggle.isPending}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <View
        style={{
          minHeight: compact ? 34 : 44,
          paddingHorizontal: compact ? 14 : 22,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: on ? c.surface : c.accent,
          borderWidth: 1,
          borderColor: on ? c.raised : c.accent,
        }}
      >
        <Text style={{ color: on ? c.fg : c.onAccent, fontFamily: fonts.uiSemibold, fontSize: compact ? 13 : 15 }}>{label}</Text>
      </View>
    </Pressable>
  );
}
