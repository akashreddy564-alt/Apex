import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LineChart } from 'react-native-wagmi-charts';

import type { ElevationSample } from '@/types/trail';

/** Left→right clip reveal — maps the profile along distance. */
const PATH_REVEAL_MS = 1100;
const PATH_REVEAL_EASING = Easing.bezier(0.22, 1, 0.36, 1);

interface ElevationSparklineProps {
  samples: ElevationSample[];
  height?: number;
}

function formatElev(value: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return `${Math.round(n)} m`;
}

function formatDistFromTimestamp(timestamp: string | number): string {
  const meters = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
  if (Number.isNaN(meters)) return '—';
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Scrubbable distance × elevation profile.
 * Wagmi LineChart timestamp channel carries distance_m.
 * Mount reveal clips the chart left→right so the path maps out along distance.
 */
export function ElevationSparkline({
  samples,
  height = 168,
}: ElevationSparklineProps) {
  const lastIndex = useRef<number | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const reveal = useSharedValue(0);

  const data = useMemo(
    () =>
      samples.map((s) => ({
        timestamp: s.distance_m,
        value: s.elevation_m,
      })),
    [samples],
  );

  useEffect(() => {
    lastIndex.current = null;
  }, [samples]);

  useEffect(() => {
    if (chartWidth <= 0 || data.length < 2) return;
    reveal.value = 0;
    reveal.value = withTiming(1, {
      duration: PATH_REVEAL_MS,
      easing: PATH_REVEAL_EASING,
    });
  }, [samples, chartWidth, data.length, reveal]);

  const clipStyle = useAnimatedStyle(() => ({
    width: Math.max(chartWidth * reveal.value, 0),
    overflow: 'hidden' as const,
  }));

  if (data.length < 2) {
    return (
      <View className="items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-10">
        <Text className="font-mono text-xs text-zinc-500">No elevation data</Text>
      </View>
    );
  }

  const endKm = (samples[samples.length - 1].distance_m / 1000).toFixed(1);
  const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

  return (
    <View className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <LineChart.Provider
        data={data}
        onCurrentIndexChange={(index) => {
          if (lastIndex.current !== index) {
            lastIndex.current = index;
            void Haptics.selectionAsync();
          }
        }}
      >
        <View className="flex-row items-end justify-between border-b border-zinc-800 px-3 py-2">
          <Text className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Elevation profile
          </Text>
          <View className="items-end">
            <LineChart.PriceText
              format={({ value }) => formatElev(String(value))}
              style={{ color: '#A1A1AA', fontFamily: mono, fontSize: 12 }}
            />
            <LineChart.DatetimeText
              format={({ value }) => formatDistFromTimestamp(value)}
              style={{ color: '#71717A', fontFamily: mono, fontSize: 10 }}
            />
          </View>
        </View>

        <View
          className="px-2"
          onLayout={(e) => {
            const next = Math.round(e.nativeEvent.layout.width);
            if (next > 0 && next !== chartWidth) setChartWidth(next);
          }}
        >
          {chartWidth > 0 ? (
            <Animated.View style={clipStyle}>
              <View style={{ width: chartWidth }}>
                <LineChart height={height}>
                  <LineChart.Path color="#8B9A6D" width={1.75} />
                  <LineChart.CursorCrosshair
                    color="#E4E4E7"
                    outerSize={14}
                    size={6}
                  >
                    <LineChart.Tooltip
                      cursorGutter={12}
                      textStyle={{
                        color: '#FAFAFA',
                        fontFamily: mono,
                        fontSize: 11,
                        backgroundColor: '#18181B',
                        borderColor: '#27272A',
                        borderWidth: 1,
                        overflow: 'hidden',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                      }}
                    />
                  </LineChart.CursorCrosshair>
                  {Platform.OS === 'web' ? <LineChart.HoverTrap /> : null}
                </LineChart>
              </View>
            </Animated.View>
          ) : (
            <View style={{ height }} />
          )}
        </View>

        <View className="flex-row justify-between px-3 pb-2">
          <Text className="font-mono text-[10px] text-zinc-600">0 km</Text>
          <Text className="font-mono text-[10px] text-zinc-600">{endKm} km</Text>
        </View>
      </LineChart.Provider>
    </View>
  );
}
