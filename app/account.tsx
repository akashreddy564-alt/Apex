import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Eyebrow } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { PhotoCreditsLink } from '@/components/opening/PhotoCreditsLink';
import { ScoreBadge } from '@/components/score/ScoreBadge';
import { ChoiceRow } from '@/components/settings/ChoiceRow';
import { Avatar } from '@/components/social/Avatar';
import { PrimaryButton } from '@/components/social/Buttons';
import { useMyProfile } from '@/hooks/useProfile';
import { cardStyle, fonts } from '@/theme/tokens';
import type { Appearance, ScoreStyle } from '@/lib/appearance';
import { pullRemote } from '@/lib/remoteSync';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/stores/settingsStore';
import { apiError } from '@/lib/apiError';

const SCORE_STYLES: { value: ScoreStyle; label: string }[] = [
  { value: 'number', label: 'Number' },
  { value: 'peak', label: 'Peak' },
  { value: 'blaze', label: 'Blaze' },
];

/** One settings card: an eyebrow, an optional heading, then its rows. */
function Section({ eyebrow, title, children }: { eyebrow: string; title?: string; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={[cardStyle(c), { marginBottom: 16 }]}>
      <Eyebrow>{eyebrow}</Eyebrow>
      {title ? (
        <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 20, lineHeight: 24, marginTop: 6 }}>{title}</Text>
      ) : null}
      {children}
    </View>
  );
}

/** Appearance and score style. Personal: they change only this phone. */
function DisplaySettings() {
  const appearance = useSettings((s) => s.appearance);
  const scoreStyle = useSettings((s) => s.scoreStyle);
  const setAppearance = useSettings((s) => s.setAppearance);
  const setScoreStyle = useSettings((s) => s.setScoreStyle);
  const c = useColors();
  return (
    <View style={[cardStyle(c), { marginBottom: 16, gap: 12 }]}>
      <Eyebrow>Appearance</Eyebrow>
      <ChoiceRow<Appearance>
        options={[
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' },
        ]}
        value={appearance}
        onChange={setAppearance}
      />
      <View style={{ marginTop: 8 }}>
        <Eyebrow>Score style</Eyebrow>
      </View>
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

const LINK_COOLDOWN_MS = 60_000;
/** Module-level so leaving and reopening Settings doesn't reset it. */
let lastSentAt = 0;

export default function AccountScreen() {
  const c = useColors();
  const router = useRouter();
  const { configured, email, session, profile, loading: profileLoading } = useMyProfile();
  const [address, setAddress] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!configured || !supabase) {
    return (
      <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-4 pt-6 pb-10">
        <DisplaySettings />
        <Section eyebrow="Account" title="Local mode">
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginTop: 6 }}>
            No Supabase env. Trails, logs and rankings stay on this device.
          </Text>
        </Section>
        <PhotoCreditsLink />
      </ScrollView>
    );
  }

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

  // The same email carries a 6-digit code when the template includes it.
  // It works where the link can't, like a simulator.
  const verifyCode = async () => {
    const token = code.replace(/\D/g, '');
    if (!sentTo || token.length !== 6) return;
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
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-4 pt-6 pb-10">
      <DisplaySettings />
      <Section eyebrow="Account" title={session ? 'Signed in' : 'Sign in'}>
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginTop: 4 }}>
          {email ? `Signed in as ${email}` : 'Magic link. Rankings stay private to this account.'}
        </Text>

        {session && !profileLoading ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={profile ? 'Edit profile' : 'Choose a username'}
            onPress={() => router.push('/username')}
            className="mt-4 flex-row items-center gap-3 border-t border-raised pt-4 active:opacity-80"
          >
            {profile ? <Avatar name={profile.display_name} size={40} /> : null}
            <View className="flex-1">
              <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 16 }}>
                {profile ? profile.display_name : 'Choose a username'}
              </Text>
              <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 2 }}>
                {profile ? `@${profile.username}` : 'Friends find you by it'}
              </Text>
            </View>
            <ChevronRight size={18} strokeWidth={1.6} color={c.fgMuted} />
          </Pressable>
        ) : null}

        {session ? (
          <Pressable
            accessibilityLabel="Sign out"
            onPress={() => {
              void client.auth.signOut();
            }}
            className="mt-4 items-center border border-raised py-3 active:bg-raised"
            style={{ borderRadius: 12 }}
          >
            <Text className="font-mono text-sm text-fg-2">Sign out</Text>
          </Pressable>
        ) : (
          <>
            <TextInput
              value={address}
              maxLength={254}
              onChangeText={setAddress}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="email"
              placeholderTextColor={c.fgFaint}
              accessibilityLabel="Email"
              className="mt-4 border border-raised bg-bg px-3 py-3 font-mono text-sm text-fg"
              style={{ borderRadius: 12 }}
            />
            <View className="mt-3">
              <PrimaryButton label="Send magic link" busy={busy} onPress={() => void sendLink()} />
            </View>
            {sentTo ? (
              <View className="mt-4 flex-row gap-2">
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="6-digit code"
                  placeholderTextColor={c.fgFaint}
                  accessibilityLabel="Code from the email"
                  className="flex-1 border border-raised bg-bg px-3 py-3 font-mono text-sm text-fg"
                  style={{ borderRadius: 12 }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sign in with code"
                  disabled={busy || code.replace(/\D/g, '').length !== 6}
                  onPress={() => {
                    void verifyCode();
                  }}
                  className="items-center justify-center border border-raised px-4 active:bg-raised"
                  style={{
                    borderRadius: 12,
                    opacity: busy || code.replace(/\D/g, '').length !== 6 ? 0.5 : 1,
                  }}
                >
                  <Text className="font-mono text-sm text-fg-2">Sign in</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}

        <Pressable
          accessibilityLabel="Sync now"
          disabled={busy || !session}
          onPress={() => {
            void sync();
          }}
          className="mt-3 items-center border border-raised py-3 active:bg-raised"
          style={{ borderRadius: 12, opacity: busy || !session ? 0.5 : 1 }}
        >
          <Text className="font-mono text-sm text-fg-2">Sync now</Text>
        </Pressable>

        {status ? (
          <Text className="mt-4 font-mono text-[11px] leading-5 text-fg-muted">{status}</Text>
        ) : null}
      </Section>

      {session ? (
        <Section eyebrow="Privacy">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/blocked')}
            className="mt-2 flex-row items-center justify-between py-3 active:opacity-70"
          >
            <Text className="text-[15px] text-fg">Blocked people</Text>
            <ChevronRight size={18} strokeWidth={1.6} color={c.fgMuted} />
          </Pressable>
          <Pressable
            accessibilityLabel="Delete account"
            onPress={() => router.push('/delete-account')}
            className="flex-row items-center justify-between border-t border-raised py-3 active:opacity-70"
          >
            <Text className="text-[15px] text-fg">Delete account</Text>
            <ChevronRight size={18} strokeWidth={1.6} color={c.fgMuted} />
          </Pressable>
        </Section>
      ) : null}

      <PhotoCreditsLink />
    </ScrollView>
  );
}
