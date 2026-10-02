import { Text } from 'react-native';

import type { RouteShape } from '@/lib/routeSource';

/**
 * Placeholder until the compare-card mockup arrives.
 * It only reports the resolved source. It does not draw a route.
 */
export function RouteSketch({ shape }: { shape: RouteShape }) {
  const label =
    shape.origin === 'none' || shape.coordinates.length < 2
      ? 'No route'
      : `${shape.credit ?? 'No route'} · ${shape.coordinates.length} points`;
  return <Text className="mt-3 text-[13px] text-zinc-400">{label}</Text>;
}
