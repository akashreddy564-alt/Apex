import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { CountUpText } from '@/components/trail/CountUpText';
import { formatCompactDuration, formatDistanceKm, formatElevationM } from '@/lib/format';
import type { TrailTelemetry } from '@/types/trail';

interface TelemetryRowProps {
  telemetry: TrailTelemetry;
}

interface CellProps {
  label: string;
  /** Grouped name and final value, e.g. "Peak elevation, 1,173 m". */
  spoken: string;
  children: ReactNode;
}

function Cell({ label, spoken, children }: CellProps) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={spoken}
      className="min-w-[48%] flex-1 border border-zinc-800 bg-zinc-900 px-3 py-2.5"
    >
      <Text className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </Text>
      <View className="mt-1">{children}</View>
    </View>
  );
}

/** Slow stagger so each cell settles before the next climbs. */
const STAGGER_MS = 400;

export function TelemetryRow({ telemetry }: TelemetryRowProps) {
  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-2">
        <Cell
          label="Peak Elev"
          spoken={
            telemetry.peak_elevation_m == null
              ? 'Peak elevation, —'
              : `Peak elevation, ${formatElevationM(telemetry.peak_elevation_m)}`
          }
        >
          <CountUpText
            value={telemetry.peak_elevation_m}
            format="elevation"
            delayMs={0}
          />
        </Cell>
        <Cell
          label="Total Gain"
          spoken={
            telemetry.elevation_gain_m == null
              ? 'Total gain, —'
              : `Total gain, ${formatElevationM(telemetry.elevation_gain_m)}`
          }
        >
          <CountUpText
            value={telemetry.elevation_gain_m}
            format="elevation"
            delayMs={STAGGER_MS}
          />
        </Cell>
      </View>
      <View className="flex-row flex-wrap gap-2">
        <Cell
          label="Distance"
          spoken={
            telemetry.distance_km == null
              ? 'Distance, —'
              : `Distance, ${formatDistanceKm(telemetry.distance_km)}`
          }
        >
          <CountUpText
            value={telemetry.distance_km}
            format="distance"
            delayMs={STAGGER_MS * 2}
          />
        </Cell>
        <Cell
          label="Avg Moving"
          spoken={`Average moving time, ${formatCompactDuration(telemetry.avg_moving_time_seconds)}`}
        >
          <CountUpText
            value={telemetry.avg_moving_time_seconds}
            format="duration"
            delayMs={STAGGER_MS * 3}
          />
        </Cell>
      </View>
    </View>
  );
}
