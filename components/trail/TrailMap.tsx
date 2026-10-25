import { Canvas, DashPathEffect, Path, Skia } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { useMovingDash } from '@/components/trail/useMovingDash';
import { buildTrailMap } from '@/lib/projectPath';
import type { GeoJSONLineString } from '@/types/trail';

const HEIGHT = 180;

interface TrailMapProps {
  canonical: GeoJSONLineString;
  recorded?: GeoJSONLineString | null;
}

function skPath(d: string) {
  return Skia.Path.MakeFromSVGString(d);
}

export function TrailMap({ canonical, recorded = null }: TrailMapProps) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  const dash = useMovingDash();
  const model = buildTrailMap(canonical, recorded, width, HEIGHT);
  const canonicalPath = useMemo(
    () => (model?.canonical ? skPath(model.canonical.d) : null),
    [model?.canonical?.d],
  );
  const recordedPath = useMemo(
    () => (model?.recorded ? skPath(model.recorded.d) : null),
    [model?.recorded?.d],
  );
  const movingPath =
    model?.moving === 'recorded' ? recordedPath : canonicalPath;

  return (
    <View
      accessibilityLabel="Trail path"
      className="overflow-hidden rounded-xl border border-raised bg-surface"
    >
      <View className="border-b border-raised px-3 py-2">
        <Text className="font-mono text-[10px] uppercase tracking-widest text-fg-faint">
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
                color={model.moving === 'canonical' ? c.mapLine : c.fgFaint}
                strokeCap="round"
                strokeJoin="round"
              />
            ) : null}
            {recordedPath ? (
              <Path
                path={recordedPath}
                style="stroke"
                strokeWidth={1.75}
                color={c.mapLine}
                strokeCap="round"
                strokeJoin="round"
              />
            ) : null}
            {movingPath ? (
              <Path
                path={movingPath}
                style="stroke"
                strokeWidth={1.75}
                color={c.fgMuted}
                strokeCap="round"
                strokeJoin="round"
              >
                <DashPathEffect intervals={[22, 148]} phase={dash} />
              </Path>
            ) : null}
          </Canvas>
        ) : (
          <View style={{ height: HEIGHT }} className="items-center justify-center">
            <Text className="font-mono text-xs text-fg-faint">No path</Text>
          </View>
        )}
      </View>
      <View className="flex-row justify-between px-3 pb-2">
        <Text className="text-[11px] text-fg-faint">
          {canonical.coordinates.length >= 2 ? '© OpenStreetMap' : 'No route'}
        </Text>
        <Text className="font-mono text-[10px] text-fg-faint">
          {recorded && recorded.coordinates.length >= 2
            ? `Recorded · ${recorded.coordinates.length}`
            : 'No recording'}
        </Text>
      </View>
    </View>
  );
}
