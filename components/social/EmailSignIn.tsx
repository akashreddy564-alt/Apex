import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { PrimaryButton, SecondaryButton } from '@/components/social/Buttons';
import { useColors } from '@/hooks/useColors';
import { apiError } from '@/lib/apiError';
import { supabase } from '@/lib/supabase';
import { startSignIn } from '@/stores/signInStore';
import { fonts, numericStyle } from '@/theme/tokens';

const LINK_COOLDOWN_MS = 60_000;
/** Module-level so leaving and reopening the screen doesn't reset it. */
let lastSentAt = 0;

/**
 * Email sign-in: a magic link (with the code from the same email as a
 * fallback), or a password for App Review's demo account. Used in Settings
 * and on the onboarding sign-up step.
 */
export function EmailSignIn() {
  const c = useColors();
  const [address, setAddress] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  // Password sign-in exists for App Review's demo account; everyone else uses the link.
  const [withPassword, setWithPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!supabase) return null;
  const client = supabase;

  const sendLink = async () => {
    const next = address.trim().toLowerCase();
    if (!next) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(next)) {
      setStatus('That doesn’t look like an email address.');
      return;
    }
    // Supabase limits sign-in emails too; this keeps a double tap from using one up.
    const wait = Math.ceil((LINK_COOLDOWN_MS - (Date.now() - lastSentAt)) / 1000);
    if (wait > 0) {
      setStatus(`You can send another link in ${wait} s.`);
      return;
    }
    setBusy(true);
    setStatus(null);
    startSignIn('email', next);
    try {
      const { error } = await client.auth.signInWithOtp({
        email: next,
        options: { emailRedirectTo: Linking.createURL('/account') },
      });
      if (error) {
        setStatus(apiError(error).message);
      } else {
        setSentTo(next);
        lastSentAt = Date.now();
        setStatus('Check your email. Open the link on this phone, or type the code from it.');
      }
    } finally {
      setBusy(false);
    }
  };

  // The same email carries a code when the template includes it: 6 digits on
  // older Supabase projects, 8 on newer ones. It works where the link can't.
  const verifyCode = async () => {
    const token = code.replace(/\D/g, '');
    if (!sentTo || token.length < 6 || token.length > 8) return;
    setBusy(true);
    setStatus(null);
    try {
      const { error } = await client.auth.verifyOtp({ email: sentTo, token, type: 'email' });
      if (error) setStatus(error.message);
      else {
        setStatus(null);
        setCode('');
      }
    } finally {
      setBusy(false);
    }
  };

  const signInWithPassword = async () => {
    const next = address.trim().toLowerCase();
    if (!next || !password) return;
    setBusy(true);
    setStatus(null);
    startSignIn('email', next);
    try {
      const { error } = await client.auth.signInWithPassword({ email: next, password });
      if (error) setStatus(error.message === 'Invalid login credentials' ? 'That email and password don’t match.' : apiError(error).message);
      else setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <>
    <TextInput
      value={address}
      maxLength={254}
      onChangeText={setAddress}
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType="email-address"
      inputMode="email"
      spellCheck={false}
      placeholder="you@email.com"
      placeholderTextColor={c.fgFaint}
      accessibilityLabel="Email"
      textContentType="emailAddress"
      autoComplete="email"
      className="rounded-2xl border border-raised bg-bg px-4 text-fg"
      style={{ fontFamily: fonts.ui, fontSize: 16, minHeight: 48 }}
    />
    {withPassword ? (
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Password"
        placeholderTextColor={c.fgFaint}
        accessibilityLabel="Password"
        textContentType="password"
        autoComplete="password"
        returnKeyType="go"
        onSubmitEditing={() => void signInWithPassword()}
        className="mt-3 rounded-2xl border border-raised bg-bg px-4 text-fg"
        style={{ fontFamily: fonts.ui, fontSize: 16, minHeight: 48 }}
      />
    ) : null}
    <View className="mt-3">
      {withPassword ? (
        <PrimaryButton
          label="Sign in"
          a11y="Sign in with password"
          busy={busy}
          disabled={!address.trim() || !password}
          onPress={() => void signInWithPassword()}
        />
      ) : (
        <PrimaryButton label="Send magic link" busy={busy} onPress={() => void sendLink()} />
      )}
    </View>
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        setWithPassword((on) => !on);
        setStatus(null);
      }}
      hitSlop={8}
      className="mt-3 self-start active:opacity-60"
    >
      <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 13 }}>
        {withPassword ? 'Use a magic link instead' : 'Have a password? Sign in with it'}
      </Text>
    </Pressable>
    {!withPassword && sentTo ? (
      <View className="mt-4 flex-row gap-2">
        <TextInput
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={8}
          placeholder="Code from the email"
          placeholderTextColor={c.fgFaint}
          accessibilityLabel="Code from the email"
          className="flex-1 rounded-2xl border border-raised bg-bg px-4 text-fg"
          style={{ fontSize: 18, minHeight: 48, letterSpacing: 2, ...numericStyle('medium') }}
        />
        <SecondaryButton
          label="Sign in"
          a11y="Sign in with code"
          disabled={busy || code.replace(/\D/g, '').length < 6}
          onPress={() => {
            void verifyCode();
          }}
        />
      </View>
    ) : null}
      </>
      {status ? (
        <Text accessibilityLiveRegion="polite" style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, marginTop: 14 }}>{status}</Text>
      ) : null}
    </View>
  );
}
