import { useRouter } from 'expo-router';
import { CloudSun } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Eyebrow, haptics, PressScale, ReasonLine } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { useWeekendPick } from '@/hooks/useWeekendPick';
import { formatOptionalDistance, formatOptionalElevation } from '@/lib/format';
import { cardStyle, fonts, numericStyle } from '@/theme/tokens';

/**
 * One trail for this weekend, shown Wednesday to Sunday. Picked on the phone
 * from the trails you loved; every reason line is one the data backs up.
 */
export function WeekendPick() {
  const c = useColors();
  const router = useRouter();
  const { pick, weather, skip } = useWeekendPick();
  if (!pick) return null;
  const { trail, reasons } = pick;

  return (
    <Animated.View key={trail.id} entering={FadeIn.duration(260)} style={{ marginHorizontal: 16, marginTop: 16 }}>
      <PressScale
        accessibilityRole="button"
        accessibilityLabel={`Weekend pick: ${trail.name}, ${trail.region}. Opens the trail.`}
        onPress={() => router.push({ pathname: '/trail/[id]', params: { id: trail.id } })}
        style={cardStyle(c)}
      >
        <Eyebrow>Weekend pick</Eyebrow>
        <Text
          style={{
            color: c.fg,
            fontFamily: fonts.displayExtraBold,
            fontSize: 26,
            lineHeight: 26 * 0.88 + 4,
            textTransform: 'uppercase',
            marginTop: 8,
          }}
          numberOfLines={2}
        >
          {trail.name}
        </Text>
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 4 }} numberOfLines={1}>
          {trail.region}
        </Text>
        <View className="mt-3 flex-row gap-5">
          <Text style={{ color: c.distance, fontSize: 15, ...numericStyle('semibold') }}>
            {formatOptionalDistance(trail.distance_km)}
          </Text>
          <Text style={{ color: c.climb, fontSize: 15, ...numericStyle('semibold') }}>
            {formatOptionalElevation(trail.elevation_gain_m)} climb
          </Text>
        </View>

        {reasons.length > 0 ? (
          <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: c.border }}>
            {reasons.map((reason) => (
              <ReasonLine key={reason.value} value={reason.value} text={reason.text} />
            ))}
          </View>
        ) : null}

        {weather ? (
          <View className="flex-row items-center gap-2" style={{ marginTop: reasons.length > 0 ? 0 : 12 }}>
            <CloudSun size={16} strokeWidth={1.6} color={c.fg2} />
            <Text style={{ color: c.fg2, fontFamily: fonts.ui, fontSize: 13 }}>{weather}</Text>
          </View>
        ) : null}
      </PressScale>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Not ${trail.name}. Show another trail.`}
        onPress={() => {
          haptics.tapLight();
          skip();
        }}
        hitSlop={8}
        className="self-end active:opacity-70"
        style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}
      >
        <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 13 }}>Not this one</Text>
      </Pressable>
    </Animated.View>
  );
}
