import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PhotoCreditsLink } from '@/components/opening/PhotoCreditsLink';
import { ScoreBadge } from '@/components/score/ScoreBadge';
import { ChoiceRow } from '@/components/settings/ChoiceRow';
import { useAuth } from '@/hooks/useAuth';
import type { Appearance, ScoreStyle } from '@/lib/appearance';
import { pullRemote } from '@/lib/remoteSync';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/stores/settingsStore';

const SCORE_STYLES: { value: ScoreStyle; label: string }[] = [
  { value: 'number', label: 'Number' },
  { value: 'peak', label: 'Peak' },
  { value: 'blaze', label: 'Blaze' },
];

/** Appearance and score style. Personal: they change only this phone. */
function DisplaySettings() {
  const appearance = useSettings((s) => s.appearance);
  const scoreStyle = useSettings((s) => s.scoreStyle);
  const setAppearance = useSettings((s) => s.setAppearance);
  const setScoreStyle = useSettings((s) => s.setScoreStyle);
  return (
    <View className="mb-8 gap-3">
      <Text className="text-[13px] text-fg-muted">Appearance</Text>
      <ChoiceRow<Appearance>
        options={[
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' },
        ]}
        value={appearance}
        onChange={setAppearance}
      />
      <Text className="mt-3 text-[13px] text-fg-muted">Score style</Text>
      <ChoiceRow<ScoreStyle>
        options={SCORE_STYLES.map((option) => ({
          ...option,
          preview: <ScoreBadge bucket="loved" count={5} score={9.4} style={option.value} />,
        }))}
        value={scoreStyle}
        onChange={setScoreStyle}
      />
    </View>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { configured, email, session } = useAuth();
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!configured || !supabase) {
    return (
      <ScrollView className="flex-1 bg-zinc-950" contentContainerClassName="px-4 pt-6 pb-10">
        <DisplaySettings />
        <Text className="text-lg font-medium text-zinc-50">Local mode</Text>
        <Text className="mt-2 font-mono text-[11px] leading-5 text-zinc-500">
          No Supabase env. Trails, logs, and rankings stay on this device.
        </Text>
        <PhotoCreditsLink />
      </ScrollView>
    );
  }

  const client = supabase;

  const sendLink = async () => {
    const next = address.trim();
    if (!next) return;
    setBusy(true);
    setStatus(null);
    try {
      const { error } = await client.auth.signInWithOtp({
        email: next,
        options: { emailRedirectTo: Linking.createURL('/account') },
      });
      setStatus(error ? error.message : 'Check your email for the sign-in link.');
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    try {
      const result = await pullRemote();
      setStatus(result.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-zinc-950" contentContainerClassName="px-4 pt-6 pb-10">
      <DisplaySettings />
      <Text className="text-lg font-medium text-zinc-50">Account</Text>
      <Text className="mt-2 font-mono text-[11px] leading-5 text-zinc-500">
        {email ? `Signed in as ${email}` : 'Magic link. Rankings stay private to this account.'}
      </Text>

      {session ? (
        <Pressable
          accessibilityLabel="Sign out"
          onPress={() => {
            void client.auth.signOut();
          }}
          className="mt-6 items-center border border-zinc-800 py-3 active:bg-zinc-900"
          style={{ borderRadius: 12 }}
        >
          <Text className="font-mono text-sm text-zinc-300">Sign out</Text>
        </Pressable>
      ) : (
        <>
          <TextInput
            value={address}
            onChangeText={setAddress}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="email"
            placeholderTextColor="#52525B"
            accessibilityLabel="Email"
            className="mt-6 border border-zinc-800 bg-zinc-900 px-3 py-3 font-mono text-sm text-zinc-100"
            style={{ borderRadius: 12 }}
          />
          <Pressable
            accessibilityLabel="Send magic link"
            disabled={busy}
            onPress={() => {
              void sendLink();
            }}
            className="mt-3 items-center border border-accent bg-accent/15 py-3 active:bg-accent/25"
            style={{ borderRadius: 12, opacity: busy ? 0.5 : 1 }}
          >
            <Text className="font-mono text-sm text-accent">Send magic link</Text>
          </Pressable>
        </>
      )}

      <Pressable
        accessibilityLabel="Sync now"
        disabled={busy || !session}
        onPress={() => {
          void sync();
        }}
        className="mt-3 items-center border border-zinc-800 py-3 active:bg-zinc-900"
        style={{ borderRadius: 12, opacity: busy || !session ? 0.5 : 1 }}
      >
        <Text className="font-mono text-sm text-zinc-300">Sync now</Text>
      </Pressable>

      {status ? (
        <Text className="mt-4 font-mono text-[11px] leading-5 text-zinc-400">{status}</Text>
      ) : null}

      {session ? (
        <Pressable
          accessibilityLabel="Delete account"
          onPress={() => router.push('/delete-account')}
          className="mt-8 py-3"
        >
          <Text className="text-[15px] text-zinc-300">Delete account</Text>
        </Pressable>
      ) : null}

      <PhotoCreditsLink />
    </ScrollView>
  );
}
