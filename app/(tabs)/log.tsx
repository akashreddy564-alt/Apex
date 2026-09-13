import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PairwiseModal } from '@/components/ranking/PairwiseModal';
import { useTrailComparison } from '@/hooks/useTrailComparison';
import { useTrailTracker } from '@/hooks/useTrailTracker';
import { formatDuration } from '@/lib/format';
import { useTrailCache } from '@/stores/trailCache';

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const trails = useTrailCache((s) => s.trails);
  const tracker = useTrailTracker();
  const comparison = useTrailComparison();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTrailId, setSelectedTrailId] = useState(trails[0]?.id ?? '');

  useEffect(() => {
    if (!tracker.isTracking) return;
    const id = setInterval(() => tracker.tick(), 1000);
    return () => clearInterval(id);
  }, [tracker]);

  const activeTrail = useMemo(
    () => trails.find((t) => t.id === tracker.session?.trailId),
    [trails, tracker.session?.trailId],
  );

  const finish = () => {
    const log = tracker.complete();
    if (!log) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    comparison.start(log.trail_id);
    setModalOpen(true);
  };

  return (
    <View className="flex-1 bg-zinc-950" style={{ paddingBottom: insets.bottom }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text className="text-lg font-medium text-zinc-50">Log a hike</Text>
        <Text className="mt-1 font-mono text-[11px] text-zinc-500">
          Duration · notes · then pairwise rank
        </Text>

        {!tracker.isTracking ? (
          <View className="mt-6 gap-2">
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

            <Pressable
              onPress={() => {
                if (!selectedTrailId) return;
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                tracker.start(selectedTrailId);
              }}
              className="mt-4 items-center bg-zinc-100 py-3.5 active:bg-zinc-200"
              style={{ borderRadius: 12 }}
            >
              <Text className="font-mono text-sm font-medium text-zinc-950">
                Start tracking
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="mt-6">
            <View
              className="border border-zinc-800 bg-zinc-900 p-4"
              style={{ borderRadius: 12 }}
            >
              <Text className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                Active
              </Text>
              <Text className="mt-1 text-base text-zinc-50">
                {activeTrail?.name ?? 'Trail'}
              </Text>
              <Text className="mt-4 font-mono text-3xl tracking-tight text-accent">
                {formatDuration(tracker.elapsedSeconds)}
              </Text>
            </View>

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
      </ScrollView>

      <PairwiseModal
        visible={modalOpen}
        comparison={comparison}
        onClose={() => setModalOpen(false)}
      />
    </View>
  );
}
