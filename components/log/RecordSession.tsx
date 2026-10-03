import { Pause, Play, Square } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Circle, Rect, Svg } from 'react-native-svg';

import { LiveTrackMap } from '@/components/log/LiveTrackMap';
import { paceSecondsPerKm } from '@/lib/hikeStats';
import { colors, fonts, numericStyle } from '@/theme/tokens';
import type { ElevationSample, GeoJSONLineString } from '@/types/trail';

const HOLD_MS = 1000;
const RING = 2 * Math.PI * 15;

interface TrackPoint {
  longitude: number;
  latitude: number;
  accuracy: number | null;
}

interface RecordSessionProps {
  trailName: string;
  trailPath: GeoJSONLineString | null;
  elevation: ElevationSample[] | null;
  peakElevationM: number | null;
  paused: boolean;
  movingSeconds: number;
  totalSeconds: number;
  pausedSeconds: number;
  distanceM: number;
  gainM: number;
  lossM: number;
  elevationM: number | null;
  savedAt: number | null;
  points: TrackPoint[];
  notice: string | null;
  notificationNote: string | null;
  finishSheetOpen: boolean;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
}

function clock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function pausedClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  if (minutes >= 60) return clock(safe);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function paceValue(distanceM: number, movingSeconds: number): string {
  const pace = paceSecondsPerKm(distanceM, movingSeconds);
  if (pace == null) return '—';
  const total = Math.round(pace);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function savedLabel(savedAt: number | null, now: number): string {
  if (savedAt == null) return 'Not saved yet';
  const seconds = Math.max(0, Math.round((now - savedAt) / 1000));
  if (seconds < 5) return 'Saved just now';
  if (seconds < 60) return `Saved ${seconds} s ago`;
  const minutes = Math.round(seconds / 60);
  return `Saved ${minutes} min ago`;
}

function StatCell({
  label,
  value,
  unit,
  edge,
}: {
  label: string;
  value: string;
  unit: string;
  edge?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: 12,
        paddingLeft: edge ? 16 : 0,
        borderLeftWidth: edge ? 1 : 0,
        borderLeftColor: colors.raised,
      }}
    >
      <Text style={{ fontSize: 14, color: colors.fgMuted, fontFamily: fonts.ui }}>{label}</Text>
      <Text style={{ marginTop: 2, fontSize: 30, color: colors.fg, ...numericStyle('semibold') }}>
        {value}
        {unit ? (
          <Text style={{ fontSize: 15, color: colors.fgMuted, ...numericStyle('medium') }}>
            {' '}
            {unit}
          </Text>
        ) : null}
      </Text>
    </View>
  );
}

function SignalBars() {
  const heights = [4, 6.5, 9, 12];
  return (
    <View style={{ width: 16, height: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 1.3 }}>
      {heights.map((bar, index) => (
        <View
          key={bar}
          style={{
            width: 3,
            height: bar,
            borderRadius: 1,
            backgroundColor: index === heights.length - 1 ? colors.borderStrong : colors.fg,
          }}
        />
      ))}
    </View>
  );
}

const DRAIN_MS = 200;

function HoldToStop({ onFinish, sheetOpen }: { onFinish: () => void; sheetOpen: boolean }) {
  const [progress, setProgress] = useState(0);
  const [screenReader, setScreenReader] = useState(false);
  const frame = useRef<number | null>(null);
  const started = useRef<number | null>(null);
  const done = useRef(false);
  const progressRef = useRef(0);
  const reduceMotion = useRef(false);
  const sheetWasOpen = useRef(false);

  const setRing = (value: number) => {
    progressRef.current = value;
    setProgress(value);
  };

  const drain = () => {
    if (frame.current != null) cancelAnimationFrame(frame.current);
    frame.current = null;
    started.current = null;
    done.current = false;
    if (reduceMotion.current || progressRef.current <= 0) {
      setRing(0);
      return;
    }
    const from = progressRef.current;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / DRAIN_MS);
      setRing(from * (1 - t));
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else frame.current = null;
    };
    frame.current = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (done.current) return;
    drain();
  };

  useEffect(() => {
    if (sheetWasOpen.current && !sheetOpen) drain();
    sheetWasOpen.current = sheetOpen;
  }, [sheetOpen]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (mounted) setScreenReader(enabled);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      reduceMotion.current = enabled;
    });
    const reader = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      reduceMotion.current = enabled;
    });
    return () => {
      mounted = false;
      reader.remove();
      motion.remove();
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, []);

  const begin = () => {
    if (frame.current != null) cancelAnimationFrame(frame.current);
    done.current = false;
    started.current = Date.now();
    const tick = () => {
      const elapsed = Date.now() - (started.current ?? Date.now());
      const next = Math.min(1, elapsed / HOLD_MS);
      setRing(next);
      if (next >= 1) {
        done.current = true;
        frame.current = null;
        onFinish();
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={screenReader ? 'Tap to finish' : 'Hold to stop'}
      accessibilityActions={[{ name: 'activate', label: 'Finish hike' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'activate') onFinish();
      }}
      onPress={screenReader ? onFinish : undefined}
      onPressIn={screenReader ? undefined : begin}
      onPressOut={screenReader ? undefined : stop}
      style={{
        flex: 1,
        height: 76,
        borderRadius: 22,
        backgroundColor: colors.raised,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 18,
        gap: 10,
      }}
    >
      {screenReader ? (
        <Square size={18} strokeWidth={1.75} color={colors.fg} />
      ) : (
        <Svg width={36} height={36}>
          <Circle cx={18} cy={18} r={15} stroke={colors.border} strokeWidth={3} fill="none" />
          <Circle
            cx={18}
            cy={18}
            r={15}
            stroke={colors.fg}
            strokeWidth={3}
            fill="none"
            strokeDasharray={`${RING}`}
            strokeDashoffset={RING * (1 - progress)}
            strokeLinecap="round"
            transform="rotate(-90 18 18)"
          />
          <Rect x={12} y={12} width={12} height={12} rx={2} fill={colors.fg} />
        </Svg>
      )}
      <Text
        style={{
          marginLeft: 8,
          fontSize: 17,
          lineHeight: 20,
          color: colors.fg,
          fontFamily: fonts.uiSemibold,
          fontWeight: 'normal',
        }}
      >
        {screenReader ? 'Tap to finish' : 'Hold\nto stop'}
      </Text>
    </Pressable>
  );
}

/** Live and paused recording. Sage is the track, and the Resume button once paused. */
export function RecordSession({
  trailName,
  trailPath,
  elevation,
  peakElevationM,
  paused,
  movingSeconds,
  totalSeconds,
  pausedSeconds,
  distanceM,
  gainM,
  lossM,
  elevationM,
  savedAt,
  points,
  notice,
  notificationNote,
  finishSheetOpen,
  onPause,
  onResume,
  onFinish,
}: RecordSessionProps) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const mapHeight = Math.max(220, Math.min(330, Math.round(height * 0.36)));
  const now = Date.now();
  const accuracy = [...points].reverse().find((point) => point.accuracy != null)?.accuracy ?? null;
  const gps =
    accuracy == null ? 'GPS' : `GPS ±${Math.max(1, Math.round(accuracy))} m`;
  const toSummit =
    peakElevationM == null || elevationM == null
      ? '—'
      : String(Math.max(0, Math.round(peakElevationM - elevationM)));
  const distance = (distanceM / 1000).toFixed(1);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingBottom: insets.bottom }}>
      <LiveTrackMap
        width={width}
        height={mapHeight}
        trailPath={trailPath}
        elevation={elevation}
        recorded={points}
        trailName={trailName}
      />
      <View
        style={{
          position: 'absolute',
          top: insets.top + 6,
          left: 16,
          right: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <View
          style={{
            height: 40,
            paddingHorizontal: 14,
            borderRadius: 14,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.raised,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {paused ? (
            <Pause size={12} fill={colors.fg} color={colors.fg} strokeWidth={0} />
          ) : (
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.fg }} />
          )}
          <Text
            style={{
              fontSize: 14,
              color: colors.fg,
              fontFamily: fonts.uiSemibold,
              fontWeight: 'normal',
            }}
          >
            {paused ? 'Paused' : 'Recording'}
          </Text>
        </View>
        <View
          style={{
            height: 40,
            paddingHorizontal: 12,
            borderRadius: 14,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.raised,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flexShrink: 1,
          }}
        >
          <SignalBars />
          <Text style={{ fontSize: 13, color: colors.fg2, fontFamily: fonts.ui }} numberOfLines={1}>
            {gps}
            <Text style={{ color: colors.borderStrong }}> · </Text>
            {savedLabel(savedAt, now)}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 18 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={{ fontSize: 15, color: colors.fgMuted, fontFamily: fonts.ui }}>Moving time</Text>
          <Text style={{ fontSize: 15, color: colors.fgMuted, fontFamily: fonts.ui }}>
            Total{' '}
            <Text style={{ color: colors.fg, ...numericStyle('semibold') }}>{clock(totalSeconds)}</Text>
          </Text>
        </View>
        <Text
          style={{
            marginTop: 6,
            fontSize: 84,
            lineHeight: 84,
            letterSpacing: -1.5,
            color: colors.fg,
            ...numericStyle('semibold'),
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {clock(movingSeconds)}
        </Text>
        {paused ? (
          <View
            style={{
              marginTop: 10,
              alignSelf: 'flex-start',
              height: 36,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 12,
            }}
          >
            <Pause size={12} fill={colors.fgMuted} color={colors.fgMuted} strokeWidth={0} />
            <Text style={{ fontSize: 14, color: colors.fg2, fontFamily: fonts.ui }}>
              Paused {pausedClock(pausedSeconds)} · not counted in moving time
            </Text>
          </View>
        ) : null}
        <View style={{ marginTop: paused ? 12 : 18 }}>
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.raised }}>
            <StatCell label="Distance" value={distance} unit="km" />
            <StatCell label="Pace" value={paceValue(distanceM, movingSeconds)} unit="/km" edge />
          </View>
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.raised }}>
            <StatCell label="Gained" value={`↑ ${Math.round(gainM)}`} unit="m" />
            <StatCell label="Lost" value={`↓ ${Math.round(lossM)}`} unit="m" edge />
          </View>
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.raised }}>
            <StatCell
              label="Elevation"
              value={elevationM == null ? '—' : String(Math.round(elevationM))}
              unit={elevationM == null ? '' : 'm'}
            />
            <StatCell label="To summit" value={toSummit} unit={toSummit === '—' ? '' : 'm'} edge />
          </View>
        </View>
        {notice ? (
          <Text style={{ marginTop: 10, fontSize: 13, color: colors.fgMuted, fontFamily: fonts.ui }}>
            {notice}
          </Text>
        ) : null}
        {notificationNote ? (
          <Text style={{ marginTop: 10, fontSize: 13, color: colors.fgMuted, fontFamily: fonts.ui }}>
            {notificationNote}
          </Text>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 12 }}>
        {paused ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Resume"
              onPress={onResume}
              style={{
                flex: 1.4,
                height: 76,
                borderRadius: 22,
                backgroundColor: colors.sage,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <Play size={22} fill={colors.onSage} color={colors.onSage} strokeWidth={0} />
              <Text
                style={{
                  fontSize: 19,
                  color: colors.onSage,
                  fontFamily: fonts.uiSemibold,
                  fontWeight: 'normal',
                }}
              >
                Resume
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Finish"
              onPress={onFinish}
              style={{
                flex: 1,
                height: 76,
                borderRadius: 22,
                backgroundColor: colors.raised,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <Square size={16} fill={colors.fg} color={colors.fg} strokeWidth={0} />
              <Text
                style={{
                  fontSize: 19,
                  color: colors.fg,
                  fontFamily: fonts.uiSemibold,
                  fontWeight: 'normal',
                }}
              >
                Finish
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pause"
              onPress={onPause}
              style={{
                flex: 1.4,
                height: 76,
                borderRadius: 22,
                backgroundColor: colors.fg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <Pause size={22} fill={colors.onSage} color={colors.onSage} strokeWidth={0} />
              <Text
                style={{
                  fontSize: 19,
                  color: colors.onSage,
                  fontFamily: fonts.uiSemibold,
                  fontWeight: 'normal',
                }}
              >
                Pause
              </Text>
            </Pressable>
            <HoldToStop onFinish={onFinish} sheetOpen={finishSheetOpen} />
          </>
        )}
      </View>
    </View>
  );
}
