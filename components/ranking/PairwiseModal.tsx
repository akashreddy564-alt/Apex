import * as Haptics from 'expo-haptics';
import { useCallback, useEffect } from 'react';
import { Dimensions, Modal, Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LeaderboardReveal } from '@/components/ranking/LeaderboardReveal';
import { formatDistanceKm, formatElevationM } from '@/lib/format';
import type { UseTrailComparisonResult } from '@/hooks/useTrailComparison';
import type { Trail } from '@/types/trail';

const SPRING = { damping: 22, stiffness: 280, mass: 0.8 };
const SWIPE_THRESHOLD = 88;
const { width: SCREEN_W } = Dimensions.get('window');

interface PairwiseModalProps {
  visible: boolean;
  comparison: UseTrailComparisonResult;
  onClose: () => void;
}

function TrailPickCard({
  trail,
  label,
  side,
}: {
  trail: Trail;
  label: string;
  side: 'left' | 'right';
}) {
  return (
    <View
      className={`flex-1 border border-zinc-800 bg-zinc-900 p-4 ${
        side === 'left' ? 'rounded-l-xl' : 'rounded-r-xl'
      }`}
    >
      <Text className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </Text>
      <Text className="mt-2 text-base font-medium text-zinc-50" numberOfLines={2}>
        {trail.name}
      </Text>
      <Text className="mt-1 font-mono text-[11px] text-zinc-500">{trail.region}</Text>
      <View className="mt-4 gap-1">
        <Text className="font-mono text-xs text-zinc-400">
          {formatDistanceKm(trail.distance_km)}
        </Text>
        <Text className="font-mono text-xs text-zinc-400">
          ↑ {formatElevationM(trail.elevation_gain_m)}
        </Text>
        <Text className="font-mono text-xs text-zinc-400">
          peak {formatElevationM(trail.peak_elevation_m)}
        </Text>
      </View>
    </View>
  );
}

export function PairwiseModal({ visible, comparison, onClose }: PairwiseModalProps) {
  const insets = useSafeAreaInsets();
  const translateX = useSharedValue(0);
  const entrance = useSharedValue(0);

  const { round, isComplete, result, choose, reset } = comparison;

  useEffect(() => {
    if (visible) {
      entrance.value = 0;
      entrance.value = withSpring(1, SPRING);
      translateX.value = 0;
    }
  }, [visible, entrance, translateX, round?.opponent.id]);

  const commitChoice = useCallback(
    (choice: 'challenger' | 'opponent') => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      choose(choice);
      translateX.value = withSpring(0, SPRING);
    },
    [choose, translateX],
  );

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_W, SPRING, () => {
          runOnJS(commitChoice)('challenger');
        });
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_W, SPRING, () => {
          runOnJS(commitChoice)('opponent');
        });
      } else {
        translateX.value = withSpring(0, SPRING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [
      {
        translateY: interpolate(entrance.value, [0, 1], [28, 0]),
      },
    ],
  }));

  const deckStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp'),
  }));

  const rightHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
  }));

  const handleDone = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleDone}
      statusBarTranslucent
    >
      <View
        className="flex-1 bg-zinc-950"
        style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }}
      >
        <Animated.View style={sheetStyle} className="flex-1 px-4">
          <View className="mb-6 flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-medium text-zinc-50">Rank this trail</Text>
              <Text className="mt-1 font-mono text-[11px] text-zinc-500">
                Binary insert · Elo update
              </Text>
            </View>
            <Pressable
              onPress={handleDone}
              className="border border-zinc-800 px-3 py-1.5 active:bg-zinc-900"
              style={{ borderRadius: 10 }}
            >
              <Text className="font-mono text-xs text-zinc-400">Close</Text>
            </Pressable>
          </View>

          {isComplete && result ? (
            <LeaderboardReveal
              entries={result.leaderboard}
              ordinalRank={result.ordinalRank}
              onConfirm={handleDone}
            />
          ) : round ? (
            <View className="flex-1">
              <Text className="mb-4 text-center text-[15px] text-zinc-300">
                Which trail was better?
              </Text>

              <View className="relative mb-3 h-8">
                <Animated.Text
                  style={rightHintStyle}
                  className="absolute right-0 font-mono text-xs text-accent"
                >
                  ← Newly logged
                </Animated.Text>
                <Animated.Text
                  style={leftHintStyle}
                  className="absolute left-0 font-mono text-xs text-zinc-400"
                >
                  Existing ranked →
                </Animated.Text>
              </View>

              <GestureDetector gesture={pan}>
                <Animated.View style={deckStyle} className="flex-row gap-0">
                  <Pressable
                    className="flex-1"
                    onPress={() => commitChoice('opponent')}
                  >
                    <TrailPickCard
                      trail={round.opponent}
                      label="Existing"
                      side="left"
                    />
                  </Pressable>
                  <View className="w-px bg-zinc-800" />
                  <Pressable
                    className="flex-1"
                    onPress={() => commitChoice('challenger')}
                  >
                    <TrailPickCard
                      trail={round.challenger}
                      label="Just logged"
                      side="right"
                    />
                  </Pressable>
                </Animated.View>
              </GestureDetector>

              <Text className="mt-6 text-center font-mono text-[11px] text-zinc-600">
                Swipe right = new trail · Swipe left = existing
              </Text>
              <Text className="mt-2 text-center font-mono text-[10px] text-zinc-700">
                window [{round.low}…{round.high}]
              </Text>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="font-mono text-xs text-zinc-500">Preparing comparison…</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
