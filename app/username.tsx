import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/social/Buttons';
import { useColors } from '@/hooks/useColors';
import { profileKey, useMyProfile } from '@/hooks/useProfile';
import { saveProfile } from '@/lib/profile';
import {
  DISPLAY_NAME_MAX,
  USERNAME_MAX,
  displayNameProblem,
  normalizeUsername,
  suggestUsername,
  usernameProblem,
} from '@/lib/username';
import { fonts } from '@/theme/tokens';

/** Pick a username on first sign-in, or change it later from Settings. */
export default function UsernameScreen() {
  const c = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { uid, email, profile, loading } = useMyProfile();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [touched, setTouched] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filled, setFilled] = useState(false);

  // Start from the saved profile, or a guess from the email.
  useEffect(() => {
    if (filled || loading) return;
    setName(profile?.display_name ?? '');
    setUsername(profile?.username ?? suggestUsername(email));
    setFilled(true);
  }, [email, filled, loading, profile]);

  if (loading || !filled) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={c.fgMuted} />
      </View>
    );
  }

  if (!uid) {
    return (
      <View className="flex-1 bg-bg px-5 pt-6">
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15 }}>
          Sign in from Settings first.
        </Text>
      </View>
    );
  }

  const problem = usernameProblem(username) ?? displayNameProblem(name);
  const shown = touched ? (message ?? problem) : message;

  const save = async () => {
    setTouched(true);
    if (problem) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await saveProfile(uid, username, name);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      queryClient.setQueryData(profileKey(uid), result.profile);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } finally {
      setBusy(false);
    }
  };

  const field = 'mt-2 rounded-xl border border-raised bg-surface px-3 py-3 text-fg';

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 28, lineHeight: 32 }}>
        {profile ? 'Your profile' : 'Pick a username'}
      </Text>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15, marginTop: 8, lineHeight: 21 }}>
        Friends see your name and username, and find you by your username.
      </Text>

      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 24 }}>Name</Text>
      <TextInput
        value={name}
        onChangeText={(next) => {
          setName(next);
          setMessage(null);
        }}
        maxLength={DISPLAY_NAME_MAX}
        autoComplete="name"
        textContentType="name"
        placeholder="Maya Chen"
        placeholderTextColor={c.fgFaint}
        accessibilityLabel="Name"
        className={field}
        style={{ fontFamily: fonts.ui, fontSize: 16 }}
      />

      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 18 }}>
        Username
      </Text>
      <View className="mt-2 flex-row items-center rounded-xl border border-raised bg-surface px-3">
        <Text style={{ color: c.fgFaint, fontFamily: fonts.ui, fontSize: 16 }}>@</Text>
        <TextInput
          value={username}
          onChangeText={(next) => {
            setUsername(normalizeUsername(next));
            setMessage(null);
          }}
          onBlur={() => setTouched(true)}
          maxLength={USERNAME_MAX}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          placeholder="maya_c"
          placeholderTextColor={c.fgFaint}
          accessibilityLabel="Username"
          className="flex-1 py-3 pl-1 text-fg"
          style={{ fontFamily: fonts.ui, fontSize: 16 }}
        />
      </View>
      <Text
        accessibilityLiveRegion="polite"
        style={{
          color: shown ? c.disliked : c.fgFaint,
          fontFamily: fonts.ui,
          fontSize: 13,
          marginTop: 8,
          minHeight: 18,
        }}
      >
        {shown ?? 'Letters, numbers and underscores.'}
      </Text>

      <View className="mt-6">
        <PrimaryButton label={profile ? 'Save' : 'Continue'} busy={busy} onPress={() => void save()} />
      </View>
    </ScrollView>
  );
}
