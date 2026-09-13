import { Text, View } from 'react-native';

import { formatCompactDuration, formatDistanceKm, formatElevationM } from '@/lib/format';
import type { TrailTelemetry } from '@/types/trail';

interface TelemetryRowProps {
  telemetry: TrailTelemetry;
}

interface CellProps {
  label: string;
  value: string;
}

function Cell({ label, value }: CellProps) {
  return (
    <View className="min-w-[48%] flex-1 border border-zinc-800 bg-zinc-900 px-3 py-2.5">
      <Text className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </Text>
      <Text className="mt-1 font-mono text-sm text-zinc-100">{value}</Text>
    </View>
  );
}

export function TelemetryRow({ telemetry }: TelemetryRowProps) {
  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-2">
        <Cell label="Peak Elev" value={formatElevationM(telemetry.peak_elevation_m)} />
        <Cell label="Total Gain" value={formatElevationM(telemetry.elevation_gain_m)} />
      </View>
      <View className="flex-row flex-wrap gap-2">
        <Cell label="Distance" value={formatDistanceKm(telemetry.distance_km)} />
        <Cell
          label="Avg Moving"
          value={formatCompactDuration(telemetry.avg_moving_time_seconds)}
        />
      </View>
    </View>
  );
}
