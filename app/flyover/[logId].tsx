import { useLocalSearchParams, useRouter } from 'expo-router';
import { Share2, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { FlyoverView } from '@/components/flyover/FlyoverView';
import { haptics, PressScale } from '@/components/motion';
import { flyoverHtml } from '@/lib/flyover/page';
import { cueLabels, flyoverPlan, trimEnds, type Cue, type FlyoverPlan } from '@/lib/flyover/plan';
import { videoWriter } from '@/lib/flyover/saveVideo';
import { useTrailCache } from '@/stores/trailCache';
import { fonts, numericStyle } from '@/theme/tokens';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
const INK = '#09090B';
const BONE = '#EDE6D6';
const WHITE = '#FAFAFA';

type Phase = 'loading' | 'playing' | 'ended' | 'exporting' | 'shared' | 'failed';

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: WHITE, fontSize: 26, ...numericStyle('semibold') }}>{value}</Text>
      <Text style={{ color: BONE, opacity: 0.7, fontFamily: fonts.uiMedium, fontSize: 11, letterSpacing: 1.2, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * The route flyover. Plays after Finish on a recorded hike (then hands off to
 * ranking) and from the trail page later. "Share video" renders an MP4 of the
 * route with its first and last 300 m removed.
 */
export default function FlyoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { logId, rank } = useLocalSearchParams<{ logId: string; rank?: string }>();
  const log = useTrailCache((s) => s.logs.find((l) => l.id === String(logId)));
  const trail = useTrailCache((s) => (log ? s.getTrail(log.trail_id) : undefined));

  const stats = useMemo(
    () => ({
      name: trail?.name ?? 'My hike',
      distanceKm: log?.distance_km ?? trail?.distance_km ?? 0,
      gainM: log?.elevation_gain_m ?? trail?.elevation_gain_m ?? 0,
      durationSeconds: log?.duration_seconds ?? 0,
    }),
    [log, trail],
  );
  const coords = log?.recorded_path?.coordinates ?? [];
  const playPlan = useMemo(() => flyoverPlan(coords, stats, { reduceMotion }), [coords, stats, reduceMotion]);
  const sharePlan = useMemo<FlyoverPlan | null>(() => {
    const trimmed = trimEnds(coords);
    return trimmed ? flyoverPlan(trimmed, stats) : null;
  }, [coords, stats]);

  const [phase, setPhase] = useState<Phase>('loading');
  const [cue, setCue] = useState<Cue | null>(null);
  const [exported, setExported] = useState(0);
  const writer = useRef<ReturnType<typeof videoWriter> | null>(null);
  const clock = useRef<number | null>(null);

  const html = useMemo(() => (playPlan && MAPBOX_TOKEN ? flyoverHtml(MAPBOX_TOKEN, playPlan, 'play') : null), [playPlan]);
  const exportHtml = useMemo(
    () => (phase === 'exporting' && sharePlan && MAPBOX_TOKEN ? flyoverHtml(MAPBOX_TOKEN, sharePlan, 'export') : null),
    [phase, sharePlan],
  );

  const leave = () => {
    if (clock.current !== null) cancelAnimationFrame(clock.current);
    // `rank` came from Finish: the Log tab opens ranking when it's back in front.
    if (router.canGoBack()) router.back();
    else router.replace(rank ? '/log' : '/');
  };

  // Nothing to fly (no route, no token): go straight on.
  useEffect(() => {
    if (!html) leave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  useEffect(() => () => {
    if (clock.current !== null) cancelAnimationFrame(clock.current);
  }, []);

  const countUp = (plan: FlyoverPlan) => {
    const t0 = Date.now();
    const step = () => {
      const i = Math.min(plan.cues.length - 1, Math.floor(((Date.now() - t0) / 1000) * plan.fps));
      setCue(plan.cues[i]);
      if (i < plan.cues.length - 1) clock.current = requestAnimationFrame(step);
    };
    clock.current = requestAnimationFrame(step);
  };

  const parse = (raw: string) => {
    try {
      return JSON.parse(raw) as { type?: string; done?: number; total?: number; data?: string };
    } catch {
      return {};
    }
  };

  const onPlayMessage = (raw: string) => {
    const msg = parse(raw);
    if (msg.type === 'start' && playPlan) {
      setPhase('playing');
      countUp(playPlan);
    } else if (msg.type === 'end') {
      setPhase((p) => (p === 'exporting' ? p : 'ended'));
      if (playPlan) setCue(playPlan.cues[playPlan.cues.length - 1]);
      haptics.success();
    } else if (msg.type === 'error') {
      // No signal or no WebGL: skip the flyover rather than show a black screen.
      leave();
    }
  };

  const onExportMessage = (raw: string) => {
    const msg = parse(raw);
    if (msg.type === 'progress' && msg.total) setExported((msg.done ?? 0) / msg.total);
    else if (msg.type === 'chunk' && msg.data) writer.current?.append(msg.data);
    else if (msg.type === 'exported') {
      setExported(1);
      void (writer.current?.share() ?? Promise.resolve())
        .catch(() => undefined)
        .finally(() => setPhase('shared'));
    } else if (msg.type === 'error') setPhase('failed');
  };

  const startExport = () => {
    if (!sharePlan) return;
    haptics.tapLight();
    writer.current = videoWriter(`apex-${(trail?.name ?? 'hike').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
    setExported(0);
    setPhase('exporting');
  };

  if (!html) return <View style={{ flex: 1, backgroundColor: INK }} />;

  const shown = cue ? cueLabels(cue) : null;
  const done = phase === 'ended' || phase === 'shared' || phase === 'failed';

  return (
    <View style={{ flex: 1, backgroundColor: INK }}>
      <FlyoverView html={html} onMessage={onPlayMessage} />
      {exportHtml ? (
        // Renders frame by frame behind the progress screen below.
        <View style={{ position: 'absolute', inset: 0 }}>
          <FlyoverView html={exportHtml} onMessage={onExportMessage} />
        </View>
      ) : null}

      {phase === 'exporting' ? (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: INK, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: WHITE, fontFamily: fonts.display, fontSize: 22 }}>Making your video</Text>
          <View style={{ width: 200, height: 3, backgroundColor: 'rgba(237,230,214,0.18)', borderRadius: 2, marginTop: 20, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round(exported * 100)}%`, height: 3, backgroundColor: BONE }} />
          </View>
          <Text style={{ color: BONE, opacity: 0.7, fontFamily: fonts.ui, fontSize: 13, marginTop: 14, textAlign: 'center' }}>
            The start and end of your route are left out, so nobody sees where you parked or live.
          </Text>
        </View>
      ) : null}

      {phase !== 'exporting' ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', inset: 0 }}>
          {/* Shade under the numbers so they read over bright snow or rock. */}
          <Svg pointerEvents="none" width="100%" height="45%" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} preserveAspectRatio="none" viewBox="0 0 1 1">
            <Defs>
              <LinearGradient id="flyShade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={INK} stopOpacity="0" />
                <Stop offset="1" stopColor={INK} stopOpacity={done ? '0.92' : '0.75'} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="1" height="1" fill="url(#flyShade)" />
          </Svg>
          <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={done ? 'Close' : 'Skip flyover'}
              onPress={() => {
                haptics.tapLight();
                leave();
              }}
              hitSlop={8}
              style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: 'rgba(9,9,11,0.55)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {done ? <X size={18} color={WHITE} strokeWidth={2} /> : null}
              <Text style={{ color: WHITE, fontFamily: fonts.uiSemibold, fontSize: 14 }}>{done ? (rank ? 'Rank it' : 'Close') : 'Skip'}</Text>
            </Pressable>
          </View>

          <View style={{ flex: 1 }} />

          {done ? (
            <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(400)} style={{ paddingHorizontal: 24, alignItems: 'center' }}>
              <Text
                accessibilityRole="header"
                numberOfLines={2}
                style={{ color: WHITE, fontFamily: fonts.displayExtraBold, fontSize: 40, lineHeight: 40 * 0.9 + 4, textTransform: 'uppercase', textAlign: 'center' }}
              >
                {stats.name}
              </Text>
            </Animated.View>
          ) : null}

          {shown ? (
            <View
              accessible
              accessibilityLabel={`${shown.miles} miles, ${shown.feet} feet of gain, ${shown.time}`}
              style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 20, paddingBottom: done ? 16 : insets.bottom + 32 }}
            >
              <Stat value={shown.miles} label="MI" />
              <Stat value={shown.feet} label="FT GAIN" />
              <Stat value={shown.time} label="TIME" />
            </View>
          ) : null}

          {done ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 20, gap: 10 }}>
              {phase === 'failed' ? (
                <Text style={{ color: BONE, fontFamily: fonts.ui, fontSize: 13, textAlign: 'center' }}>
                  This phone couldn’t make the video. The flyover still plays here.
                </Text>
              ) : null}
              {rank ? (
                <PressScale
                  accessibilityRole="button"
                  accessibilityLabel="Rank this hike"
                  onPress={() => {
                    haptics.tapLight();
                    leave();
                  }}
                  style={{ backgroundColor: BONE, borderRadius: 14, alignItems: 'center', paddingVertical: 15 }}
                >
                  <Text style={{ color: INK, fontFamily: fonts.uiSemibold, fontSize: 16 }}>Rank this hike</Text>
                </PressScale>
              ) : null}
              {sharePlan && phase !== 'failed' ? (
                <PressScale
                  accessibilityRole="button"
                  accessibilityLabel="Share video"
                  onPress={startExport}
                  style={{
                    backgroundColor: rank ? 'rgba(250,250,250,0.12)' : BONE,
                    borderRadius: 14,
                    paddingVertical: 15,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Share2 size={18} color={rank ? WHITE : INK} strokeWidth={2} />
                  <Text style={{ color: rank ? WHITE : INK, fontFamily: fonts.uiSemibold, fontSize: 16 }}>Share video</Text>
                </PressScale>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
