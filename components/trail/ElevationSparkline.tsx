import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, View, type ViewStyle } from 'react-native';
import { LineChart } from 'react-native-wagmi-charts';

import type { ElevationSample } from '@/types/trail';

/** Accent sage — slight bloom uses the same hue. */
const LINE_COLOR = '#8B9A6D';

/** Cinematic left→right map-out along distance. */
const PATH_REVEAL_MS = 3400;
/** Short beat before the wipe so the chart doesn't flash. */
const PATH_REVEAL_DELAY_MS = 220;

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

/** Slow settle — same family as count-up. */
function easeOutQuint(t: number): number {
  return 1 - (1 - t) ** 5;
}

/**
 * Scrubbable distance × elevation profile.
 * Wagmi LineChart timestamp channel carries distance_m.
 * Mount reveal clips left→right so the path maps out along distance.
 * Soft sage bloom under the crisp stroke for a restrained glow.
 */
export function ElevationSparkline({
  samples,
  height = 168,
}: ElevationSparklineProps) {
  const lastIndex = useRef<number | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const [clipWidth, setClipWidth] = useState(0);

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

    setClipWidth(0);
    let raf = 0;
    let cancelled = false;
    const startAt = performance.now() + PATH_REVEAL_DELAY_MS;

    const tick = (now: number) => {
      if (cancelled) return;
      if (now < startAt) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (now - startAt) / PATH_REVEAL_MS);
      setClipWidth(chartWidth * easeOutQuint(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [samples, chartWidth, data.length]);

  if (data.length < 2) {
    return (
      <View className="items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-10">
        <Text className="font-mono text-xs text-zinc-500">No elevation data</Text>
      </View>
    );
  }

  const endKm = (samples[samples.length - 1].distance_m / 1000).toFixed(1);
  const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

  const glowStyle: ViewStyle | undefined =
    Platform.OS === 'web'
      ? ({
          // Soft sage halo around the mapped stroke (web SVG).
          filter:
            'drop-shadow(0 0 2.5px rgba(139, 154, 109, 0.75)) drop-shadow(0 0 9px rgba(139, 154, 109, 0.4))',
        } as ViewStyle)
      : undefined;

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
            <View style={{ width: clipWidth, overflow: 'hidden' }}>
              <View style={[{ width: chartWidth }, glowStyle]}>
                <LineChart height={height}>
                  {/* Soft bloom under the stroke */}
                  <LineChart.Path
                    color={LINE_COLOR}
                    width={8}
                    showInactivePath={false}
                    pathProps={{
                      strokeOpacity: 0.32,
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                    }}
                  />
                  {/* Crisp mapped line */}
                  <LineChart.Path
                    color={LINE_COLOR}
                    width={1.75}
                    showInactivePath={false}
                    pathProps={{
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                    }}
                  />
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
            </View>
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
