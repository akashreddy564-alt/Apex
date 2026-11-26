import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { haptics } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { useTaggable } from '@/hooks/useTaggable';
import { CONDITION_CHIPS, GEAR_MAX_ITEMS, GEAR_MAX_LENGTH, TERRAIN_CHIPS, cleanGear } from '@/lib/hikeDetails';
import { useGearStore } from '@/stores/gearStore';
import { fonts } from '@/theme/tokens';

export interface HikeDetails {
  /** Terrain and condition chips together; split with splitChips on save. */
  chips: string[];
  gear: string[];
  companions: string[];
}

function Chip({ label, on, onPress, a11y }: { label: string; on: boolean; onPress: () => void; a11y?: string }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={a11y ?? label}
      onPress={() => {
        haptics.select();
        onPress();
      }}
    >
      <View
        style={{
          borderRadius: 999,
          borderWidth: 1,
          borderColor: on ? c.fg : c.raised,
          backgroundColor: on ? c.fg : c.surface,
          paddingHorizontal: 12,
          paddingVertical: 7,
        }}
      >
        <Text style={{ color: on ? c.bg : c.fg2, fontFamily: fonts.uiMedium, fontSize: 13 }}>{label}</Text>
      </View>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: c.raised, paddingVertical: 12 }}>
      <Text style={{ fontSize: 13, color: c.fgMuted, fontFamily: fonts.ui }}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>{children}</View>
    </View>
  );
}

const toggle = (list: string[], item: string) => (list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);

/**
 * Terrain and conditions, who you hiked with, and gear. Everything optional.
 * Gear you type is saved to your gear list for one-tap reuse.
 */
export function HikeDetailsFields({
  value,
  onChange,
  showTerrain = true,
}: {
  value: HikeDetails;
  onChange: (next: HikeDetails) => void;
  /** The past-hike form keeps its own terrain row. */
  showTerrain?: boolean;
}) {
  const c = useColors();
  const people = useTaggable();
  const saved = useGearStore((s) => s.items);
  const remember = useGearStore((s) => s.remember);
  const [draft, setDraft] = useState('');

  const gearChoices = cleanGear([...value.gear, ...saved]).slice(0, 20);
  const addGear = () => {
    const item = draft.trim();
    if (!item) return;
    const next = cleanGear([...value.gear, item]);
    remember([item]);
    onChange({ ...value, gear: next });
    setDraft('');
  };

  return (
    <View>
      {showTerrain ? (
        <>
          <Section title="Terrain">
            {TERRAIN_CHIPS.map((chip) => (
              <Chip key={chip} label={chip} on={value.chips.includes(chip)} onPress={() => onChange({ ...value, chips: toggle(value.chips, chip) })} />
            ))}
          </Section>
          <Section title="Conditions">
            {CONDITION_CHIPS.map((chip) => (
              <Chip key={chip} label={chip} on={value.chips.includes(chip)} onPress={() => onChange({ ...value, chips: toggle(value.chips, chip) })} />
            ))}
          </Section>
        </>
      ) : null}

      <Section title="Hiked with">
        {people.length === 0 ? (
          <Text style={{ color: c.fgFaint, fontFamily: fonts.ui, fontSize: 13 }}>
            Friends, and people you follow who follow you back, show here.
          </Text>
        ) : (
          people.map((person) => (
            <Chip
              key={person.id}
              label={person.displayName}
              a11y={`Hiked with ${person.displayName}`}
              on={value.companions.includes(person.id)}
              onPress={() => {
                if (!value.companions.includes(person.id) && value.companions.length >= 10) return;
                onChange({ ...value, companions: toggle(value.companions, person.id) });
              }}
            />
          ))
        )}
      </Section>

      <Section title="Gear">
        {gearChoices.map((item) => (
          <Chip
            key={item}
            label={item}
            a11y={`Gear: ${item}`}
            on={value.gear.includes(item)}
            onPress={() => {
              if (!value.gear.includes(item) && value.gear.length >= GEAR_MAX_ITEMS) return;
              onChange({ ...value, gear: toggle(value.gear, item) });
            }}
          />
        ))}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: c.border,
            paddingLeft: 12,
            paddingRight: 6,
            minHeight: 34,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={addGear}
            maxLength={GEAR_MAX_LENGTH}
            placeholder="Add gear"
            placeholderTextColor={c.fgFaint}
            returnKeyType="done"
            accessibilityLabel="Add gear"
            style={{ minWidth: 90, color: c.fg, fontFamily: fonts.ui, fontSize: 13, paddingVertical: 6 }}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Save gear item" onPress={addGear} hitSlop={8}>
            {draft.trim() ? <Plus size={16} strokeWidth={2} color={c.fg} /> : null}
          </Pressable>
        </View>
      </Section>
    </View>
  );
}
