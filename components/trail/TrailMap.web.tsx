import { useState } from 'react';
import { Text, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';

import { useMovingDash } from '@/components/trail/useMovingDash';
import { buildTrailMap } from '@/lib/projectPath';
import type { GeoJSONLineString } from '@/types/trail';

const SAGE = '#8B9A6D';
const ZINC = '#71717A';
const TRACE = '#F4F4F5';
const HEIGHT = 180;

interface TrailMapProps {
  canonical: GeoJSONLineString;
  recorded?: GeoJSONLineString | null;
}

export function TrailMap({ canonical, recorded = null }: TrailMapProps) {
  const [width, setWidth] = useState(0);
  const dash = useMovingDash();
  const model = buildTrailMap(canonical, recorded, width, HEIGHT);

  return (
    <View
      accessibilityLabel="Trail path"
      className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
    >
      <View className="border-b border-zinc-800 px-3 py-2">
        <Text className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          Path
        </Text>
      </View>
      <View
        onLayout={(event) => {
          const next = Math.round(event.nativeEvent.layout.width);
          if (next > 0) setWidth(next);
        }}
      >
        {model ? (
          <Svg width={width} height={HEIGHT}>
            {model.canonical ? (
              <Path
                d={model.canonical.d}
                stroke={model.moving === 'canonical' ? SAGE : ZINC}
                strokeWidth={1.75}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {model.recorded ? (
              <Path
                d={model.recorded.d}
                stroke={SAGE}
                strokeWidth={1.75}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {model.moving === 'recorded' && model.recorded ? (
              <Path
                d={model.recorded.d}
                stroke={TRACE}
                strokeWidth={1.75}
                fill="none"
                strokeLinecap="round"
                strokeDasharray="22 148"
                strokeDashoffset={dash}
              />
            ) : null}
            {model.moving === 'canonical' && model.canonical ? (
              <Path
                d={model.canonical.d}
                stroke={TRACE}
                strokeWidth={1.75}
                fill="none"
                strokeLinecap="round"
                strokeDasharray="22 148"
                strokeDashoffset={dash}
              />
            ) : null}
          </Svg>
        ) : (
          <View style={{ height: HEIGHT }} className="items-center justify-center">
            <Text className="font-mono text-xs text-zinc-500">No path</Text>
          </View>
        )}
      </View>
      <View className="flex-row justify-between px-3 pb-2">
        <Text className="font-mono text-[10px] text-zinc-600">
          Canonical · {canonical.coordinates.length}
        </Text>
        <Text className="font-mono text-[10px] text-zinc-600">
          {recorded && recorded.coordinates.length >= 2
            ? `Recorded · ${recorded.coordinates.length}`
            : 'No recording'}
        </Text>
      </View>
    </View>
  );
}
