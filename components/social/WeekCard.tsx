import * as Sharing from 'expo-sharing';
import { Share2 } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, Share, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { ContourTexture, haptics } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { formatDistance, formatDuration, formatElevation } from '@/lib/format';
import { recapMessage, weekRecap } from '@/lib/weekRecap';
import { useTrailCache } from '@/stores/trailCache';
import { withAlpha } from '@/theme/color';
import { cardStyle, fonts, numericStyle } from '@/theme/tokens';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CARD_WIDTH = 340;

/**
 * "Your week in hiking": this week's climb, a bar per day, distance, time,
 * the biggest hike and the streak, drawn as a card you can share as an image.
 */
export function WeekCard({ name }: { name: string }) {
  const c = useColors();
  const logs = useTrailCache((s) => s.logs);
  const trails = useTrailCache((s) => s.trails);
  const shot = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const recap = useMemo(() => {
    const byId = new Map(trails.map((trail) => [trail.id, trail]));
    return weekRecap(logs, (id) => byId.get(id));
  }, [logs, trails]);

  const top = Math.max(1, ...recap.days);
  const today = (new Date().getDay() + 6) % 7;

  const share = async () => {
    if (sharing) return;
    haptics.tapLight();
    setSharing(true);
    const message = recapMessage(recap, formatElevation, formatDistance);
    try {
      if (Platform.OS !== 'web' && shot.current && (await Sharing.isAvailableAsync())) {
        const uri = await captureRef(shot, { format: 'png', quality: 1, result: 'tmpfile' });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share your week' });
      } else {
        await Share.share({ message });
      }
    } catch {
      // Cancelled, or no share sheet here: fall back to the words.
      await Share.share({ message }).catch(() => undefined);
    } finally {
      setSharing(false);
    }
  };

  return (
    <View className="mx-4 mt-6">
      <View
        ref={shot}
        collapsable={false}
        accessible
        accessibilityLabel={`Your week in hiking, ${recap.range}: ${recapMessage(recap, formatElevation, formatDistance)}`}
        style={[cardStyle(c), { overflow: 'hidden', paddingTop: 20, paddingBottom: 20 }]}
      >
        <ContourTexture seed={`week-${recap.range}`} width={CARD_WIDTH + 60} height={260} opacity={0.55} />
        <View className="flex-row items-baseline justify-between">
          <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 18 }}>Your week in hiking</Text>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 12 }}>{recap.range}</Text>
        </View>

        {recap.hikes === 0 ? (
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginTop: 10 }}>
            Rest week so far. Record a hike and this card fills in.
          </Text>
        ) : (
          <>
            <Text
              style={{ ...numericStyle('semibold'), color: c.climb, fontFamily: fonts.displayExtraBold, fontSize: 40, letterSpacing: -1, marginTop: 8 }}
            >
              {formatElevation(recap.gainM)}
            </Text>
            <Text style={{ color: c.fg2, fontFamily: fonts.uiSemibold, fontSize: 14 }}>
              climbed in {recap.hikes} {recap.hikes === 1 ? 'hike' : 'hikes'}
            </Text>

            <View className="mt-4 flex-row items-end gap-2" style={{ height: 52 }} accessibilityElementsHidden>
              {recap.days.map((gain, i) => (
                <View key={i} className="flex-1 items-center">
                  <View
                    style={{
                      width: '100%',
                      height: Math.max(4, (gain / top) * 38),
                      borderRadius: 4,
                      backgroundColor: gain > 0 ? c.climb : withAlpha(c.fgMuted, i <= today ? 0.25 : 0.12),
                    }}
                  />
                  <Text style={{ color: c.fgFaint, fontFamily: fonts.uiMedium, fontSize: 10, marginTop: 3 }}>{DAY_LETTERS[i]}</Text>
                </View>
              ))}
            </View>

            <View className="mt-4 flex-row gap-5">
              <View>
                <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 12 }}>Distance</Text>
                <Text style={{ ...numericStyle('semibold'), color: c.distance, fontFamily: fonts.uiSemibold, fontSize: 16 }}>
                  {formatDistance(recap.km)}
                </Text>
              </View>
              {recap.movingSeconds > 0 ? (
                <View>
                  <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 12 }}>Time</Text>
                  <Text style={{ ...numericStyle('semibold'), color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 16 }}>
                    {formatDuration(recap.movingSeconds)}
                  </Text>
                </View>
              ) : null}
              {recap.streakWeeks > 1 ? (
                <View>
                  <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 12 }}>Streak</Text>
                  <Text style={{ ...numericStyle('semibold'), color: c.streak, fontFamily: fonts.uiSemibold, fontSize: 16 }}>
                    {recap.streakWeeks} weeks
                  </Text>
                </View>
              ) : null}
            </View>
            {recap.biggest ? (
              <Text numberOfLines={1} style={{ color: c.fg2, fontFamily: fonts.ui, fontSize: 13, marginTop: 10 }}>
                Biggest climb: <Text style={{ fontFamily: fonts.uiSemibold }}>{recap.biggest.name}</Text>
              </Text>
            ) : null}
          </>
        )}
        <Text style={{ color: c.fgFaint, fontFamily: fonts.uiMedium, fontSize: 11, marginTop: 12 }}>{name} · Apex</Text>
      </View>

      {recap.hikes > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share your week"
          onPress={() => void share()}
          disabled={sharing}
          hitSlop={8}
          className="mt-2 flex-row items-center gap-1.5 self-end px-1 py-1 active:opacity-60"
        >
          <Share2 size={15} strokeWidth={1.8} color={c.fg2} />
          <Text style={{ color: c.fg2, fontFamily: fonts.uiMedium, fontSize: 13 }}>{sharing ? 'Getting it ready…' : 'Share your week'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
