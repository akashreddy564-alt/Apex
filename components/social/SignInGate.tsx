import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { PrimaryButton, SecondaryButton } from '@/components/social/Buttons';
import { useColors } from '@/hooks/useColors';
import { useMyProfile } from '@/hooks/useProfile';
import type { Profile } from '@/lib/profile';
import { fonts } from '@/theme/tokens';

function Card({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  const c = useColors();
  return (
    <View className="mx-4 mt-6 rounded-2xl bg-surface px-5 py-6">
      <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 20 }}>{title}</Text>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15, marginTop: 6, lineHeight: 21 }}>
        {body}
      </Text>
      {children ? <View className="mt-5 gap-2">{children}</View> : null}
    </View>
  );
}

/**
 * Home and Social need an account and a username. Log, recording and ranking
 * never do. `why` finishes "Sign in to …".
 */
export function SignInGate({
  why,
  children,
}: {
  why: string;
  children: (profile: Profile) => ReactNode;
}) {
  const router = useRouter();
  const c = useColors();
  const { configured, session, profile, loading, error, refetch } = useMyProfile();

  if (!configured) {
    return (
      <Card
        title="Friends need an account"
        body="This copy of Apex runs on this phone only. Your hikes and rankings still work in Log."
      />
    );
  }
  if (loading) {
    return (
      <View className="mt-10 items-center">
        <ActivityIndicator color={c.fgMuted} />
      </View>
    );
  }
  if (!session) {
    return (
      <Card
        title="Sign in to see your friends"
        body={`Sign in to ${why}. Your hikes upload when you do, and Log keeps working signed out.`}
      >
        <PrimaryButton label="Sign in with email" onPress={() => router.push('/account')} />
      </Card>
    );
  }
  if (error) {
    return (
      <Card title="Couldn’t load your profile" body={error}>
        <SecondaryButton label="Try again" onPress={() => void refetch()} />
      </Card>
    );
  }
  if (!profile) {
    return (
      <Card title="Pick a username" body="Friends find you by your username. You can change it later.">
        <PrimaryButton label="Choose username" onPress={() => router.push('/username')} />
      </Card>
    );
  }
  return <>{children(profile)}</>;
}
