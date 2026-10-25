import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { shouldRequestNotificationPermission } from '@/lib/notificationPermission';
import { recordingLinkPlan } from '@/lib/recordingLink';
import { pushTrail } from '@/lib/remoteSync';
import { matchTrails } from '@/lib/trailMatch';
import { buildUserTrail } from '@/lib/userTrail';
import {
  LOCK_SCREEN_NOTIFICATION_NOTE,
  notificationPermissionRequired,
} from '@/lib/notificationPermission';
import { MOCK_USER_ID, useTrailCache } from '@/stores/trailCache';
import { fonts, numericStyle, tabBarStyle } from '@/theme/tokens';

const LOCATION_EXPLAINER_KEY = 'apex-location-explainer-accepted';
/** Record without choosing a trail; it is settled at Finish. */
const FREEFORM = '';
const GEOCODE_WAIT_MS = 2500;

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
    tracker.start(selectedTrailId);
  };

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

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 12 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
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
                void AsyncStorage.getItem(LOCATION_EXPLAINER_KEY).then((seen) => {
                  if (seen === '1') tracker.start(selectedTrailId);
                  else setExplainer(true);
                });
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
        ) : null}

        <View className="mt-8 border-t border-raised pt-4">
          <Text className="font-mono text-[10px] uppercase tracking-widest text-fg-faint">
            Log history
          </Text>
          {logs.length === 0 ? (
            <Text className="mt-3 font-mono text-[11px] text-fg-faint">
              No hikes logged yet.
            </Text>
          ) : (
            logs.map((log) => {
              const trail = trails.find((t) => t.id === log.trail_id);
              return (
                <View key={log.id} className="mt-3 border-b border-raised pb-3">
                  <View className="flex-row items-baseline justify-between gap-3">
                    <Text className="flex-1 text-[14px] text-fg" numberOfLines={1}>
                      {trail?.name ?? 'Trail'}
                    </Text>
                    <Text className="font-mono text-[11px] text-fg-muted">
                      {formatDuration(log.duration_seconds)}
                    </Text>
                  </View>
                  {log.notes ? (
                    <Text className="mt-1 font-mono text-[11px] text-fg-faint" numberOfLines={2}>
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
        )}
      </ScrollView>

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
