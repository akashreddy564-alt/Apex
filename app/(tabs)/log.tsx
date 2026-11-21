import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StreakGrid } from '@/components/craft/StreakGrid';
import { SummitRegister, type RegisterRank } from '@/components/craft/SummitRegister';
import { ContourTexture, Eyebrow, SlideToStart } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { LogHeader, type LogView } from '@/components/log/LogHeader';
import { LocationExplainer } from '@/components/log/LocationExplainer';
import { PastHikeSheet } from '@/components/log/PastHikeSheet';
import { RecordSession } from '@/components/log/RecordSession';
import { TrailAssignSheet } from '@/components/log/TrailAssignSheet';
import { PairwiseModal } from '@/components/ranking/PairwiseModal';
import { RankingsList } from '@/components/ranking/RankingsList';
import { PhotoStrip } from '@/components/trail/PhotoStrip';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { useTrailComparison } from '@/hooks/useTrailComparison';
import { useTrailTracker } from '@/hooks/useTrailTracker';
import { formatDistance, formatDuration } from '@/lib/format';
import { newId } from '@/lib/geo';
import { describePlacement, overallByScore } from '@/lib/ranking';
import { hikeReasons, rankReason } from '@/lib/reasons';
import { weeklyStreak } from '@/lib/streak';
import { streakGrid } from '@/lib/streakGrid';
import { shouldRequestNotificationPermission } from '@/lib/notificationPermission';
import { recordingLinkPlan } from '@/lib/recordingLink';
import { startPlan } from '@/lib/startLink';
import { pushTrail } from '@/lib/remoteSync';
import { matchTrails } from '@/lib/trailMatch';
import { buildUserTrail } from '@/lib/userTrail';
import {
  LOCK_SCREEN_NOTIFICATION_NOTE,
  notificationPermissionRequired,
} from '@/lib/notificationPermission';
import { usePendingStart } from '@/stores/pendingStart';
import { useRankingStore } from '@/stores/rankingStore';
import { MOCK_USER_ID, useTrailCache } from '@/stores/trailCache';
import { fonts, numericStyle, tabBarStyle } from '@/theme/tokens';

const LOCATION_EXPLAINER_KEY = 'apex-location-explainer-accepted';
/** Record without choosing a trail; it is settled at Finish. */
const FREEFORM = '';
const GEOCODE_WAIT_MS = 2500;
/** SlideToStart's track height, and its gap above the tab bar. */
const SLIDER_H = 62;
const SLIDER_GAP = 16;
const CONTOUR_H = 300;
const NO_REASONS = { distance: null, climb: null, time: null };

/** "Boulder, CO" for a new trail's subtitle, or null when offline or unsupported. */
async function placeName(latitude: number, longitude: number): Promise<string | null> {
  try {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), GEOCODE_WAIT_MS));
    const result = await Promise.race([Location.reverseGeocodeAsync({ latitude, longitude }), timeout]);
    const place = result?.[0];
    if (!place) return null;
    const parts = [place.city ?? place.subregion, place.region].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  } catch {
    return null;
  }
}

function hikeClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function LogScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<{
    setOptions: (options: Record<string, unknown>) => void;
    setParams: (params: { recording?: string }) => void;
  }>();
  const trails = useTrailCache((s) => s.trails);
  const logs = useTrailCache((s) => s.logs);
  const rankings = useRankingStore((s) => s.rankings);
  const { width: screenWidth } = useWindowDimensions();
  const tracker = useTrailTracker();
  const location = useLiveLocation(tracker.isTracking, tracker.isPaused);
  const params = useLocalSearchParams<{ recording?: string; view?: string }>();
  const router = useRouter();
  const [view, setView] = useState<LogView>(params.view === 'rankings' ? 'rankings' : 'hikes');

  useEffect(() => {
    if (params.view === 'rankings' || params.view === 'hikes') setView(params.view);
  }, [params.view]);
  const [explainer, setExplainer] = useState(false);
  const comparison = useTrailComparison();
  const [modalOpen, setModalOpen] = useState(false);
  const addTrail = useTrailCache((s) => s.addTrail);
  const [selectedTrailId, setSelectedTrailId] = useState(FREEFORM);
  const [pastTrailId, setPastTrailId] = useState(trails[0]?.id ?? '');
  const [assignOpen, setAssignOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [notificationNote, setNotificationNote] = useState<string | null>(null);

  useEffect(() => {
    if (!tracker.isTracking) return;
    const id = setInterval(() => tracker.tick(), 1000);
    return () => clearInterval(id);
  }, [tracker.isTracking, tracker.tick]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      tabBarStyle: tabBarStyle(c, tracker.isTracking),
    });
  }, [navigation, tracker.isTracking, c]);

  const activeTrail = useMemo(
    () => trails.find((t) => t.id === tracker.session?.trailId) ?? null,
    [trails, tracker.session?.trailId],
  );

  // The trail the location explainer starts once accepted.
  const pendingTrailId = useRef(FREEFORM);
  const acceptLocation = async () => {
    await AsyncStorage.setItem(LOCATION_EXPLAINER_KEY, '1');
    const permission = await Location.requestForegroundPermissionsAsync();
    setExplainer(false);
    if (!permission.granted) return;
    if (shouldRequestNotificationPermission(Platform.OS, Platform.Version, permission.granted)) {
      try {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      } catch {
        // A declined or missing notification prompt does not block the hike.
      }
    }
    tracker.start(pendingTrailId.current);
  };

  /** Explainer check, then start recording on `trailId` (FREEFORM for none). */
  const beginTracking = useCallback(
    (trailId: string) => {
      pendingTrailId.current = trailId;
      void AsyncStorage.getItem(LOCATION_EXPLAINER_KEY).then((seen) => {
        if (seen === '1') tracker.start(trailId);
        else setExplainer(true);
      });
    },
    [tracker.start],
  );

  // Trail detail's slider leaves a one-shot in-app request (never a URL param,
  // so a deep link can't start GPS recording). Taken on focus once hydrated.
  useFocusEffect(
    useCallback(() => {
      if (!tracker.hydrated) return;
      const pending = usePendingStart.getState().take();
      const plan = startPlan({
        pending,
        knownIds: new Set(trails.map((t) => t.id)),
        hydrated: tracker.hydrated,
        tracking: tracker.isTracking,
      });
      if (plan.start) {
        setSelectedTrailId(plan.start);
        beginTracking(plan.start);
      }
    }, [beginTracking, trails, tracker.hydrated, tracker.isTracking]),
  );

  useEffect(() => {
    if (!tracker.isTracking || !notificationPermissionRequired(Platform.OS, Platform.Version)) {
      setNotificationNote(null);
      return;
    }
    let cancelled = false;
    void PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
      .then((granted) => {
        if (!cancelled) setNotificationNote(granted ? null : LOCK_SCREEN_NOTIFICATION_NOTE);
      })
      .catch(() => {
        if (!cancelled) setNotificationNote(LOCK_SCREEN_NOTIFICATION_NOTE);
      });
    return () => {
      cancelled = true;
    };
  }, [tracker.isTracking]);

  const completeWith = (trailId?: string) => {
    const log = tracker.complete(trailId);
    setAssignOpen(false);
    setRecording(false);
    if (!log) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    comparison.start(log.trail_id, log.id);
    setModalOpen(true);
  };

  const finish = () => {
    setFinishOpen(false);
    if (tracker.session?.trailId) {
      completeWith();
      return;
    }
    // No trail yet: stop the clock while the hiker picks or names one.
    tracker.pause();
    setAssignOpen(true);
  };

  const points = tracker.session?.points;
  const suggestions = useMemo(() => {
    const first = points?.[0];
    if (!assignOpen || !first) return [];
    const recording = (points ?? []).map((p) => [p.longitude, p.latitude] as [number, number]);
    return matchTrails(first, recording, trails).flatMap((match) => {
      const trail = trails.find((t) => t.id === match.trailId);
      return trail ? [{ trail, startDistanceM: match.startDistanceM }] : [];
    });
  }, [assignOpen, points, trails]);

  const createRecordedTrail = async (name: string) => {
    const hike = tracker.session;
    if (!hike) return;
    const first = hike.points[0];
    const region = first ? await placeName(first.latitude, first.longitude) : null;
    const trail = buildUserTrail({
      id: newId(),
      ownerId: MOCK_USER_ID,
      name,
      region,
      points: hike.points,
      distanceM: hike.distanceM,
      gainM: hike.elevationGainM,
      durationSeconds: tracker.elapsedSeconds,
      now: new Date().toISOString(),
    });
    addTrail(trail);
    void pushTrail(trail);
    completeWith(trail.id);
  };

  useEffect(() => {
    const raw = Array.isArray(params.recording) ? params.recording[0] : params.recording;
    const plan = recordingLinkPlan({
      param: raw,
      hydrated: tracker.hydrated,
      tracking: tracker.isTracking,
    });
    if (plan.action === 'pause') tracker.pause();
    if (plan.action === 'finish') setFinishOpen(true);
    if (plan.clear) navigation.setParams({ recording: undefined });

    const sub = Linking.addEventListener('url', (event) => {
      const query = Linking.parse(event.url).queryParams?.recording;
      if (query === 'pause' || query === 'finish') {
        navigation.setParams({ recording: query });
      }
    });
    return () => sub.remove();
  }, [navigation, params.recording, tracker.hydrated, tracker.isTracking, tracker.pause]);

  const savePast = (draft: {
    trailId: string;
    newTrailName: string | null;
    hikedOn: Date;
    hours: number;
    minutes: number;
    notes: string;
    distanceKm: number | null;
    terrain: string[];
    conditions: string[];
    difficulty: string | null;
    hikeType: string | null;
    photos: string[];
  }) => {
    let trailId = draft.trailId;
    if (draft.newTrailName) {
      const trail = buildUserTrail({
        id: newId(),
        ownerId: MOCK_USER_ID,
        name: draft.newTrailName,
        region: null,
        points: [],
        distanceM: 0,
        gainM: 0,
        durationSeconds: 0,
        now: new Date().toISOString(),
      });
      addTrail(trail);
      void pushTrail(trail);
      trailId = trail.id;
      setPastTrailId(trail.id);
    }
    const log = tracker.logPast({ ...draft, trailId });
    if (!log) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    comparison.start(log.trail_id, log.id);
    setPastOpen(false);
    setModalOpen(true);
  };

  // The 12-week grid, the streak, and the latest hike's register.
  const craft = useMemo(() => {
    const byId = new Map(trails.map((t) => [t.id, t]));
    const grid = streakGrid(logs, (id) => byId.get(id));
    const streakWeeks = weeklyStreak(logs.map((l) => l.created_at)).weeks;
    let latest: (typeof logs)[number] | null = null;
    for (const log of logs) {
      if (!latest || Date.parse(log.created_at) > Date.parse(latest.created_at)) latest = log;
    }
    const newest = latest;
    if (!newest) return { grid, streakWeeks, latest: null, trail: null, reasons: NO_REASONS, rank: null };
    // A hike's own numbers win; its trail's catalog figures fill the gaps, as in weeklyProgress.
    const input = (log: (typeof logs)[number]) => {
      const trail = byId.get(log.trail_id);
      return {
        id: log.id,
        distance_km: log.distance_km ?? trail?.distance_km ?? null,
        elevation_gain_m: log.elevation_gain_m ?? trail?.elevation_gain_m ?? null,
        duration_seconds: log.duration_seconds,
      };
    };
    const reasons = hikeReasons(input(newest), logs.map(input));
    let rank: RegisterRank | null = null;
    const placement = describePlacement(rankings, newest.trail_id);
    if (placement) {
      const overall = overallByScore(
        rankings.filter(
          (r) => r.user_id === placement.ranking.user_id && r.hike_type === placement.ranking.hike_type,
        ),
      );
      const at = overall.findIndex((r) => r.trail_id === newest.trail_id);
      const nameAt = (i: number) => (overall[i] ? (byId.get(overall[i].trail_id)?.name ?? null) : null);
      rank = {
        bucket: placement.ranking.bucket,
        count: placement.count,
        score: placement.score,
        ordinal: at + 1,
        total: overall.length,
        // The one ranked just below this hike, then the one just above it.
        reason: rankReason(nameAt(at + 1), nameAt(at - 1)),
      };
    }
    return { grid, streakWeeks, latest: newest, trail: byId.get(newest.trail_id) ?? null, reasons, rank };
  }, [logs, rankings, trails]);

  if (tracker.isTracking) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <RecordSession
          trailName={activeTrail?.name ?? 'New hike'}
          trailPath={activeTrail?.path ?? null}
          elevation={activeTrail?.elevation_profile ?? null}
          peakElevationM={activeTrail?.peak_elevation_m ?? null}
          paused={tracker.isPaused}
          movingSeconds={tracker.elapsedSeconds}
          totalSeconds={tracker.totalSeconds}
          pausedSeconds={Math.max(0, tracker.totalSeconds - tracker.elapsedSeconds)}
          distanceM={tracker.distanceM}
          gainM={tracker.elevationGainM}
          lossM={tracker.elevationLossM}
          elevationM={tracker.currentElevationM}
          savedAt={tracker.savedAt}
          points={tracker.session?.points ?? []}
          notice={location.message}
          notificationNote={notificationNote}
          finishSheetOpen={finishOpen}
          onPause={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            tracker.dismissRecovery();
            tracker.pause();
          }}
          onResume={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            tracker.dismissRecovery();
            tracker.resume();
          }}
          onFinish={() => {
            tracker.dismissRecovery();
            setFinishOpen(true);
          }}
        />
        <Modal visible={finishOpen} transparent animationType="fade" onRequestClose={() => setFinishOpen(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.66)' }}>
            <View
              style={{
                backgroundColor: c.bg,
                borderTopWidth: 1,
                borderTopColor: c.border,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 20,
                paddingBottom: 28,
                gap: 16,
              }}
            >
              <Text style={{ color: c.fg, fontFamily: fonts.display, fontWeight: 'normal', fontSize: 22 }}>
                Finish this hike?
              </Text>
              <Text style={{ color: c.fg, fontSize: 16, ...numericStyle() }}>
                {formatDistance(tracker.distanceM / 1000)} · {hikeClock(tracker.elapsedSeconds)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Finish"
                onPress={finish}
                style={{ backgroundColor: c.accent, borderRadius: 12, alignItems: 'center', paddingVertical: 14 }}
              >
                <Text style={{ color: c.onAccent, fontSize: 16, fontFamily: fonts.uiSemibold, fontWeight: 'normal' }}>
                  Finish
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Keep recording"
                onPress={() => setFinishOpen(false)}
                style={{ backgroundColor: c.raised, borderRadius: 12, alignItems: 'center', paddingVertical: 14 }}
              >
                <Text style={{ color: c.fg, fontSize: 16, fontFamily: fonts.uiMedium, fontWeight: 'normal' }}>
                  Keep recording
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <TrailAssignSheet
          visible={assignOpen}
          suggestions={suggestions}
          trails={trails}
          onPick={(trailId) => completeWith(trailId)}
          onCreate={(name) => {
            void createRecordedTrail(name);
          }}
          onClose={() => setAssignOpen(false)}
        />
        <PairwiseModal
          visible={modalOpen}
          comparison={comparison}
          onClose={() => setModalOpen(false)}
        />
      </View>
    );
  }

  const showSlider = !recording && !explainer;
  const card = { backgroundColor: c.surface, borderWidth: 1, borderColor: c.raised, borderRadius: 22, padding: 16 } as const;

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 12 }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: CONTOUR_H }}>
        <ContourTexture seed="log" width={screenWidth} height={CONTOUR_H} opacity={0.6} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: showSlider ? SLIDER_GAP + SLIDER_H + 32 : 40 }}>
        <LogHeader
          view={view}
          onView={setView}
          onStart={() => {
            setView('hikes');
            setRecording(true);
          }}
          onLogPast={() => {
            setRecording(false);
            setPastOpen(true);
          }}
          onProfile={() => router.push('/account')}
        />

        {view === 'rankings' ? (
          <RankingsList onOpenTrail={(id) => router.push(`/trail/${id}`)} />
        ) : (
        <View style={{ paddingHorizontal: 16 }}>

        {!tracker.isTracking && recording ? (
          <View className="mt-6 gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={() => setRecording(false)}
            >
              <Text className="text-[13px] text-fg-muted">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                beginTracking(selectedTrailId);
              }}
              className="mt-2 items-center bg-fg py-3.5 active:bg-fg-2"
              style={{ borderRadius: 12 }}
            >
              <Text className="font-mono text-sm font-medium text-bg">
                Start tracking
              </Text>
            </Pressable>
            <Text className="mb-1 mt-4 font-mono text-[10px] uppercase tracking-widest text-fg-faint">
              Select trail
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Name it at the end"
              onPress={() => {
                setSelectedTrailId(FREEFORM);
                void Haptics.selectionAsync();
              }}
            >
              <View
                className={`border px-3 py-3 ${
                  selectedTrailId === FREEFORM
                    ? 'border-accent bg-accent/10'
                    : 'border-raised bg-surface'
                }`}
                style={{ borderRadius: 12 }}
              >
                <Text className="text-[14px] text-fg">Name it at the end</Text>
                <Text className="mt-0.5 font-mono text-[11px] text-fg-faint">
                  We'll suggest a trail from where you start
                </Text>
              </View>
            </Pressable>
            {trails.map((trail) => {
              const selected = trail.id === selectedTrailId;
              return (
                <Pressable
                  key={trail.id}
                  onPress={() => {
                    setSelectedTrailId(trail.id);
                    void Haptics.selectionAsync();
                  }}
                  className={`border px-3 py-3 ${
                    selected
                      ? 'border-accent bg-accent/10'
                      : 'border-raised bg-surface'
                  }`}
                  style={{ borderRadius: 12 }}
                >
                  <Text className="text-[14px] text-fg">{trail.name}</Text>
                  <Text className="mt-0.5 font-mono text-[11px] text-fg-faint">
                    {trail.region}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <>
            <View style={{ marginTop: 18 }}>
              <StreakGrid grid={craft.grid} streakWeeks={craft.streakWeeks} />
            </View>
            <View style={{ marginTop: 26 }}>
              <View style={{ marginBottom: 12 }}>
                <Eyebrow>Latest · Summit register</Eyebrow>
              </View>
              <SummitRegister
                key={craft.latest?.id ?? 'empty'}
                log={craft.latest}
                trail={craft.trail}
                number={logs.length}
                reasons={craft.reasons}
                rank={craft.rank}
                onOpen={craft.trail ? () => router.push(`/trail/${craft.trail?.id}`) : undefined}
              />
            </View>
          </>
        )}

        <View style={{ marginTop: 26 }}>
          <Eyebrow>Log history</Eyebrow>
          <View style={{ ...card, marginTop: 12, paddingVertical: logs.length === 0 ? 16 : 4 }}>
            {logs.length === 0 ? (
              <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: c.fgFaint }}>No hikes logged yet.</Text>
            ) : (
              logs.map((log, i) => {
                const trail = trails.find((t) => t.id === log.trail_id);
                return (
                  <View
                    key={log.id}
                    style={{ paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.raised }}
                  >
                    <View className="flex-row items-baseline justify-between gap-3">
                      <Text style={{ flex: 1, fontFamily: fonts.uiMedium, fontSize: 15, color: c.fg }} numberOfLines={1}>
                        {trail?.name ?? 'Trail'}
                      </Text>
                      <Text style={{ ...numericStyle(), fontSize: 13, color: c.fgMuted }}>
                        {formatDuration(log.duration_seconds)}
                      </Text>
                    </View>
                    {log.notes ? (
                      <Text style={{ fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, color: c.fgFaint, marginTop: 4 }} numberOfLines={2}>
                        {log.notes}
                      </Text>
                    ) : null}
                    <PhotoStrip photos={log.photos} />
                  </View>
                );
              })
            )}
          </View>
        </View>
        </View>
        )}
      </ScrollView>

      {showSlider ? (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: SLIDER_GAP }}>
          <SlideToStart
            label="Slide to start a hike"
            a11yLabel="Start a hike"
            // An in-app gesture; recording never starts from a URL.
            onComplete={() => beginTracking(FREEFORM)}
          />
        </View>
      ) : null}

      <PastHikeSheet
        visible={pastOpen}
        trails={trails}
        trailId={pastTrailId}
        onTrailId={setPastTrailId}
        onClose={() => setPastOpen(false)}
        onContinue={savePast}
      />
      <PairwiseModal
        visible={modalOpen}
        comparison={comparison}
        onClose={() => setModalOpen(false)}
      />
      {explainer ? (
        <View className="absolute inset-0">
          <LocationExplainer
            onContinue={() => {
              void acceptLocation();
            }}
            onDismiss={() => setExplainer(false)}
          />
        </View>
      ) : null}
    </View>
  );
}
