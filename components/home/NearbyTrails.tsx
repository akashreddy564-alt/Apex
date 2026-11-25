import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useColors } from '@/hooks/useColors';
import { CATALOG_TRAILS } from '@/lib/catalog';
import { catalogNear, knownPosition } from '@/lib/catalogRemote';
import { formatOptionalDistance } from '@/lib/format';
import { fonts } from '@/theme/tokens';
import type { Trail } from '@/types/trail';

const COUNT = 8;
/** catalog_near caps its radius at 5 km (migration 023). */
const RADIUS_M = 5000;
const CARD_W = 148;
const MAP_H = 74;

function metres(a: [number, number], b: [number, number]): number {
  const kx = 111_320 * Math.cos((a[1] * Math.PI) / 180);
  return Math.hypot((a[0] - b[0]) * kx, (a[1] - b[1]) * 110_540);
}

/** The trail's line scaled into a small box, as SVG path data. */
function miniRoute(trail: Trail, width: number, height: number, pad = 10): string | null {
  const pts = trail.path?.coordinates ?? [];
  if (pts.length < 2) return null;
  const lons = pts.map((p) => p[0]);
  const lats = pts.map((p) => p[1]);
  const minX = Math.min(...lons);
  const maxY = Math.max(...lats);
  const kx = Math.cos((lats[0] * Math.PI) / 180);
  const spanX = (Math.max(...lons) - minX) * kx || 1e-9;
  const spanY = maxY - Math.min(...lats) || 1e-9;
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  return pts
    .map((p, i) => `${i ? 'L' : 'M'}${(offX + (p[0] - minX) * kx * scale).toFixed(1)} ${(offY + (maxY - p[1]) * scale).toFixed(1)}`)
    .join(' ');
}

/**
 * A swipeable row of small route cards. With location already allowed (never
 * asked here): catalog trails within 5 km, else the bundled trails nearest
 * the hiker. Without location: the bundled trails.
 */
export function NearbyTrails() {
  const c = useColors();
  const router = useRouter();
  const [trails, setTrails] = useState<Trail[]>(() => CATALOG_TRAILS.slice(0, COUNT));

  useEffect(() => {
    let live = true;
    void (async () => {
      const here = await knownPosition();
      if (!here || !live) return;
      const near = await catalogNear(here[0], here[1], RADIUS_M);
      if (!live) return;
      if (near.length > 0) {
        setTrails(near.slice(0, COUNT));
        return;
      }
      const byDistance = [...CATALOG_TRAILS].sort(
        (a, b) => metres(here, a.trailhead ?? [0, 0]) - metres(here, b.trailhead ?? [0, 0]),
      );
      setTrails(byDistance.slice(0, COUNT));
    })();
    return () => {
      live = false;
    };
  }, []);

  const routes = useMemo(() => new Map(trails.map((t) => [t.id, miniRoute(t, CARD_W, MAP_H)])), [trails]);

  return (
    <View style={{ marginTop: 18 }}>
      <Text style={{ marginHorizontal: 16, color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 16 }} accessibilityRole="header">
        Trails near you
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingTop: 8 }}>
        {trails.map((trail) => (
          <Pressable
            key={trail.id}
            accessibilityRole="button"
            accessibilityLabel={`${trail.name}, ${trail.region}`}
            onPress={() => router.push(`/trail/${trail.id}`)}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <View style={{ width: CARD_W, borderRadius: 16, borderWidth: 1, borderColor: c.raised, backgroundColor: c.surface, overflow: 'hidden' }}>
              <View style={{ height: MAP_H, backgroundColor: c.raised }}>
                {routes.get(trail.id) ? (
                  <Svg width={CARD_W} height={MAP_H}>
                    <Path d={routes.get(trail.id)!} stroke={c.fg} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                  </Svg>
                ) : null}
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 13 }} numberOfLines={1}>
                  {trail.name}
                </Text>
                <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                  {trail.region.split(',')[0]} · <Text style={{ color: c.distance }}>{formatOptionalDistance(trail.distance_km)}</Text>
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
