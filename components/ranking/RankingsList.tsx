import { useRouter } from 'expo-router';
import { Mountain, Trophy } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { haptics, PressScale, riseIn } from '@/components/motion';
import { RouteThumb } from '@/components/ranking/RouteFigure';
import { ScoreBadge } from '@/components/score/ScoreBadge';
import { useColors } from '@/hooks/useColors';
import { useRankings, type BucketSection } from '@/hooks/useRankings';
import { useYourTrailStats } from '@/hooks/useYourTrailStats';
import { formatOptionalDistance, formatOptionalElevation } from '@/lib/format';
import type { Bucket } from '@/lib/ranking';
import { rankReason } from '@/lib/reasons';
import { resolveRoute } from '@/lib/routeSource';
import { SHORT_LABELS } from '@/lib/scoreBadge';
import { useTrailCache } from '@/stores/trailCache';
import { withAlpha } from '@/theme/color';
import { fonts, numericStyle } from '@/theme/tokens';
import type { HikeLog, LeaderboardEntry, Trail } from '@/types/trail';

interface RankingsListProps {
  onOpenTrail: (trailId: string) => void;
}

type Filter = 'all' | Bucket;

interface Placed {
  entry: LeaderboardEntry;
  section: BucketSection;
  /** Overall place: Loved first, then Fine, then Didn't like, best first. */
  rank: number;
}

/** The route you walked (or the catalog's), as a shape for a thumbnail. Free: drawn on the phone. */
function useRouteShape(trail: Trail) {
  const recorded = useTrailCache((s) => {
    let best: { at: number; path: HikeLog['recorded_path'] } | null = null;
    for (const log of s.logs) {
      if (log.trail_id !== trail.id || !log.recorded_path) continue;
      const at = Date.parse(log.created_at);
      if (!best || at > best.at) best = { at, path: log.recorded_path };
    }
    return best?.path ?? null;
  });
  return useMemo(
    () => resolveRoute({ recorded, trailPath: trail.path, trailElevation: trail.elevation_profile, osm: null }),
    [recorded, trail.elevation_profile, trail.path],
  );
}

function Meta({ trail }: { trail: Trail }) {
  const c = useColors();
  const yours = useYourTrailStats(trail.id);
  return (
    <Text numberOfLines={1} style={{ fontFamily: fonts.mono, fontSize: 11, color: c.fgFaint, marginTop: 2 }}>
      {trail.region}
      {yours ? (
        <>
          {' · '}
          <Text style={{ color: c.distance }}>{formatOptionalDistance(yours.distanceKm)}</Text>
          {' · '}
          <Text style={{ color: c.climb }}>↑{formatOptionalElevation(yours.elevationGainM)}</Text>
        </>
      ) : null}
    </Text>
  );
}

/** One podium step: #1 stands taller in the middle, #2 and #3 either side. */
function PodiumCard({ placed, onPress }: { placed: Placed; onPress: () => void }) {
  const c = useColors();
  const { entry, section, rank } = placed;
  const tone = c[section.bucket];
  const first = rank === 1;
  const shape = useRouteShape(entry.trail);
  return (
    <PressScale
      to={0.96}
      accessibilityRole="button"
      accessibilityLabel={`Number ${rank}, ${entry.trail.name}`}
      onPress={onPress}
      style={{
        flex: 1,
        marginTop: first ? 0 : 22,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: withAlpha(tone, first ? 0.55 : 0.3),
        backgroundColor: withAlpha(tone, first ? 0.14 : 0.08),
        paddingHorizontal: 10,
        paddingTop: 12,
        paddingBottom: 12,
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {first ? (
        <View style={{ position: 'absolute', top: 10, right: 10 }}>
          <Trophy size={14} strokeWidth={2} color={tone} />
        </View>
      ) : null}
      <Text style={{ fontFamily: fonts.poster, fontSize: first ? 34 : 26, lineHeight: first ? 38 : 30, color: tone }}>{rank}</Text>
      <View style={{ marginTop: 6, borderRadius: 14, overflow: 'hidden', backgroundColor: c.bg }}>
        <RouteThumb shape={shape} size={first ? 78 : 62} />
      </View>
      <Text
        numberOfLines={2}
        style={{ marginTop: 8, color: c.fg, fontFamily: fonts.uiSemibold, fontSize: first ? 14 : 13, lineHeight: 17, textAlign: 'center', minHeight: 34 }}
      >
        {entry.trail.name}
      </Text>
      <View style={{ marginTop: 6 }}>
        <ScoreBadge bucket={section.bucket} count={section.count} score={entry.score} size="sm" />
      </View>
    </PressScale>
  );
}

function RankRow({ placed, reason, index, onPress }: { placed: Placed; reason: string | null; index: number; onPress: () => void }) {
  const c = useColors();
  const { entry, section, rank } = placed;
  const tone = c[section.bucket];
  const shape = useRouteShape(entry.trail);
  return (
    <Animated.View entering={riseIn(index)} layout={LinearTransition.duration(220)}>
      <PressScale
        to={0.985}
        accessibilityRole="button"
        accessibilityLabel={`Number ${rank}, ${entry.trail.name}`}
        onPress={onPress}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}
      >
        <Text
          style={{ width: 34, textAlign: 'center', fontFamily: fonts.poster, fontSize: rank < 10 ? 26 : 21, lineHeight: 30, color: tone }}
        >
          {rank}
        </Text>
        <View style={{ borderRadius: 12, overflow: 'hidden', backgroundColor: c.surface, borderWidth: 1, borderColor: c.raised }}>
          <RouteThumb shape={shape} size={48} />
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 15 }}>
            {entry.trail.name}
          </Text>
          <Meta trail={entry.trail} />
          {reason ? (
            <Text numberOfLines={1} style={{ marginTop: 3, fontFamily: fonts.ui, fontSize: 12, color: c.fgMuted }}>
              {reason}
            </Text>
          ) : null}
        </View>
        <ScoreBadge bucket={section.bucket} count={section.count} score={entry.score} size="sm" />
      </PressScale>
    </Animated.View>
  );
}

function FilterChip({ label, count, tone, on, onPress }: { label: string; count?: number; tone?: string; on: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <PressScale
      to={0.94}
      haptic={false}
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      accessibilityLabel={count == null ? label : `${label}, ${count}`}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 36,
        paddingHorizontal: 13,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: on ? c.fg : c.raised,
        backgroundColor: on ? c.fg : c.surface,
      }}
    >
      {tone ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tone }} /> : null}
      <Text style={{ color: on ? c.bg : c.fg2, fontFamily: fonts.uiMedium, fontSize: 13 }}>{label}</Text>
      {count != null ? <Text style={{ color: on ? withAlpha(c.bg, 0.7) : c.fgFaint, fontSize: 12, ...numericStyle('medium') }}>{count}</Text> : null}
    </PressScale>
  );
}

/**
 * Your ranked trails: a podium for the top three, chips to show one bucket,
 * then every trail with its place, route and score. Loved, Fine and Didn't
 * like each keep their color all the way down.
 */
export function RankingsList({ onOpenTrail }: RankingsListProps) {
  const c = useColors();
  const router = useRouter();
  const { sections } = useRankings();
  const [filter, setFilter] = useState<Filter>('all');

  const placed: Placed[] = useMemo(() => {
    let rank = 0;
    return sections.flatMap((section) => section.entries.map((entry) => ({ entry, section, rank: ++rank })));
  }, [sections]);

  // Neighbours by the overall order: "Above X, below Y".
  const reasons = useMemo(
    () => new Map(placed.map((p, i) => [p.entry.trail.id, rankReason(placed[i + 1]?.entry.trail.name ?? null, placed[i - 1]?.entry.trail.name ?? null)])),
    [placed],
  );

  if (placed.length === 0) {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={{ alignItems: 'center', paddingHorizontal: 32, paddingTop: 36, paddingBottom: 24 }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.raised, alignItems: 'center', justifyContent: 'center' }}>
          <Mountain size={28} strokeWidth={1.6} color={c.fg2} />
        </View>
        <Text style={{ marginTop: 16, color: c.fg, fontFamily: fonts.display, fontSize: 20, textAlign: 'center' }}>Your list starts here</Text>
        <Text style={{ marginTop: 6, color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, textAlign: 'center' }}>
          Rate a hike Loved, Fine or Didn’t like, then pick between hikes. Apex builds your ranked list from those picks.
        </Text>
        <PressScale
          to={0.96}
          accessibilityRole="button"
          accessibilityLabel="Pick a trail to rank"
          onPress={() => router.push('/trails')}
          style={{ marginTop: 18, backgroundColor: c.accent, borderRadius: 999, paddingHorizontal: 20, minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ color: c.onAccent, fontFamily: fonts.uiSemibold, fontSize: 15 }}>Pick a trail to rank</Text>
        </PressScale>
      </Animated.View>
    );
  }

  // From four up, so the list below the podium is never empty.
  const showPodium = filter === 'all' && placed.length >= 4;
  const podium = showPodium ? placed.slice(0, 3) : [];
  const rows = placed.filter((p) => (filter === 'all' ? !showPodium || p.rank > 3 : p.section.bucket === filter));

  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 16 }} accessibilityRole="tablist">
        <FilterChip label="All" count={placed.length} on={filter === 'all'} onPress={() => setFilter('all')} />
        {sections.map((s) => (
          <FilterChip
            key={s.bucket}
            label={SHORT_LABELS[s.bucket]}
            count={s.count}
            tone={c[s.bucket]}
            on={filter === s.bucket}
            onPress={() => setFilter(s.bucket)}
          />
        ))}
      </View>

      {showPodium ? (
        <Animated.View entering={FadeIn.duration(260)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 16, marginTop: 18 }}>
          {[podium[1], podium[0], podium[2]].map((p) => (
            <PodiumCard key={p.entry.trail.id} placed={p} onPress={() => onOpenTrail(p.entry.trail.id)} />
          ))}
        </Animated.View>
      ) : null}

      <View style={{ marginTop: 14 }}>
        {rows.map((p, index) => {
          const firstOfBucket = index === 0 || rows[index - 1]!.section.bucket !== p.section.bucket;
          return (
            <View key={p.entry.trail.id}>
              {firstOfBucket ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: index === 0 ? 4 : 14, paddingBottom: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c[p.section.bucket] }} />
                  <Text style={{ color: c[p.section.bucket], fontFamily: fonts.uiSemibold, fontSize: 12, letterSpacing: 0.9, textTransform: 'uppercase' }}>
                    {SHORT_LABELS[p.section.bucket]}
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: withAlpha(c[p.section.bucket], 0.25) }} />
                </View>
              ) : null}
              <RankRow placed={p} reason={reasons.get(p.entry.trail.id) ?? null} index={index} onPress={() => onOpenTrail(p.entry.trail.id)} />
            </View>
          );
        })}
      </View>
    </View>
  );
}
