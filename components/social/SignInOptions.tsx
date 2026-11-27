import * as AppleAuthentication from 'expo-apple-authentication';
import { History } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { ContourLoader, haptics, PressScale } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { METHOD_LABEL, maskEmail, type SignInMethod } from '@/lib/signInMemory';
import { appleAvailable, signInWithApple, signInWithGoogle, type SocialResult } from '@/lib/socialAuth';
import { useSettings } from '@/stores/settingsStore';
import { useSignIn } from '@/stores/signInStore';
import { fonts } from '@/theme/tokens';

const BUTTON_H = 50;

function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

/** A small "Last used" tag on the button you used before, so the eye goes there first. */
function LastTag() {
  const c = useColors();
  return (
    <View style={{ position: 'absolute', right: 12, top: -9, backgroundColor: c.accent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ color: c.onAccent, fontFamily: fonts.uiSemibold, fontSize: 11, letterSpacing: 0.2 }}>Last used</Text>
    </View>
  );
}

function GoogleButton({ busy, onPress, last }: { busy: boolean; onPress: () => void; last: boolean }) {
  const c = useColors();
  return (
    <View>
      <PressScale
        to={0.97}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityState={{ busy }}
        disabled={busy}
        onPress={onPress}
        className="flex-row items-center justify-center rounded-2xl bg-surface"
        style={{ height: BUTTON_H, gap: 10, borderWidth: 1, borderColor: last ? c.accent : c.raised }}
      >
        {busy ? <ContourLoader size="sm" color={c.fg2} /> : <GoogleG />}
        <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 16 }}>Continue with Google</Text>
      </PressScale>
      {last ? <LastTag /> : null}
    </View>
  );
}

function AppleButton({ onPress, last }: { onPress: () => void; last: boolean }) {
  const dark = useSettings((s) => s.appearance) === 'dark';
  return (
    <View>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        // Opposite of the page so it stands out: black on light, white on dark.
        buttonStyle={dark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={16}
        style={{ width: '100%', height: BUTTON_H }}
        onPress={() => {
          haptics.tapLight();
          onPress();
        }}
      />
      {last ? <LastTag /> : null}
    </View>
  );
}

function Divider({ label }: { label: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: c.raised }} />
      <Text style={{ color: c.fgFaint, fontFamily: fonts.uiMedium, fontSize: 12 }}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: c.raised }} />
    </View>
  );
}

/**
 * Apple and Google above the email form. A bar names the way you signed in
 * last time, and that option moves to the top with a "Last used" tag: one
 * obvious choice instead of three equal ones.
 */
export function SignInOptions({ email }: { email: ReactNode }) {
  const c = useColors();
  const lastMethod = useSignIn((s) => s.lastMethod);
  const lastEmail = useSignIn((s) => s.lastEmail);
  const remember = useSignIn((s) => s.remember);
  const [apple, setApple] = useState(false);
  const [busy, setBusy] = useState<SignInMethod | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void appleAvailable.then((ok) => live && setApple(ok));
    return () => {
      live = false;
    };
  }, []);

  const run = async (method: SignInMethod, go: () => Promise<SocialResult>) => {
    setBusy(method);
    setProblem(null);
    try {
      const result = await go();
      if (result.ok) {
        haptics.success();
        remember(method, result.email);
      } else if (!result.canceled) {
        setProblem(result.message);
      }
    } finally {
      setBusy(null);
    }
  };

  const options: { method: SignInMethod; node: ReactNode }[] = [];
  if (apple) options.push({ method: 'apple', node: <AppleButton last={lastMethod === 'apple'} onPress={() => void run('apple', signInWithApple)} /> });
  options.push({
    method: 'google',
    node: <GoogleButton busy={busy === 'google'} last={lastMethod === 'google'} onPress={() => void run('google', signInWithGoogle)} />,
  });
  // The last one used goes first.
  options.sort((a, b) => Number(b.method === lastMethod) - Number(a.method === lastMethod));
  const masked = maskEmail(lastEmail);
  const emailFirst = lastMethod === 'email';

  return (
    <View style={{ marginTop: 16 }}>
      {lastMethod ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          accessibilityRole="text"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: c.raised, marginBottom: 16 }}
        >
          <History size={16} strokeWidth={1.8} color={c.fg2} />
          <Text style={{ flex: 1, color: c.fg2, fontFamily: fonts.uiMedium, fontSize: 13, lineHeight: 18 }}>
            Last signed in with {METHOD_LABEL[lastMethod]}
            {masked ? <Text style={{ color: c.fgMuted, fontFamily: fonts.ui }}>{` · ${masked}`}</Text> : null}
          </Text>
        </Animated.View>
      ) : null}
      {emailFirst ? (
        <>
          {email}
          <Divider label="or" />
        </>
      ) : null}
      <View style={{ gap: 12 }}>
        {options.map((o) => (
          <View key={o.method}>{o.node}</View>
        ))}
      </View>
      {problem ? (
        <Text accessibilityLiveRegion="polite" style={{ color: c.disliked, fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, marginTop: 10 }}>
          {problem}
        </Text>
      ) : null}
      {emailFirst ? null : (
        <>
          <Divider label="or with email" />
          {email}
        </>
      )}
    </View>
  );
}
