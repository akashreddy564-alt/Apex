import { Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { formatOptionalDistance } from '@/lib/format';
import { searchTrails } from '@/lib/trailMatch';
import { cleanTrailName, TRAIL_NAME_MAX } from '@/lib/userTrail';
import { colors, fonts } from '@/theme/tokens';
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
  const [text, setText] = useState('');
  const name = cleanTrailName(text);
  const matches = useMemo(() => searchTrails(trails, text, 5), [trails, text]);
  const exact = name != null && matches.some((t) => t.name.toLowerCase() === name.toLowerCase());

  return (
    <View>
      <TextInput
        value={text}
        onChangeText={setText}
        autoFocus={autoFocus}
        placeholder="Search trails or name a new one"
        placeholderTextColor={colors.fgFaint}
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
          borderColor: colors.raised,
          backgroundColor: colors.surface,
          paddingHorizontal: 14,
          color: colors.fg,
          fontFamily: fonts.ui,
          fontSize: 16,
        }}
      />
      {matches.map((trail) => (
        <Pressable
          key={trail.id}
          accessibilityRole="button"
          accessibilityLabel={`${trail.name}, ${trail.region}`}
          onPress={() => onPick(trail.id)}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.raised }}>
            <Text style={{ fontSize: 16, color: colors.fg, fontFamily: fonts.uiSemibold }} numberOfLines={1}>
              {trail.name}
            </Text>
            <Text style={{ marginTop: 2, fontSize: 13, color: colors.fgMuted, fontFamily: fonts.ui }} numberOfLines={1}>
              {trail.region} · {formatOptionalDistance(trail.distance_km)}
            </Text>
          </View>
        </Pressable>
      ))}
      {name && !exact ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${name} as a new trail`}
          onPress={() => onCreate(name)}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <View
            style={{
              marginTop: 12,
              height: 52,
              borderRadius: 14,
              backgroundColor: colors.sage,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: 16,
            }}
          >
            <Plus size={18} strokeWidth={2.2} color={colors.onSage} />
            <Text style={{ flex: 1, fontSize: 16, color: colors.onSage, fontFamily: fonts.uiSemibold }} numberOfLines={1}>
              Add “{name}” as a new trail
            </Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
