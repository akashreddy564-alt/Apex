import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { ContourTexture, Eyebrow, Skeleton } from '@/components/motion';
import { PrimaryButton, SecondaryButton } from '@/components/social/Buttons';
import { useColors } from '@/hooks/useColors';
import { profileKey, useMyProfile } from '@/hooks/useProfile';
import { acceptTerms, type Profile } from '@/lib/profile';
import { TermsSummary } from '@/components/social/TermsAgreement';
import { cardStyle, fonts } from '@/theme/tokens';

/** The gate's card (also used for other empty and dead-end screens): contour lines across the whole card behind an eyebrow, title and one plain sentence. */
export function GateCard({ eyebrow, title, body, children }: { eyebrow: string; title: string; body: string; children?: ReactNode }) {
  const c = useColors();
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View
      onLayout={(e) =>
        setSize({ width: Math.round(e.nativeEvent.layout.width), height: Math.round(e.nativeEvent.layout.height) })
      }
      style={[cardStyle(c), { marginHorizontal: 16, marginTop: 24, overflow: 'hidden', paddingTop: 28 }]}
    >
      {/* Sized to the card, so the rings run off its edges instead of stopping at a line. */}
      {size.width > 0 && size.height > 0 ? (
        <ContourTexture seed={`gate-${eyebrow}`} width={size.width} height={size.height} opacity={0.8} />
      ) : null}
      <Eyebrow>{eyebrow}</Eyebrow>
      <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 22, lineHeight: 26, marginTop: 8 }}>{title}</Text>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15, marginTop: 6, lineHeight: 21 }}>
        {body}
      </Text>
      {children ? <View style={{ marginTop: 20, gap: 8 }}>{children}</View> : null}
    </View>
  );
}

/**
 * Home and Social need an account and a username. Log, recording and ranking
 * never do. `why` finishes "Sign in to …".
 */
export function SignInGate({
  why,
  title = 'Sign in to see your friends',
  children,
}: {
  why: string;
  /** The signed-out card's heading. */
  title?: string;
  children: (profile: Profile) => ReactNode;
}) {
  const router = useRouter();
  const c = useColors();
  const { configured, session, profile, loading, error, refetch } = useMyProfile();

  if (!configured) {
    return (
      <GateCard
        eyebrow="This phone only"
        title="Friends need an account"
        body="This copy of Apex runs on this phone only. Your hikes and rankings still work in Log."
      />
    );
  }
  if (loading) {
    // Hold the space the content will take, so nothing jumps when it lands.
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
        <Skeleton shape="row" count={4} />
      </View>
    );
  }
  if (!session) {
    return (
      <GateCard
        eyebrow="Account"
        title={title}
        body={`Sign in to ${why}. Your hikes upload when you do, and Log keeps working signed out.`}
      >
        <PrimaryButton label="Sign in" onPress={() => router.push('/account')} />
      </GateCard>
    );
  }
  if (error) {
    return (
      <GateCard eyebrow="Profile" title="Couldn’t load your profile" body={error}>
        <SecondaryButton label="Try again" onPress={() => void refetch()} />
      </GateCard>
    );
  }
  if (!profile) {
    return (
      <GateCard eyebrow="Username" title="Pick a username" body="Friends find you by your username. You can change it later.">
        <PrimaryButton label="Choose username" onPress={() => router.push('/username')} />
      </GateCard>
    );
  }
  if (!profile.terms_accepted) {
    return <TermsGate profile={profile} />;
  }
  return <>{children(profile)}</>;
}

/** Accounts from before the terms agree once before using social features. */
function TermsGate({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const c = useColors();
  const agree = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const next = await acceptTerms(profile.id);
      if (next) queryClient.setQueryData(profileKey(profile.id), next);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Couldn’t save that. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <GateCard eyebrow="Terms" title="One thing before you post" body="Apex has a few rules for what people share with friends.">
      <TermsSummary />
      {problem ? <Text style={{ color: c.disliked, fontFamily: fonts.ui, fontSize: 14 }}>{problem}</Text> : null}
      <PrimaryButton label="Agree and continue" busy={busy} onPress={() => void agree()} />
    </GateCard>
  );
}
