import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { GroupMark, groupColor } from '@/components/groups/GroupMark';
import { PrimaryButton } from '@/components/social/Buttons';
import { SignInGate } from '@/components/social/SignInGate';
import { useColors } from '@/hooks/useColors';
import { useGroupActions } from '@/hooks/useGroups';
import { GROUP_COLORS, GROUP_NAME_MAX, type GroupColor } from '@/lib/groupRules';
import { fonts } from '@/theme/tokens';

function CreateForm() {
  const c = useColors();
  const router = useRouter();
  const { create, creating } = useGroupActions();
  const [name, setName] = useState('');
  const [color, setColor] = useState<GroupColor>('bone');
  const [error, setError] = useState<string | null>(null);
  const ready = name.trim().length > 0;

  const submit = async () => {
    setError(null);
    try {
      const id = await create(name, color);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: '/group/[id]', params: { id, fresh: '1' } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t create the group.');
    }
  };

  return (
    <View>
      <View className="flex-row items-center gap-3">
        <GroupMark name={name || 'A'} color={color} size={52} />
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={GROUP_NAME_MAX}
          autoFocus
          placeholder="Group name"
          placeholderTextColor={c.fgFaint}
          accessibilityLabel="Group name"
          returnKeyType="done"
          onSubmitEditing={() => (ready ? void submit() : undefined)}
          className="flex-1 rounded-xl border border-raised bg-surface px-3 py-3 text-fg"
          style={{ fontFamily: fonts.ui, fontSize: 16 }}
        />
      </View>

      <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 13, marginTop: 24 }}>Color</Text>
      <View className="mt-3 flex-row flex-wrap gap-3" accessibilityRole="radiogroup">
        {GROUP_COLORS.map((option) => {
          const on = option === color;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={option}
              accessibilityState={{ selected: on }}
              onPress={() => {
                void Haptics.selectionAsync();
                setColor(option);
              }}
              hitSlop={4}
              className="items-center justify-center rounded-full"
              style={{
                width: 40,
                height: 40,
                backgroundColor: groupColor(option, c),
                borderWidth: on ? 3 : 0,
                borderColor: c.fg,
              }}
            >
              {on ? <Check size={18} strokeWidth={2.4} color={option === 'bone' ? c.onAccent : c.bg} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, lineHeight: 19, marginTop: 24 }}>
        You’ll get a link and a 6-character code to share. Up to 50 people. Members see each other’s name,
        totals and place, never hikes or routes.
      </Text>

      {error ? (
        <Text style={{ color: c.disliked, fontFamily: fonts.ui, fontSize: 14, marginTop: 14 }}>{error}</Text>
      ) : null}

      <View className="mt-6">
        <PrimaryButton label="Create group" onPress={() => void submit()} disabled={!ready} busy={creating} />
      </View>
    </View>
  );
}

export default function CreateGroupScreen() {
  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <SignInGate why="create a group">{() => <CreateForm />}</SignInGate>
    </ScrollView>
  );
}
