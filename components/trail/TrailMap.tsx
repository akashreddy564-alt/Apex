import { Canvas, DashPathEffect, Path, Skia } from '@shopify/react-native-skia';
import { useState } from 'react';
import { Text, View } from 'react-native';

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

function skPath(d: string) {
  return Skia.Path.MakeFromSVGString(d);
}

export function TrailMap({ canonical, recorded = null }: TrailMapProps) {
  const [width, setWidth] = useState(0);
  const dash = useMovingDash();
  const model = buildTrailMap(canonical, recorded, width, HEIGHT);
  const canonicalPath = model?.canonical ? skPath(model.canonical.d) : null;
  const recordedPath = model?.recorded ? skPath(model.recorded.d) : null;
  const movingPath =
    model?.moving === 'recorded' ? recordedPath : canonicalPath;

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
        {model && width > 0 ? (
          <Canvas style={{ width, height: HEIGHT }}>
            {canonicalPath ? (
              <Path
                path={canonicalPath}
                style="stroke"
                strokeWidth={1.75}
                color={model.moving === 'canonical' ? SAGE : ZINC}
                strokeCap="round"
                strokeJoin="round"
              />
            ) : null}
            {recordedPath ? (
              <Path
                path={recordedPath}
                style="stroke"
                strokeWidth={1.75}
                color={SAGE}
                strokeCap="round"
                strokeJoin="round"
              />
            ) : null}
            {movingPath ? (
              <Path
                path={movingPath}
                style="stroke"
                strokeWidth={1.75}
                color={TRACE}
                strokeCap="round"
                strokeJoin="round"
              >
                <DashPathEffect intervals={[22, 148]} phase={dash} />
              </Path>
            ) : null}
          </Canvas>
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
