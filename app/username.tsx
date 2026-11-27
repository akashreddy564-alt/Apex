import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { haptics, PressScale, Skeleton } from '@/components/motion';
import { AgeSheet } from '@/components/social/AgeSheet';
import { PrimaryButton } from '@/components/social/Buttons';
import { GateCard } from '@/components/social/SignInGate';
import { TermsCheckbox } from '@/components/social/TermsAgreement';
import { useColors } from '@/hooks/useColors';
import { profileKey, useMyProfile } from '@/hooks/useProfile';
import { oldEnough } from '@/lib/age';
import { saveProfile } from '@/lib/profile';
import { useSignIn } from '@/stores/signInStore';
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
  const { uid, email, session, profile, loading } = useMyProfile();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [touched, setTouched] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filled, setFilled] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const birthYear = useSignIn((s) => s.birthYear);
  const confirmAge = useSignIn((s) => s.confirmAge);
  const ageSheet = useRef<BottomSheetModal>(null);
  // The year row pulses once when the sheet saves, so you see where it landed.
  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  // Start from the saved profile, or a guess from the email.
  useEffect(() => {
    if (filled || loading) return;
    // Apple sends the name once at sign-in; it's kept on the account for this.
    const given = session?.user.user_metadata?.full_name;
    setName(profile?.display_name ?? (typeof given === 'string' ? given : ''));
    setUsername(profile?.username ?? suggestUsername(email));
    setFilled(true);
  }, [email, filled, loading, profile, session]);

  if (loading || !filled) {
    return (
      <View className="flex-1 bg-bg px-5 pt-6">
        <Skeleton shape="row" count={5} />
      </View>
    );
  }

  if (!uid) {
    return (
      <View className="flex-1 bg-bg">
        <GateCard eyebrow="Account" title="Sign in first" body="Your username lives on your account. Sign in, then pick one.">
          <PrimaryButton label="Go to sign in" onPress={() => router.replace('/account')} />
        </GateCard>
      </View>
    );
  }

  // New accounts agree to the terms here; older ones agree on a card (SignInGate).
  const needsTerms = !profile;
  // New accounts confirm they're 13 or older once on this phone.
  const needsAge = !profile;
  const ageOk = birthYear != null && oldEnough(birthYear, new Date().getFullYear());
  const problem =
    usernameProblem(username) ??
    displayNameProblem(name) ??
    (needsAge && !ageOk ? 'Add your birth year to continue.' : null) ??
    (needsTerms && !agreed ? 'Agree to the terms to continue.' : null);
  const shown = touched ? (message ?? problem) : message;

  const save = async () => {
    setTouched(true);
    if (problem) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await saveProfile(uid, username, name, needsTerms && agreed);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      queryClient.setQueryData(profileKey(uid), result.profile);
      haptics.success();
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

      {needsAge ? (
        <>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 10 }}>Birth year</Text>
          <Animated.View style={pulseStyle}>
            <PressScale
              to={0.98}
              accessibilityRole="button"
              accessibilityLabel={birthYear ? `Birth year ${birthYear}. Change` : 'Choose your birth year'}
              onPress={() => ageSheet.current?.present()}
              className="mt-2 flex-row items-center justify-between rounded-xl border border-raised bg-surface px-3"
              style={{ minHeight: 48 }}
            >
              <Text style={{ color: birthYear ? c.fg : c.fgFaint, fontFamily: fonts.ui, fontSize: 16 }}>
                {birthYear ?? 'Choose'}
              </Text>
              <ChevronDown size={18} strokeWidth={1.7} color={c.fgMuted} />
            </PressScale>
          </Animated.View>
          <AgeSheet
            ref={ageSheet}
            initial={birthYear}
            onDone={(year) => {
              confirmAge(year);
              setMessage(null);
              ageSheet.current?.dismiss();
              pulse.value = withSequence(withTiming(1.04, { duration: 120 }), withSpring(1, { damping: 10, stiffness: 260 }));
            }}
          />
        </>
      ) : null}

      {needsTerms ? (
        <View className="mt-4">
          <TermsCheckbox
            checked={agreed}
            onChange={(next) => {
              setAgreed(next);
              setMessage(null);
            }}
          />
        </View>
      ) : null}

      <View className="mt-6">
        <PrimaryButton label={profile ? 'Save' : 'Continue'} busy={busy} onPress={() => void save()} />
      </View>
    </ScrollView>
  );
}
