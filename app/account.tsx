import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { pullRemote } from '@/lib/remoteSync';
import { supabase } from '@/lib/supabase';

export default function AccountScreen() {
  const { configured, email, session } = useAuth();
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!configured || !supabase) {
    return (
      <View className="flex-1 bg-zinc-950 px-4 pt-6">
        <Text className="text-lg font-medium text-zinc-50">Local mode</Text>
        <Text className="mt-2 font-mono text-[11px] leading-5 text-zinc-500">
          No Supabase env. Trails, logs, and rankings stay on this device.
        </Text>
      </View>
    );
  }

  const client = supabase;

  const sendLink = async () => {
    const next = address.trim();
    if (!next) return;
    setBusy(true);
    setStatus(null);
    const { error } = await client.auth.signInWithOtp({
      email: next,
      options: { emailRedirectTo: Linking.createURL('/account') },
    });
    setBusy(false);
    setStatus(error ? error.message : 'Check your email for the sign-in link.');
  };

  const sync = async () => {
    setBusy(true);
    const result = await pullRemote();
    setBusy(false);
    setStatus(result.ok ? result.message : result.message);
  };

  return (
    <View className="flex-1 bg-zinc-950 px-4 pt-6">
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
    </View>
  );
}
