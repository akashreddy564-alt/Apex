import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddHikeSheet } from '@/components/log/AddHikeSheet';
import { LocationExplainer } from '@/components/log/LocationExplainer';
import { PastHikeSheet } from '@/components/log/PastHikeSheet';
import { RecordSession } from '@/components/log/RecordSession';
import { PairwiseModal } from '@/components/ranking/PairwiseModal';
import { PhotoStrip } from '@/components/trail/PhotoStrip';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { useTrailComparison } from '@/hooks/useTrailComparison';
import { useTrailTracker } from '@/hooks/useTrailTracker';
import { formatDuration } from '@/lib/format';
import { useTrailCache } from '@/stores/trailCache';
import { colors, displayM, fonts, numericStyle } from '@/theme/tokens';

const LOCATION_EXPLAINER_KEY = 'apex-location-explainer-accepted';

function hikeClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const trails = useTrailCache((s) => s.trails);
  const logs = useTrailCache((s) => s.logs);
  const tracker = useTrailTracker();
  const location = useLiveLocation(tracker.isTracking, tracker.isPaused);
  const params = useLocalSearchParams<{ recording?: string }>();
  const [explainer, setExplainer] = useState(false);
  const comparison = useTrailComparison();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTrailId, setSelectedTrailId] = useState(trails[0]?.id ?? '');
  const [pastOpen, setPastOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const trackingRef = useRef(false);
  trackingRef.current = tracker.isTracking;

  useEffect(() => {
    if (!tracker.isTracking) return;
    const id = setInterval(() => tracker.tick(), 1000);
    return () => clearInterval(id);
  }, [tracker.isTracking, tracker.tick]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: !tracker.isTracking,
      tabBarStyle: tracker.isTracking
        ? { display: 'none' }
        : {
            backgroundColor: colors.bg,
            borderTopColor: colors.raised,
            borderTopWidth: 1,
            height: 58,
            paddingBottom: 6,
            paddingTop: 6,
          },
    });
  }, [navigation, tracker.isTracking]);

  const activeTrail = useMemo(
    () => trails.find((t) => t.id === tracker.session?.trailId) ?? null,
    [trails, tracker.session?.trailId],
  );

  const acceptLocation = async () => {
    await AsyncStorage.setItem(LOCATION_EXPLAINER_KEY, '1');
    const permission = await Location.requestForegroundPermissionsAsync();
    setExplainer(false);
    if (!permission.granted || !selectedTrailId) return;
    tracker.start(selectedTrailId);
  };

  const finish = () => {
    setFinishOpen(false);
    const log = tracker.complete();
    setRecording(false);
    if (!log) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    comparison.start(log.trail_id, log.id);
    setModalOpen(true);
  };

  useEffect(() => {
    const run = (value: string | undefined) => {
      if (value === 'pause') tracker.pause();
      if (value === 'finish' && trackingRef.current) setFinishOpen(true);
    };
    const fromParams = Array.isArray(params.recording) ? params.recording[0] : params.recording;
    run(fromParams);
    const sub = Linking.addEventListener('url', (event) => {
      const query = Linking.parse(event.url).queryParams?.recording;
      run(typeof query === 'string' ? query : undefined);
    });
    return () => sub.remove();
  }, [params.recording, tracker.pause]);

  const savePast = (draft: {
    trailId: string;
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
    const log = tracker.logPast(draft);
    if (!log) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    comparison.start(log.trail_id, log.id);
    setPastOpen(false);
    setModalOpen(true);
  };

  if (tracker.isTracking) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <RecordSession
          trailName={activeTrail?.name ?? 'Trail'}
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
                backgroundColor: colors.bg,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 20,
                paddingBottom: 28,
                gap: 16,
              }}
            >
              <Text style={{ color: colors.fg, fontFamily: fonts.display, fontWeight: 'normal', fontSize: 22 }}>
                Finish this hike?
              </Text>
              <Text style={{ color: colors.fg, fontSize: 16, ...numericStyle() }}>
                {(tracker.distanceM / 1000).toFixed(1)} km · {hikeClock(tracker.elapsedSeconds)}
              </Text>
              <Pressable
                accessibilityLabel="Finish"
                onPress={finish}
                style={{ backgroundColor: colors.sage, borderRadius: 12, alignItems: 'center', paddingVertical: 14 }}
              >
                <Text style={{ color: colors.onSage, fontSize: 16, fontFamily: fonts.uiSemibold, fontWeight: 'normal' }}>
                  Finish
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Keep recording"
                onPress={() => setFinishOpen(false)}
                style={{ backgroundColor: colors.raised, borderRadius: 12, alignItems: 'center', paddingVertical: 14 }}
              >
                <Text style={{ color: colors.fg, fontSize: 16, fontFamily: fonts.uiMedium, fontWeight: 'normal' }}>
                  Keep recording
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <PairwiseModal
          visible={modalOpen}
          comparison={comparison}
          onClose={() => setModalOpen(false)}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-950" style={{ paddingBottom: insets.bottom }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={displayM}>Log a hike</Text>
        <Text className="mt-1 font-mono text-[11px] text-zinc-500">
          Duration · notes · then pairwise rank
        </Text>

        {!tracker.isTracking && !recording ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a hike"
            onPress={() => setAddOpen(true)}
            className="mt-6 items-center border border-zinc-800 py-4 active:bg-zinc-900"
            style={{ borderRadius: 12 }}
          >
            <Text className="text-[16px] text-zinc-50">+</Text>
          </Pressable>
        ) : null}

        {!tracker.isTracking && recording ? (
          <View className="mt-6 gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change hike"
              onPress={() => {
                setRecording(false);
                setAddOpen(true);
              }}
            >
              <Text className="text-[13px] text-zinc-400">Change</Text>
            </Pressable>
            <Text className="mb-1 mt-4 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Select trail
            </Text>
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
                      : 'border-zinc-800 bg-zinc-900'
                  }`}
                  style={{ borderRadius: 12 }}
                >
                  <Text className="text-[14px] text-zinc-100">{trail.name}</Text>
                  <Text className="mt-0.5 font-mono text-[11px] text-zinc-500">
                    {trail.region}
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => {
                if (!selectedTrailId) return;
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                void AsyncStorage.getItem(LOCATION_EXPLAINER_KEY).then((seen) => {
                  if (seen === '1') tracker.start(selectedTrailId);
                  else setExplainer(true);
                });
              }}
              className="mt-4 items-center bg-zinc-100 py-3.5 active:bg-zinc-200"
              style={{ borderRadius: 12 }}
            >
              <Text className="font-mono text-sm font-medium text-zinc-950">
                Start tracking
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View className="mt-8 border-t border-zinc-800 pt-4">
          <Text className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Log history
          </Text>
          {logs.length === 0 ? (
            <Text className="mt-3 font-mono text-[11px] text-zinc-600">
              No hikes logged yet.
            </Text>
          ) : (
            logs.map((log) => {
              const trail = trails.find((t) => t.id === log.trail_id);
              return (
                <View key={log.id} className="mt-3 border-b border-zinc-800 pb-3">
                  <View className="flex-row items-baseline justify-between gap-3">
                    <Text className="flex-1 text-[14px] text-zinc-100" numberOfLines={1}>
                      {trail?.name ?? 'Trail'}
                    </Text>
                    <Text className="font-mono text-[11px] text-zinc-400">
                      {formatDuration(log.duration_seconds)}
                    </Text>
                  </View>
                  {log.notes ? (
                    <Text className="mt-1 font-mono text-[11px] text-zinc-500" numberOfLines={2}>
                      {log.notes}
                    </Text>
                  ) : null}
                  <PhotoStrip photos={log.photos} />
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <AddHikeSheet
        visible={addOpen}
        onRecord={() => {
          setAddOpen(false);
          setRecording(true);
        }}
        onPast={() => {
          setAddOpen(false);
          setRecording(false);
          setPastOpen(true);
        }}
        onClose={() => setAddOpen(false)}
      />
      <PastHikeSheet
        visible={pastOpen}
        trails={trails}
        trailId={selectedTrailId}
        onTrailId={setSelectedTrailId}
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
