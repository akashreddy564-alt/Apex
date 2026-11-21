import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { ContourTexture, Eyebrow } from '@/components/motion';
import { PrimaryButton, SecondaryButton } from '@/components/social/Buttons';
import { useColors } from '@/hooks/useColors';
import { useMyProfile } from '@/hooks/useProfile';
import type { Profile } from '@/lib/profile';
import { cardStyle, fonts } from '@/theme/tokens';

const TEXTURE_H = 120;

/** The gate's card: a contour header behind an eyebrow, title and one plain sentence. */
function Card({ eyebrow, title, body, children }: { eyebrow: string; title: string; body: string; children?: ReactNode }) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  return (
    <View
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
      style={[cardStyle(c), { marginHorizontal: 16, marginTop: 24, overflow: 'hidden', paddingTop: 28 }]}
    >
      {width > 0 ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: TEXTURE_H }}>
          <ContourTexture seed={`gate-${eyebrow}`} width={width} height={TEXTURE_H} />
        </View>
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
        eyebrow="This phone only"
        title="Friends need an account"
        body="This copy of Apex runs on this phone only. Your hikes and rankings still work in Log."
      />
    );
  }
  if (loading) {
    return null;
  }
  if (!session) {
    return (
      <Card
        eyebrow="Account"
        title="Sign in to see your friends"
        body={`Sign in to ${why}. Your hikes upload when you do, and Log keeps working signed out.`}
      >
        <PrimaryButton label="Sign in with email" onPress={() => router.push('/account')} />
      </Card>
    );
  }
  if (error) {
    return (
      <Card eyebrow="Profile" title="Couldn’t load your profile" body={error}>
        <SecondaryButton label="Try again" onPress={() => void refetch()} />
      </Card>
    );
  }
  if (!profile) {
    return (
      <Card eyebrow="Username" title="Pick a username" body="Friends find you by your username. You can change it later.">
        <PrimaryButton label="Choose username" onPress={() => router.push('/username')} />
      </Card>
    );
  }
  return <>{children(profile)}</>;
}
