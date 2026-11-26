import { useLocalSearchParams, useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eyebrow, Skeleton } from '@/components/motion';
import { useCatalogSearch } from '@/hooks/useCatalogSearch';
import { useColors } from '@/hooks/useColors';
import { useYourStatsByTrail } from '@/hooks/useYourTrailStats';
import { useTrailOwnerLabels } from '@/hooks/useTrailOwnerLabel';
import { TrailCoverCard } from '@/components/trail/TrailCoverCard';
import { CATALOG_CREDIT, isCatalogTrail } from '@/lib/catalog';
import { ensureTrail } from '@/lib/catalogRemote';
import { formatOptionalDistance } from '@/lib/format';
import { searchTrails } from '@/lib/trailMatch';
import { describePlacement, placementScoreLabel } from '@/lib/ranking';
import { trailCover } from '@/lib/trailCover';
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';
import { displayXL, fonts } from '@/theme/tokens';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

/** True once the saved trails (yours and the catalog) have been read from disk. */
function useTrailsReady(): boolean {
  const persist = useTrailCache.persist;
  const [ready, setReady] = useState(() => persist?.hasHydrated?.() ?? true);
  useEffect(() => {
    if (ready || !persist) return;
    if (persist.hasHydrated()) {
      setReady(true);
      return;
    }
    return persist.onFinishHydration(() => setReady(true));
  }, [persist, ready]);
  return ready;
}

export default function TrailsScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const trails = useTrailCache((s) => s.trails);
  const ownerLabel = useTrailOwnerLabels();
  const rankings = useRankingStore((s) => s.rankings);
  const logs = useTrailCache((s) => s.logs);
  const ready = useTrailsReady();
  const yours = useYourStatsByTrail();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const [query, setQuery] = useState('');
  const searching = query.trim().length >= 2;
  const remote = useCatalogSearch(query);
  const [opening, setOpening] = useState<string | null>(null);
  // Your trails first, then every trail on the server (nearest first), no repeats.
  const results = useMemo(() => {
    if (!searching) return [];
    const local = searchTrails(trails, query, 8);
    const seen = new Set(local.map((t) => t.id));
    return [...local, ...remote.hits.filter((hit) => !seen.has(hit.id))];
  }, [searching, trails, query, remote.hits]);
  const open = (id: string) => {
    if (trails.some((t) => t.id === id)) {
      router.push(`/trail/${id}`);
      return;
    }
    setOpening(id);
    void ensureTrail(id).then((trail) => {
      setOpening(null);
      if (trail) router.push(`/trail/${trail.id}`);
    });
  };

  return (
    <View className="flex-1 bg-bg" style={{ paddingBottom: insets.bottom }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <View className="border-b border-raised px-4 pb-4 pt-2">
          <Text style={{ ...displayXL, color: c.fg }}>Trails</Text>
        </View>

        <View style={{ paddingHorizontal: 14, paddingTop: 12 }}>
          <View
            style={{
              height: 48,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.raised,
              backgroundColor: c.surface,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: 14,
            }}
          >
            <Search size={18} strokeWidth={1.75} color={c.fgMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search any trail, park or town"
              placeholderTextColor={c.fgFaint}
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search trails"
              autoFocus={focus === 'search'}
              style={{ flex: 1, height: 46, color: c.fg, fontFamily: fonts.ui, fontSize: 16 }}
            />
          </View>
        </View>

        {searching ? (
          <View style={{ paddingHorizontal: 14, paddingTop: 6 }}>
            {results.map((trail) => (
              <Pressable
                key={trail.id}
                accessibilityRole="button"
                accessibilityLabel={`${trail.name}, ${trail.region}`}
                onPress={() => open(trail.id)}
                disabled={opening !== null}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.raised }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ flex: 1, fontSize: 16, color: c.fg, fontFamily: fonts.uiSemibold }} numberOfLines={1}>
                      {trail.name}
                    </Text>
                    {opening === trail.id ? <ActivityIndicator size="small" color={c.fgMuted} /> : null}
                  </View>
                  <Text style={{ marginTop: 2, fontSize: 13, color: c.fgMuted, fontFamily: fonts.ui }} numberOfLines={1}>
                    {trail.region} ·{' '}
                    {yours.get(trail.id) ? (
                      <Text style={{ color: c.distance }}>{formatOptionalDistance(yours.get(trail.id)!.distanceKm)}</Text>
                    ) : (
                      'Not hiked yet'
                    )}
                  </Text>
                </View>
              </Pressable>
            ))}
            {remote.loading && results.length === 0 ? (
              <Text style={{ paddingVertical: 14, fontSize: 14, color: c.fgMuted, fontFamily: fonts.ui }}>Searching trails</Text>
            ) : null}
            {!remote.loading && results.length === 0 ? (
              <Text style={{ paddingVertical: 14, fontSize: 14, color: c.fgMuted, fontFamily: fonts.ui }}>
                No trails match. You can still name it when you log the hike.
              </Text>
            ) : null}
            <Text className="pt-5 font-ui text-[11px] text-fg-faint">{CATALOG_CREDIT}</Text>
          </View>
        ) : null}

        {!searching ? (
        <>
        <View className="flex-row border-b border-raised px-4 py-2">
          <Eyebrow>{ready ? `${trails.length} trails · ${rankings.length} ranked` : 'Loading trails'}</Eyebrow>
        </View>

        <View style={{ gap: 12, paddingHorizontal: 14, paddingTop: 14 }}>
          {!ready ? <Skeleton shape="card" count={3} /> : null}
          {(ready ? trails : []).map((trail, index) => {
            const placement = describePlacement(rankings, trail.id);
            return (
              <TrailCoverCard
                key={trail.id}
                trail={trail}
                index={index}
                addedBy={ownerLabel(trail)}
                cover={trailCover(trail.id, trail.path, logs, MAPBOX_TOKEN)}
                top={placement?.ordinal === 1 && placement.ranking.bucket === 'loved'}
                score={
                  placement
                    ? placementScoreLabel(
                        placement.ranking.bucket,
                        placement.count,
                        placement.score,
                      )
                    : null
                }
                onPress={() => router.push(`/trail/${trail.id}`)}
              />
            );
          })}
        </View>
        {trails.some(isCatalogTrail) ? (
          <Text className="px-4 pt-5 font-ui text-[11px] text-fg-faint">{CATALOG_CREDIT}</Text>
        ) : null}
        </>
        ) : null}
      </ScrollView>
    </View>
  );
}
