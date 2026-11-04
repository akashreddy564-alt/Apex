import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/social/Buttons';
import { SignInGate } from '@/components/social/SignInGate';
import { useColors } from '@/hooks/useColors';
import { useGroupActions } from '@/hooks/useGroups';
import { CODE_LENGTH, isCompleteCode, normalizeCode } from '@/lib/groupRules';
import { fonts } from '@/theme/tokens';

function JoinForm({ initial }: { initial: string }) {
  const c = useColors();
  const router = useRouter();
  const { join, joining } = useGroupActions();
  const [code, setCode] = useState(normalizeCode(initial));
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(false);
  const ready = isCompleteCode(code);

  const submit = async (value = code) => {
    setError(null);
    try {
      const id = await join(value);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: '/group/[id]', params: { id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t join the group.');
    }
  };

  // An invite link arrives with the code filled in: join straight away, once.
  useEffect(() => {
    if (tried.current || !isCompleteCode(normalizeCode(initial))) return;
    tried.current = true;
    void submit(normalizeCode(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  return (
    <View>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 }}>
        Type the 6-character code someone in the group shared with you.
      </Text>
      <TextInput
        value={code}
        onChangeText={(text) => setCode(normalizeCode(text))}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus={!initial}
        maxLength={CODE_LENGTH + 2}
        placeholder="AB3K9Q"
        placeholderTextColor={c.fgFaint}
        accessibilityLabel="Group code"
        returnKeyType="join"
        onSubmitEditing={() => (ready ? void submit() : undefined)}
        className="mt-5 rounded-xl border border-raised bg-surface px-4 py-4 text-center text-fg"
        style={{ fontFamily: fonts.mono, fontSize: 28, letterSpacing: 8 }}
      />
      {error ? (
        <Text style={{ color: c.disliked, fontFamily: fonts.ui, fontSize: 14, marginTop: 12 }}>{error}</Text>
      ) : null}
      <View className="mt-6">
        <PrimaryButton label="Join group" onPress={() => void submit()} disabled={!ready} busy={joining} />
      </View>
    </View>
  );
}

/** Join by code. Invite links (apex://join-group?code=…) land here. */
export default function JoinGroupScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const initial = typeof params.code === 'string' ? params.code : '';
  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <SignInGate why="join a group">{() => <JoinForm initial={initial} />}</SignInGate>
    </ScrollView>
  );
}
