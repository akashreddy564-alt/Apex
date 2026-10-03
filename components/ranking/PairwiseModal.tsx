import * as Haptics from 'expo-haptics';
import { Undo2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LeaderboardReveal } from '@/components/ranking/LeaderboardReveal';
import { ElevationStrip, RouteThumb } from '@/components/ranking/RouteFigure';
import type { UseTrailComparisonResult } from '@/hooks/useTrailComparison';
import { formatDuration, formatElevationM, MISSING_METRIC } from '@/lib/format';
import { BUCKET_BANDS, BUCKETS, DEFAULT_HIKE_TYPE } from '@/lib/ranking';
import { resolveRoute, routeSourceLabel } from '@/lib/routeSource';
import { useTrailCache } from '@/stores/trailCache';
import { colors, fonts, numericStyle } from '@/theme/tokens';
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
  const low = formatElevationM(Math.min(...values)).replace(/ m$/, '');
  const high = formatElevationM(Math.max(...values)).replace(/ m$/, '');
  return `${low}–${high} m`;
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

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View>
      <Text style={{ fontSize: 12, color: colors.fgMuted, fontFamily: fonts.ui }}>{label}</Text>
      <Text style={{ marginTop: 2, fontSize: 17, color: colors.fg, ...numericStyle('semibold') }}>
        {value}
        {unit ? (
          <Text style={{ fontSize: 12, color: colors.fgMuted, ...numericStyle('medium') }}> {unit}</Text>
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
  const duration = log?.duration_seconds
    ? formatDuration(log.duration_seconds)
    : trail.avg_moving_time_seconds
      ? formatDuration(trail.avg_moving_time_seconds)
      : MISSING_METRIC;
  const [stripWidth, setStripWidth] = useState(280);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 22,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.raised,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 12,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, alignSelf: 'flex-start', paddingRight: 4 }}>
          <Text
            style={{
              color: colors.fg,
              fontFamily: fonts.displayExtraBold,
              fontWeight: 'normal',
              fontSize: 22,
              lineHeight: 24,
            }}
          >
            {trail.name}
          </Text>
          <Text style={{ marginTop: 5, fontSize: 13, color: colors.fgMuted, fontFamily: fonts.ui }}>
            {trail.region}
            {when ? ` · ${when}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 12 }}>
            <Stat
              label="Distance"
              value={trail.distance_km == null ? MISSING_METRIC : trail.distance_km.toFixed(1)}
              unit={trail.distance_km == null ? undefined : 'km'}
            />
            <Stat
              label="Gain"
              value={
                missing || trail.elevation_gain_m == null
                  ? `↑ ${MISSING_METRIC}`
                  : String(Math.round(trail.elevation_gain_m))
              }
              unit={missing || trail.elevation_gain_m == null ? undefined : 'm'}
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
        <Text style={{ flex: 1, fontSize: 11, color: colors.fgMuted, fontFamily: fonts.ui }}>
          {routeSourceLabel(shape.origin)}
        </Text>
        <Text style={{ fontSize: 11, color: colors.fgMuted, ...numericStyle() }}>
          {missing ? 'No elevation data' : rangeLabel(shape.elevation)}
        </Text>
      </View>
    </Pressable>
  );
}

export function PairwiseModal({ visible, comparison, onClose }: PairwiseModalProps) {
  const insets = useSafeAreaInsets();
  const {
    phase,
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

  const confirmPlace = () => {
    place();
    reset();
    onClose();
  };

  const pick = (choice: 'challenger' | 'opponent' | 'too_close' | 'skip') => {
    void Haptics.selectionAsync();
    choose(choice);
  };

  const typeName = DEFAULT_HIKE_TYPE === 'hike' ? 'Hike' : DEFAULT_HIKE_TYPE;
  const chip = bucket ? `${typeName} · ${BUCKET_BANDS[bucket].label}` : 'Compare';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={discard}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 6 }}>
        {phase === 'preview' && preview ? (
          <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}>
            <LeaderboardReveal
              entries={preview.leaderboard}
              ordinalRank={preview.ordinalRank}
              score={preview.score}
              count={preview.count}
              bucket={preview.bucket}
              onUndo={undo}
              onPlace={confirmPlace}
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
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.raised,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} strokeWidth={1.75} color={colors.fgMuted} />
              </Pressable>
            </View>
            <Text
              style={{
                color: colors.fg,
                fontFamily: fonts.displayExtraBold,
                fontWeight: 'normal',
                fontSize: 30,
                lineHeight: 32,
              }}
            >
              How was it?
            </Text>
            <View style={{ marginTop: 22, gap: 10 }}>
              {BUCKETS.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    pickBucket(item);
                  }}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: colors.raised,
                    backgroundColor: colors.surface,
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 17,
                      color: colors.fg,
                      fontFamily: fonts.uiSemibold,
                      fontWeight: 'normal',
                    }}
                  >
                    {BUCKET_BANDS[item].label}
                  </Text>
                  <Text style={{ marginTop: 4, fontSize: 13, color: colors.fgMuted, fontFamily: fonts.ui }}>
                    {BUCKET_BANDS[item].lo.toFixed(1)}–{BUCKET_BANDS[item].hi.toFixed(1)}
                  </Text>
                </Pressable>
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
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.raised,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} strokeWidth={1.75} color={colors.fgMuted} />
              </Pressable>
              <View
                style={{
                  height: 30,
                  paddingHorizontal: 12,
                  borderRadius: 15,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 13, color: colors.fg2, fontFamily: fonts.ui }}>{chip}</Text>
              </View>
              <Text
                style={{
                  width: 56,
                  textAlign: 'right',
                  fontSize: 13,
                  color: colors.fgMuted,
                  ...numericStyle(),
                }}
              >
                {progress ? `${progress.step} of ~${progress.estimate}` : ''}
              </Text>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}>
              <Text
                style={{
                  marginTop: 22,
                  paddingHorizontal: 4,
                  color: colors.fg,
                  fontFamily: fonts.displayExtraBold,
                  fontWeight: 'normal',
                  fontSize: 30,
                  lineHeight: 32,
                }}
              >
                Which hike was better?
              </Text>
              <View style={{ marginTop: 16, gap: 12 }}>
                <HikePanel trail={round.challenger} onPress={() => pick('challenger')} />
                <HikePanel trail={round.opponent} onPress={() => pick('opponent')} />
              </View>
              <View style={{ marginTop: 16, flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={undo}
                  disabled={!canUndo}
                  style={actionStyle}
                >
                  <Undo2 size={16} strokeWidth={2} color={canUndo ? colors.fgMuted : colors.fgFaint} />
                  <Text style={{ fontSize: 14, color: canUndo ? colors.fg2 : colors.fgFaint, fontFamily: fonts.uiMedium }}>
                    Undo
                  </Text>
                </Pressable>
                <Pressable onPress={() => pick('too_close')} style={[actionStyle, { flex: 1.6 }]}>
                  <Text style={{ fontSize: 14, color: colors.fg2, fontFamily: fonts.uiMedium }}>
                    Too close to call
                  </Text>
                </Pressable>
                <Pressable onPress={() => pick('skip')} style={actionStyle}>
                  <Text style={{ fontSize: 14, color: colors.fg2, fontFamily: fonts.uiMedium }}>Skip</Text>
                </Pressable>
              </View>
              <Text
                style={{
                  marginTop: 14,
                  textAlign: 'center',
                  fontSize: 13,
                  color: colors.fgMuted,
                  fontFamily: fonts.ui,
                }}
              >
                Tap the better hike
              </Text>
            </ScrollView>
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 13, color: colors.fgMuted, fontFamily: fonts.ui }}>
              Preparing comparison
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const actionStyle = {
  flex: 1,
  height: 48,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colors.raised,
  backgroundColor: colors.surface,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 6,
};
