import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HikeDateField } from '@/components/log/HikeDateField';
import { LocationExplainer } from '@/components/log/LocationExplainer';
import { PairwiseModal } from '@/components/ranking/PairwiseModal';
import { PhotoStrip } from '@/components/trail/PhotoStrip';
import { useHikePhotos } from '@/hooks/useHikePhotos';
import { useLiveLocation } from '@/hooks/useLiveLocation';
import { useTrailComparison } from '@/hooks/useTrailComparison';
import { useTrailTracker } from '@/hooks/useTrailTracker';
import { formatDuration } from '@/lib/format';
import { useTrailCache } from '@/stores/trailCache';
import { displayM } from '@/theme/tokens';

const LOCATION_EXPLAINER_KEY = 'apex-location-explainer-accepted';

function digits(value: string, maxLength: number): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

const TERRAIN = ['Dirt', 'Rock', 'Snow', 'Sand'];
const CONDITIONS = ['Dry', 'Wet', 'Icy', 'Muddy', 'Windy'];
const EFFORT = ['Easy', 'Moderate', 'Hard'];
const HIKE_TYPES = ['Walk', 'Day Hike', 'Summit', 'Scramble', 'Backpacking'];

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const trails = useTrailCache((s) => s.trails);
  const logs = useTrailCache((s) => s.logs);
  const tracker = useTrailTracker();
  const location = useLiveLocation(tracker.isTracking, tracker.isPaused);
  const params = useLocalSearchParams<{ recording?: string }>();
  const [explainer, setExplainer] = useState(false);
  const photos = useHikePhotos({
    addPhoto: tracker.addPhoto,
    replacePhoto: tracker.replacePhoto,
  });
  const comparison = useTrailComparison();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTrailId, setSelectedTrailId] = useState(trails[0]?.id ?? '');
  const [entry, setEntry] = useState<'now' | 'past'>('now');
  const [hikedOn, setHikedOn] = useState(() => new Date());
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [pastNotes, setPastNotes] = useState('');
  const [distanceText, setDistanceText] = useState('');
  const [distanceTouched, setDistanceTouched] = useState(false);
  const [terrain, setTerrain] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [hikeType, setHikeType] = useState<string | null>(null);
  const [pastPhotos, setPastPhotos] = useState<string[]>([]);
  const maximumDate = useMemo(() => new Date(), []);

  useEffect(() => {
    if (distanceTouched) return;
    const trail = trails.find((item) => item.id === selectedTrailId);
    setDistanceText(trail ? String(trail.distance_km) : '');
  }, [distanceTouched, selectedTrailId, trails]);

  useEffect(() => {
    if (!tracker.isTracking || tracker.isPaused) return;
    const id = setInterval(() => tracker.tick(), 1000);
    return () => clearInterval(id);
  }, [tracker.isPaused, tracker.isTracking, tracker.tick]);

  const activeTrail = useMemo(
    () => trails.find((t) => t.id === tracker.session?.trailId),
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
    const log = tracker.complete();
    if (!log) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    comparison.start(log.trail_id, log.id);
    setModalOpen(true);
  };

  useEffect(() => {
    const run = (value: string | undefined) => {
      if (value === 'pause') tracker.pause();
      if (value === 'finish') finish();
    };
    const fromParams = Array.isArray(params.recording) ? params.recording[0] : params.recording;
    run(fromParams);
    const sub = Linking.addEventListener('url', (event) => {
      const query = Linking.parse(event.url).queryParams?.recording;
      run(typeof query === 'string' ? query : undefined);
    });
    return () => sub.remove();
  }, [params.recording, tracker.pause, tracker.complete]);

  const savePast = () => {
    const distanceKm = distanceText.trim() === '' ? null : Number(distanceText);
    const log = tracker.logPast({
      trailId: selectedTrailId,
      hikedOn,
      hours: Number(hours) || 0,
      minutes: Number(minutes) || 0,
      notes: pastNotes,
      distanceKm: distanceKm != null && Number.isFinite(distanceKm) ? distanceKm : null,
      terrain,
      conditions,
      difficulty,
      hikeType,
      photos: pastPhotos,
    });
    if (!log) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    comparison.start(log.trail_id, log.id);
    setModalOpen(true);
    setHours('');
    setMinutes('');
    setPastNotes('');
    setTerrain([]);
    setConditions([]);
    setDifficulty(null);
    setHikeType(null);
    setPastPhotos([]);
    setDistanceTouched(false);
  };

  return (
    <View className="flex-1 bg-zinc-950" style={{ paddingBottom: insets.bottom }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={displayM}>Log a hike</Text>
        <Text className="mt-1 font-mono text-[11px] text-zinc-500">
          Duration · notes · then pairwise rank
        </Text>

        {!tracker.isTracking ? (
          <View className="mt-6 gap-2">
            <View className="mb-2 flex-row border border-zinc-800" style={{ borderRadius: 12 }}>
              <Pressable
                onPress={() => {
                  setEntry('now');
                  void Haptics.selectionAsync();
                }}
                className={`flex-1 items-center py-2.5 ${entry === 'now' ? 'bg-zinc-100' : ''}`}
                style={{ borderRadius: 11 }}
              >
                <Text
                  className={`font-mono text-sm ${
                    entry === 'now' ? 'font-medium text-zinc-950' : 'text-zinc-400'
                  }`}
                >
                  Now
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setEntry('past');
                  void Haptics.selectionAsync();
                }}
                className={`flex-1 items-center py-2.5 ${entry === 'past' ? 'bg-zinc-100' : ''}`}
                style={{ borderRadius: 11 }}
              >
                <Text
                  className={`font-mono text-sm ${
                    entry === 'past' ? 'font-medium text-zinc-950' : 'text-zinc-400'
                  }`}
                >
                  Past hike
                </Text>
              </Pressable>
            </View>

            <Text className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
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

            {entry === 'now' ? (
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
            ) : (
              <View className="mt-4 gap-4">
                <View>
                  <Text className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    Date
                  </Text>
                  <HikeDateField
                    value={hikedOn}
                    maximumDate={maximumDate}
                    onChange={setHikedOn}
                  />
                </View>
                <View>
                  <Text className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    Duration
                  </Text>
                  <View className="flex-row gap-2">
                    <TextInput
                      value={hours}
                      onChangeText={(value) => setHours(digits(value, 3))}
                      keyboardType="number-pad"
                      placeholder="Hours"
                      placeholderTextColor="#52525B"
                      accessibilityLabel="Hours"
                      className="flex-1 border border-zinc-800 bg-zinc-900 px-3 py-3 font-mono text-sm text-zinc-100"
                      style={{ borderRadius: 12 }}
                    />
                    <TextInput
                      value={minutes}
                      onChangeText={(value) => setMinutes(digits(value, 2))}
                      keyboardType="number-pad"
                      placeholder="Minutes"
                      placeholderTextColor="#52525B"
                      accessibilityLabel="Minutes"
                      className="flex-1 border border-zinc-800 bg-zinc-900 px-3 py-3 font-mono text-sm text-zinc-100"
                      style={{ borderRadius: 12 }}
                    />
                  </View>
                </View>
                <View>
                  <Text className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    Notes
                  </Text>
                  <TextInput
                    value={pastNotes}
                    onChangeText={setPastNotes}
                    placeholder="Conditions, pace, crowd…"
                    placeholderTextColor="#52525B"
                    multiline
                    accessibilityLabel="Notes"
                    className="min-h-[96px] border border-zinc-800 bg-zinc-900 px-3 py-3 font-mono text-sm text-zinc-100"
                    style={{ borderRadius: 12, textAlignVertical: 'top' }}
                  />
                </View>
                <View>
                  <Text className="mb-2 text-[13px] text-zinc-400">Optional details</Text>
                  <Text className="mb-2 text-[13px] text-zinc-400">Distance (km)</Text>
                  <TextInput
                    value={distanceText}
                    onChangeText={(value) => {
                      setDistanceTouched(true);
                      setDistanceText(value.replace(/[^0-9.]/g, ''));
                    }}
                    keyboardType="decimal-pad"
                    accessibilityLabel="Distance"
                    placeholder="From the trail"
                    placeholderTextColor="#52525B"
                    className="border border-zinc-800 bg-zinc-900 px-3 py-3 font-mono text-sm text-zinc-100"
                    style={{ borderRadius: 12 }}
                  />
                </View>
                <View className="gap-2">
                  <Text className="text-[13px] text-zinc-400">Type</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {HIKE_TYPES.map((type) => (
                      <Pressable
                        key={type}
                        onPress={() => setHikeType(hikeType === type ? null : type)}
                        className={`border px-3 py-2 ${hikeType === type ? 'border-accent' : 'border-zinc-800'}`}
                        style={{ borderRadius: 12 }}
                      >
                        <Text className="text-[13px] text-zinc-100">{type}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View className="gap-2">
                  <Text className="text-[13px] text-zinc-400">Terrain</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {TERRAIN.map((item) => (
                      <Pressable
                        key={item}
                        onPress={() => setTerrain(toggle(terrain, item))}
                        className={`border px-3 py-2 ${terrain.includes(item) ? 'border-accent' : 'border-zinc-800'}`}
                        style={{ borderRadius: 12 }}
                      >
                        <Text className="text-[13px] text-zinc-100">{item}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View className="gap-2">
                  <Text className="text-[13px] text-zinc-400">Conditions</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {CONDITIONS.map((item) => (
                      <Pressable
                        key={item}
                        onPress={() => setConditions(toggle(conditions, item))}
                        className={`border px-3 py-2 ${conditions.includes(item) ? 'border-accent' : 'border-zinc-800'}`}
                        style={{ borderRadius: 12 }}
                      >
                        <Text className="text-[13px] text-zinc-100">{item}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View className="gap-2">
                  <Text className="text-[13px] text-zinc-400">Effort</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {EFFORT.map((item) => (
                      <Pressable
                        key={item}
                        onPress={() => setDifficulty(difficulty === item ? null : item)}
                        className={`border px-3 py-2 ${difficulty === item ? 'border-accent' : 'border-zinc-800'}`}
                        style={{ borderRadius: 12 }}
                      >
                        <Text className="text-[13px] text-zinc-100">{item}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <Pressable
                  onPress={() => {
                    void ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ['images'],
                      quality: 0.7,
                    }).then((result) => {
                      if (result.canceled) return;
                      const uri = result.assets[0]?.uri;
                      if (uri) setPastPhotos((current) => [...current, uri]);
                    });
                  }}
                  className="items-center border border-zinc-800 py-3"
                  style={{ borderRadius: 12 }}
                >
                  <Text className="text-[15px] text-zinc-200">
                    Photos{pastPhotos.length > 0 ? ` · ${pastPhotos.length}` : ''}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={savePast}
                  className="items-center border border-accent bg-accent/15 py-3.5 active:bg-accent/25"
                  style={{ borderRadius: 12 }}
                >
                  <Text className="font-mono text-sm text-accent">Save & rank</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <View className="mt-6">
            <View
              className="border border-zinc-800 bg-zinc-900 p-4"
              style={{ borderRadius: 12 }}
            >
              <Text className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                {tracker.isPaused ? 'Paused' : 'Active'}
              </Text>
              <Text className="mt-1 text-base text-zinc-50">
                {activeTrail?.name ?? 'Trail'}
              </Text>
              <Text className="mt-4 font-mono text-3xl tracking-tight text-accent">
                {formatDuration(tracker.elapsedSeconds)}
              </Text>
              <Text className="mt-3 font-mono text-[11px] text-zinc-400">
                {(tracker.distanceM / 1000).toFixed(2)} km · ↑{' '}
                {Math.round(tracker.elevationGainM)} m · {tracker.session?.points.length ?? 0}{' '}
                pts
              </Text>
              {location.message ? (
                <Text className="mt-2 font-mono text-[11px] leading-4 text-zinc-500">
                  {location.message}
                </Text>
              ) : null}
            </View>

            <Text className="mb-2 mt-5 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Photos
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                accessibilityLabel="Add photo from library"
                disabled={photos.busy}
                onPress={() => {
                  void photos.pickFromLibrary();
                }}
                className="flex-1 items-center border border-zinc-800 py-3 active:bg-zinc-900"
                style={{ borderRadius: 12, opacity: photos.busy ? 0.5 : 1 }}
              >
                <Text className="font-mono text-sm text-zinc-200">Library</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Take a hike photo"
                disabled={photos.busy}
                onPress={() => {
                  void photos.takePhoto();
                }}
                className="flex-1 items-center border border-zinc-800 py-3 active:bg-zinc-900"
                style={{ borderRadius: 12, opacity: photos.busy ? 0.5 : 1 }}
              >
                <Text className="font-mono text-sm text-zinc-200">Camera</Text>
              </Pressable>
            </View>
            {photos.message ? (
              <Text className="mt-2 font-mono text-[11px] text-zinc-500">
                {photos.message}
              </Text>
            ) : null}
            <PhotoStrip photos={tracker.session?.photos ?? []} />

            <Text className="mb-2 mt-5 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Notes
            </Text>
            <TextInput
              value={tracker.session?.notes ?? ''}
              onChangeText={tracker.setNotes}
              placeholder="Conditions, pace, crowd…"
              placeholderTextColor="#52525B"
              multiline
              className="min-h-[96px] border border-zinc-800 bg-zinc-900 px-3 py-3 font-mono text-sm text-zinc-100"
              style={{ borderRadius: 12, textAlignVertical: 'top' }}
            />

            <View className="mt-4 flex-row gap-2">
              <Pressable
                accessibilityLabel={tracker.isPaused ? 'Resume hike' : 'Pause hike'}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (tracker.isPaused) tracker.resume();
                  else tracker.pause();
                }}
                className="flex-1 items-center border border-zinc-800 py-3.5 active:bg-zinc-900"
                style={{ borderRadius: 12 }}
              >
                <Text className="font-mono text-sm text-zinc-200">
                  {tracker.isPaused ? 'Resume' : 'Pause'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  tracker.discard();
                }}
                className="flex-1 items-center border border-zinc-800 py-3.5 active:bg-zinc-900"
                style={{ borderRadius: 12 }}
              >
                <Text className="font-mono text-sm text-zinc-400">Discard</Text>
              </Pressable>
              <Pressable
                onPress={finish}
                className="flex-1 items-center border border-accent bg-accent/15 py-3.5 active:bg-accent/25"
                style={{ borderRadius: 12 }}
              >
                <Text className="font-mono text-sm text-accent">Finish & rank</Text>
              </Pressable>
            </View>
          </View>
        )}

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
