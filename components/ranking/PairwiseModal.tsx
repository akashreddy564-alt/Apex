import { Check, Undo2, X } from 'lucide-react-native';
import { scheduleOnRN } from 'react-native-worklets';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContourLoader, haptics, PressScale } from '@/components/motion';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { withAlpha } from '@/theme/color';
import { useColors } from '@/hooks/useColors';
import { LeaderboardReveal } from '@/components/ranking/LeaderboardReveal';
import { ElevationStrip, RouteThumb } from '@/components/ranking/RouteFigure';
import type { UseTrailComparisonResult } from '@/hooks/useTrailComparison';
import {
  DISTANCE_UNIT,
  ELEVATION_UNIT,
  formatDuration,
  formatElevationRange,
  MISSING_METRIC,
  toFeet,
  toMiles,
} from '@/lib/format';
import { BUCKET_BANDS, BUCKETS, type Bucket } from '@/lib/ranking';
import { yourTrailStats } from '@/lib/yourTrailStats';
import { resolveRoute, routeSourceLabel } from '@/lib/routeSource';
import { useTrailCache } from '@/stores/trailCache';
import { fonts, numericStyle, type Palette } from '@/theme/tokens';
import type { ElevationSample, HikeLog, Trail } from '@/types/trail';

interface PairwiseModalProps {
  visible: boolean;
  comparison: UseTrailComparisonResult;
  onClose: () => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function hikeWhen(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const today =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  return today ? 'today' : `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function rangeLabel(samples: ElevationSample[] | null): string {
  if (!samples || samples.length < 2) return 'No elevation data';
  const values = samples.map((sample) => sample.elevation_m);
  return formatElevationRange(Math.min(...values), Math.max(...values));
}

function latestLog(logs: HikeLog[], trailId: string, recordedOnly = false): HikeLog | null {
  let best: HikeLog | null = null;
  let bestTime = Number.NEGATIVE_INFINITY;
  for (const log of logs) {
    if (log.trail_id !== trailId) continue;
    if (recordedOnly && !log.recorded_path) continue;
    const time = Date.parse(log.created_at);
    const stamp = Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
    if (!best || stamp >= bestTime) {
      best = log;
      bestTime = stamp;
    }
  }
  return best;
}

function Stat({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: string }) {
  const c = useColors();
  return (
    <View>
      <Text style={{ fontSize: 12, color: c.fgMuted, fontFamily: fonts.ui }}>{label}</Text>
      <Text style={{ marginTop: 2, fontSize: 17, color: tone ?? c.fg, ...numericStyle('semibold') }}>
        {value}
        {unit ? (
          <Text style={{ fontSize: 12, color: c.fgMuted, ...numericStyle('medium') }}> {unit}</Text>
        ) : null}
      </Text>
    </View>
  );
}

function HikePanel({
  trail,
  onPress,
}: {
  trail: Trail;
  onPress: () => void;
}) {
  const c = useColors();
  const logs = useTrailCache((state) => state.logs);
  const log = latestLog(logs, trail.id);
  const recorded = latestLog(logs, trail.id, true)?.recorded_path ?? null;
  const shape = resolveRoute({
    recorded,
    trailPath: trail.path,
    trailElevation: trail.elevation_profile,
    osm: null,
  });
  const missing = shape.origin === 'none' || shape.coordinates.length < 2;
  const when = hikeWhen(log?.created_at ?? null);
  // Your own hike's numbers, never the catalog's.
  const yours = yourTrailStats(trail.id, logs);
  const km = yours?.distanceKm ?? null;
  const gainM = yours?.elevationGainM ?? null;
  const duration = yours?.durationSeconds ? formatDuration(yours.durationSeconds) : MISSING_METRIC;
  const [stripWidth, setStripWidth] = useState(280);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
    >
      {/* Plain View for layout: NativeWind drops function styles on Pressable on iOS. */}
      {({ pressed }) => (
        <View
          style={{
            borderRadius: 22,
            overflow: 'hidden',
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.raised,
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 12,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1, alignSelf: 'flex-start', paddingRight: 4 }}>
              <Text
                style={{
                  color: c.fg,
                  fontFamily: fonts.displayExtraBold,
                  fontWeight: 'normal',
                  fontSize: 22,
                  lineHeight: 24,
                }}
              >
                {trail.name}
              </Text>
              <Text style={{ marginTop: 5, fontSize: 13, color: c.fgMuted, fontFamily: fonts.ui }}>
                {trail.region}
                {when ? ` · ${when}` : ''}
              </Text>
              <View style={{ flexDirection: 'row', gap: 14, marginTop: 12 }}>
                <Stat
                  label="Distance"
                  value={km == null ? MISSING_METRIC : toMiles(km).toFixed(1)}
                  unit={km == null ? undefined : DISTANCE_UNIT}
                  tone={km == null ? undefined : c.distance}
                />
                <Stat
                  label="Gain"
                  value={gainM == null ? MISSING_METRIC : String(Math.round(toFeet(gainM)))}
                  unit={gainM == null ? undefined : ELEVATION_UNIT}
                  tone={gainM == null ? undefined : c.climb}
                />
                <Stat label="Time" value={duration} />
              </View>
            </View>
            <RouteThumb shape={shape} />
          </View>
          <View
            style={{ marginTop: 12 }}
            onLayout={(event) => {
              const next = Math.round(event.nativeEvent.layout.width);
              if (next > 0 && next !== stripWidth) setStripWidth(next);
            }}
          >
            <ElevationStrip
              samples={missing ? null : shape.elevation}
              width={stripWidth}
              caption={missing ? log?.notes ?? null : null}
            />
          </View>
          <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ flex: 1, fontSize: 11, color: c.fgMuted, fontFamily: fonts.ui }}>
              {routeSourceLabel(shape.origin)}
            </Text>
            <Text style={{ fontSize: 11, color: c.fgMuted, ...numericStyle() }}>
              {missing ? 'No elevation data' : rangeLabel(shape.elevation)}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export function PairwiseModal({ visible, comparison, onClose }: PairwiseModalProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const {
    phase,
    trailId,
    bucket,
    round,
    preview,
    progress,
    canUndo,
    pickBucket,
    choose,
    undo,
    place,
    reset,
  } = comparison;

  const discard = () => {
    reset();
    onClose();
  };

  // The loader should only flash between phases. If it lingers (no round can be built),
  // close instead of hanging: App Review treats an endless spinner as a broken app.
  const loading =
    visible && phase !== 'bucket' && !(phase === 'preview' && preview) && !round;
  const discardRef = useRef(discard);
  discardRef.current = discard;
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => discardRef.current(), LOADER_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  // Your difficulty rating, picked above the buckets and saved with the ranking.
  const [difficulty, setDifficulty] = useState<number | null>(null);
  useEffect(() => {
    if (!visible) setDifficulty(null);
  }, [visible]);

  const confirmPlace = () => {
    // The difficulty travels in the ranking's own save (no second request to race it).
    place(difficulty);
    reset();
    onClose();
  };

  const pick = (choice: 'challenger' | 'opponent' | 'too_close' | 'skip') => {
    haptics.select();
    choose(choice);
  };

  const trailName = useTrailCache((s) => s.trails.find((t) => t.id === trailId)?.name ?? 'this hike');
  // Leaving the result screen keeps the ranking; anywhere earlier, nothing is saved.
  const close = phase === 'preview' && preview ? confirmPlace : discard;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 6 }}>
        {phase === 'preview' && preview ? (
          <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}>
            <LeaderboardReveal
              entries={preview.leaderboard}
              ordinalRank={preview.ordinalRank}
              score={preview.score}
              count={preview.count}
              bucket={preview.bucket}
              trailName={trailName}
              onBack={undo}
              onDone={confirmPlace}
              difficulty={difficulty}
              onDifficulty={setDifficulty}
            />
          </View>
        ) : phase === 'bucket' ? (
          <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}>
            <View style={{ marginBottom: 22, flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                accessibilityLabel="Close"
                onPress={discard}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.raised,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} strokeWidth={1.75} color={c.fgMuted} />
              </Pressable>
            </View>
            <Animated.Text
              entering={FadeIn.duration(260)}
              accessibilityRole="header"
              style={{ color: c.fg, fontFamily: fonts.displayExtraBold, fontWeight: 'normal', fontSize: 30, lineHeight: 34 }}
            >
              How was {trailName}?
            </Animated.Text>
            <Text style={{ marginTop: 8, color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15 }}>Pick one. You can compare it next.</Text>
            <View style={{ marginTop: 22, gap: 12 }}>
              {BUCKETS.map((item, index) => (
                <Animated.View key={item} entering={FadeInDown.delay(40 + index * 50).duration(300)}>
                  <BucketChoice bucket={item} onPick={() => pickBucket(item)} />
                </Animated.View>
              ))}
            </View>
          </View>
        ) : round ? (
          <View style={{ flex: 1 }}>
            <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable
                accessibilityLabel="Close"
                onPress={discard}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.raised,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} strokeWidth={1.75} color={c.fgMuted} />
              </Pressable>
              <Progress step={progress?.step ?? 1} estimate={progress?.estimate ?? 1} tone={bucket ? c[bucket] : c.fg} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Undo last pick"
                onPress={undo}
                disabled={!canUndo}
                hitSlop={6}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.raised,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: canUndo ? 1 : 0.4,
                }}
              >
                <Undo2 size={17} strokeWidth={2} color={c.fgMuted} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}>
              <Text
                style={{
                  marginTop: 22,
                  paddingHorizontal: 4,
                  color: c.fg,
                  fontFamily: fonts.displayExtraBold,
                  fontWeight: 'normal',
                  fontSize: 30,
                  lineHeight: 32,
                }}
              >
                Which hike was better?
              </Text>
              <Animated.View key={round.opponent.id} entering={FadeIn.duration(220)} style={{ marginTop: 16 }}>
                <HikePanel trail={round.challenger} onPress={() => pick('challenger')} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8, paddingHorizontal: 8 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: c.raised }} />
                  <Text style={{ color: c.fgFaint, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2 }}>OR</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: c.raised }} />
                </View>
                <HikePanel trail={round.opponent} onPress={() => pick('opponent')} />
              </Animated.View>
              <View style={{ marginTop: 18, flexDirection: 'row', justifyContent: 'center', gap: 28 }}>
                <Pressable accessibilityRole="button" onPress={() => pick('too_close')} hitSlop={8} style={{ minHeight: 40, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, color: c.fgMuted, fontFamily: fonts.uiMedium }}>Too close to call</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => pick('skip')} hitSlop={8} style={{ minHeight: 40, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, color: c.fgMuted, fontFamily: fonts.uiMedium }}>Skip</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ContourLoader size="screen" label="Preparing comparison" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={discard}
              style={[actionStyle(c), { flex: 0, marginTop: 24, paddingHorizontal: 28 }]}
            >
              <Text style={{ fontSize: 14, color: c.fg2, fontFamily: fonts.uiMedium }}>Cancel</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

export const LOADER_TIMEOUT_MS = 3000;

/**
 * One rating: a calm row with a ring in its color. Tapping fills the row
 * with that color from the left, checks the ring and ticks, then moves on,
 * so the choice is felt before the next screen arrives.
 */
function BucketChoice({ bucket, onPick }: { bucket: Bucket; onPick: () => void }) {
  const c = useColors();
  const tone = c[bucket];
  const fill = useSharedValue(0);
  const [picked, setPicked] = useState(false);
  const band = BUCKET_BANDS[bucket];
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));
  return (
    <PressScale
      to={0.98}
      haptic={false}
      disabled={picked}
      accessibilityRole="button"
      accessibilityLabel={`${band.label}, scores ${band.lo.toFixed(0)} to ${Math.round(band.hi)}`}
      onPress={() => {
        setPicked(true);
        haptics.tapMedium();
        fill.value = withTiming(1, { duration: 260 }, (finished) => {
          if (finished) scheduleOnRN(onPick);
        });
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        minHeight: 72,
        paddingHorizontal: 18,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: picked ? tone : c.raised,
        backgroundColor: c.surface,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: withAlpha(tone, 0.16), transformOrigin: 'left' }, fillStyle]}
      />
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          borderWidth: 2.5,
          borderColor: tone,
          backgroundColor: picked ? tone : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {picked ? <Check size={15} strokeWidth={3} color={c.surface} /> : null}
      </View>
      <Text style={{ flex: 1, fontSize: 19, color: c.fg, fontFamily: fonts.uiSemibold }}>{band.label}</Text>
      <Text style={{ fontSize: 13, color: c.fgMuted, ...numericStyle('medium') }}>
        {band.lo.toFixed(0)}–{Math.round(band.hi)}
      </Text>
    </PressScale>
  );
}

/** How far through the picks you are: one segment per expected pick, filled up to this one. */
function Progress({ step, estimate, tone }: { step: number; estimate: number; tone: string }) {
  const c = useColors();
  const total = Math.max(1, Math.min(8, estimate));
  return (
    <View
      accessibilityLabel={`Pick ${step} of about ${estimate}`}
      style={{ flex: 1, flexDirection: 'row', gap: 4, marginHorizontal: 14 }}
    >
      {Array.from({ length: total }, (_, i) => (
        <Segment key={i} on={i < step} tone={tone} track={c.raised} />
      ))}
    </View>
  );
}

function Segment({ on, tone, track }: { on: boolean; tone: string; track: string }) {
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: withTiming(on ? 1 : 0, { duration: 320 }) }] }));
  return (
    <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={[{ height: 4, borderRadius: 2, backgroundColor: tone, transformOrigin: 'left' }, fill]} />
    </View>
  );
}

const actionStyle = (c: Palette) => ({
  flex: 1,
  height: 48,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: c.raised,
  backgroundColor: c.surface,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 6,
});
