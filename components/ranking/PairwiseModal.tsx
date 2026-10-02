import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Modal } from 'react-native';

import { LeaderboardReveal } from '@/components/ranking/LeaderboardReveal';
import type { UseTrailComparisonResult } from '@/hooks/useTrailComparison';
import { formatOptionalDistance, formatOptionalElevation } from '@/lib/format';
import { BUCKET_BANDS, BUCKETS } from '@/lib/ranking';
import type { Trail } from '@/types/trail';

interface PairwiseModalProps {
  visible: boolean;
  comparison: UseTrailComparisonResult;
  onClose: () => void;
}

function HikePanel({
  trail,
  role,
  onPress,
}: {
  trail: Trail;
  role: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="border border-zinc-800 bg-zinc-900 px-4 py-4 active:bg-zinc-800"
      style={{ borderRadius: 12 }}
    >
      <Text className="text-[13px] text-zinc-500">{role}</Text>
      <Text className="mt-1 text-[17px] font-medium text-zinc-50" numberOfLines={2}>
        {trail.name}
      </Text>
      <Text className="mt-1 text-[13px] text-zinc-400">{trail.region}</Text>
      <Text
        className="mt-3 text-[13px] text-zinc-300"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {formatOptionalDistance(trail.distance_km)} · ↑ {formatOptionalElevation(trail.elevation_gain_m)}
      </Text>
    </Pressable>
  );
}

export function PairwiseModal({ visible, comparison, onClose }: PairwiseModalProps) {
  const insets = useSafeAreaInsets();
  const { phase, round, preview, progress, canUndo, pickBucket, choose, undo, place, reset } =
    comparison;

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

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={discard}>
      <View
        className="flex-1 bg-zinc-950"
        style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}
      >
        <View className="flex-1 px-4">
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="text-[17px] font-medium text-zinc-50">Rank this hike</Text>
            <Pressable
              onPress={discard}
              className="border border-zinc-800 px-3 py-2 active:bg-zinc-900"
              style={{ borderRadius: 10 }}
            >
              <Text className="text-[13px] text-zinc-300">Close</Text>
            </Pressable>
          </View>

          {phase === 'preview' && preview ? (
            <LeaderboardReveal
              entries={preview.leaderboard}
              ordinalRank={preview.ordinalRank}
              score={preview.score}
              count={preview.count}
              bucket={preview.bucket}
              onUndo={undo}
              onPlace={confirmPlace}
            />
          ) : phase === 'bucket' ? (
            <View className="gap-3">
              <Text className="text-[17px] text-zinc-100">How was this hike?</Text>
              {BUCKETS.map((bucket) => (
                <Pressable
                  key={bucket}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    pickBucket(bucket);
                  }}
                  className="border border-zinc-800 bg-zinc-900 px-4 py-4 active:bg-zinc-800"
                  style={{ borderRadius: 12 }}
                >
                  <Text className="text-[17px] text-zinc-50">{BUCKET_BANDS[bucket].label}</Text>
                </Pressable>
              ))}
            </View>
          ) : round ? (
            <View className="flex-1">
              <Text className="text-center text-[17px] text-zinc-100">
                Which hike was better?
              </Text>
              {progress ? (
                <Text
                  className="mt-2 text-center text-[13px] text-zinc-400"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {progress.step} of ~{progress.estimate}
                </Text>
              ) : null}

              <View className="mt-5 gap-3">
                <HikePanel
                  trail={round.challenger}
                  role="This hike"
                  onPress={() => pick('challenger')}
                />
                <HikePanel
                  trail={round.opponent}
                  role="Already ranked"
                  onPress={() => pick('opponent')}
                />
              </View>

              <View className="mt-auto flex-row gap-2 pt-6">
                <Pressable
                  onPress={undo}
                  disabled={!canUndo}
                  className="flex-1 items-center py-3 active:bg-zinc-900"
                >
                  <Text className={`text-[15px] ${canUndo ? 'text-zinc-200' : 'text-zinc-600'}`}>
                    Undo
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => pick('too_close')}
                  className="flex-1 items-center py-3 active:bg-zinc-900"
                >
                  <Text className="text-center text-[15px] text-zinc-200">Too close to call</Text>
                </Pressable>
                <Pressable
                  onPress={() => pick('skip')}
                  className="flex-1 items-center py-3 active:bg-zinc-900"
                >
                  <Text className="text-[15px] text-zinc-200">Skip</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-[13px] text-zinc-400">Preparing comparison</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
