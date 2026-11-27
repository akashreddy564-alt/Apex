import { Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ContourLoader } from '@/components/motion';

import { useCatalogSearch } from '@/hooks/useCatalogSearch';
import { useColors } from '@/hooks/useColors';
import { useYourStatsByTrail } from '@/hooks/useYourTrailStats';
import { ensureTrail } from '@/lib/catalogRemote';
import { formatOptionalDistance } from '@/lib/format';
import { searchTrails } from '@/lib/trailMatch';
import { cleanTrailName, TRAIL_NAME_MAX } from '@/lib/userTrail';
import { fonts } from '@/theme/tokens';
import type { Trail } from '@/types/trail';

interface TrailNameFieldProps {
  trails: Trail[];
  onPick: (trailId: string) => void;
  /** Called with a cleaned name. */
  onCreate: (name: string) => void;
  autoFocus?: boolean;
}

/** One field: typing searches known trails, and any name can become a new trail. */
export function TrailNameField({ trails, onPick, onCreate, autoFocus }: TrailNameFieldProps) {
  const c = useColors();
  const [text, setText] = useState('');
  const name = cleanTrailName(text);
  const yours = useYourStatsByTrail();
  const local = useMemo(() => searchTrails(trails, text, 5), [trails, text]);
  const remote = useCatalogSearch(text);
  // Trails on this phone first, then the server catalog (nearest first), no repeats.
  const matches = useMemo(() => {
    const seen = new Set(local.map((t) => t.id));
    const more = remote.hits.filter((hit) => !seen.has(hit.id)).slice(0, Math.max(0, 8 - local.length));
    return [...local, ...more];
  }, [local, remote.hits]);
  const [opening, setOpening] = useState<string | null>(null);
  const exact = name != null && matches.some((t) => t.name.toLowerCase() === name.toLowerCase());
  const pick = (id: string) => {
    if (trails.some((t) => t.id === id)) {
      onPick(id);
      return;
    }
    setOpening(id);
    void ensureTrail(id).then((trail) => {
      setOpening(null);
      if (trail) onPick(trail.id);
    });
  };

  return (
    <View>
      <TextInput
        value={text}
        onChangeText={setText}
        autoFocus={autoFocus}
        placeholder="Search trails or name a new one"
        placeholderTextColor={c.fgFaint}
        maxLength={TRAIL_NAME_MAX + 20}
        autoCapitalize="words"
        returnKeyType="done"
        accessibilityLabel="Trail name"
        onSubmitEditing={() => {
          if (name && !exact) onCreate(name);
        }}
        style={{
          height: 50,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.raised,
          backgroundColor: c.surface,
          paddingHorizontal: 14,
          color: c.fg,
          fontFamily: fonts.ui,
          fontSize: 16,
        }}
      />
      {/* Pinned under the field: search results arrive a moment later and land below it,
          so the button never moves under your finger. */}
      {name && !exact ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${name} as a new trail`}
          onPress={() => onCreate(name)}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <View
            style={{
              marginTop: 10,
              marginBottom: 4,
              height: 52,
              borderRadius: 14,
              backgroundColor: c.accent,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: 16,
            }}
          >
            <Plus size={18} strokeWidth={2.2} color={c.onAccent} />
            <Text style={{ flex: 1, fontSize: 16, color: c.onAccent, fontFamily: fonts.uiSemibold }} numberOfLines={1}>
              Add “{name}” as a new trail
            </Text>
          </View>
        </Pressable>
      ) : null}
      {matches.map((trail) => (
        <Pressable
          key={trail.id}
          accessibilityRole="button"
          accessibilityLabel={`${trail.name}, ${trail.region}`}
          onPress={() => pick(trail.id)}
          disabled={opening !== null}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.raised }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1, fontSize: 16, color: c.fg, fontFamily: fonts.uiSemibold }} numberOfLines={1}>
                {trail.name}
              </Text>
              {opening === trail.id ? <ContourLoader size="sm" color={c.fgMuted} /> : null}
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
      {remote.loading && matches.length === 0 ? (
        <Text style={{ paddingVertical: 12, fontSize: 13, color: c.fgMuted, fontFamily: fonts.ui }}>Searching trails</Text>
      ) : null}
    </View>
  );
}
