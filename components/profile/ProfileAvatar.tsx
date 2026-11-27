import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { ContourLoader, haptics, PressScale } from '@/components/motion';
import { AvatarSheet } from '@/components/profile/AvatarSheet';
import { Avatar } from '@/components/social/Avatar';
import { useColors } from '@/hooks/useColors';
import { profileKey } from '@/hooks/useProfile';
import { removeAvatar, setAvatar } from '@/lib/avatar';
import { fonts } from '@/theme/tokens';

/** How big a profile photo shows on a person's page. */
export const PROFILE_AVATAR = 120;

/**
 * The big photo at the top of a person's page. On your own page it's a
 * button: a sheet offers library, camera or remove. The new photo shows at
 * once while it uploads, and the disc pulses when it's saved.
 */
export function ProfileAvatar({
  personId,
  name,
  path,
  self,
}: {
  personId: string;
  name: string;
  path: string | null | undefined;
  self: boolean;
}) {
  if (!self) return <Avatar name={name} size={PROFILE_AVATAR} path={path} />;
  return <OwnAvatar personId={personId} name={name} path={path} />;
}

/** Your own photo: a button with the photo sheet behind it. */
function OwnAvatar({ personId, name, path }: { personId: string; name: string; path: string | null | undefined }) {
  const c = useColors();
  const queryClient = useQueryClient();
  const sheet = useRef<BottomSheetModal>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['person', personId] });
    void queryClient.invalidateQueries({ queryKey: profileKey(personId) });
  };

  const pick = async (from: 'library' | 'camera') => {
    sheet.current?.dismiss();
    setProblem(null);
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 };
    if (from === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setProblem('Allow camera access in Settings to take a photo.');
        return;
      }
    }
    const result = from === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.uri) return;
    // Show it now; the upload catches up.
    setPending(asset.uri);
    setBusy(true);
    try {
      await setAvatar(personId, asset, path ?? null);
      haptics.success();
      pulse.value = withSequence(withTiming(1.06, { duration: 130 }), withSpring(1, { damping: 9, stiffness: 240 }));
      refresh();
    } catch (e) {
      setPending(null);
      setProblem(e instanceof Error ? e.message : 'Couldn’t save that photo. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    sheet.current?.dismiss();
    setProblem(null);
    setPending(null);
    try {
      await removeAvatar(personId, path ?? null);
      haptics.success();
      refresh();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Couldn’t remove it. Try again.');
    }
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <PressScale
        to={0.96}
        accessibilityRole="button"
        accessibilityLabel={path || pending ? 'Change profile photo' : 'Add a profile photo'}
        onPress={() => sheet.current?.present()}
      >
        <Animated.View style={pulseStyle}>
          {pending ? (
            <View style={{ width: PROFILE_AVATAR, height: PROFILE_AVATAR, borderRadius: PROFILE_AVATAR / 2, overflow: 'hidden', backgroundColor: c.raised }}>
              <Image source={{ uri: pending }} style={{ width: PROFILE_AVATAR, height: PROFILE_AVATAR }} contentFit="cover" />
            </View>
          ) : (
            <Avatar name={name} size={PROFILE_AVATAR} path={path} />
          )}
          {busy ? (
            <Animated.View
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(200)}
              style={{ position: 'absolute', inset: 0, borderRadius: PROFILE_AVATAR / 2, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}
            >
              <ContourLoader size="sm" color="#F4F1EA" />
            </Animated.View>
          ) : null}
        </Animated.View>
        <View
          style={{
            position: 'absolute',
            right: 2,
            bottom: 2,
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: c.accent,
            borderWidth: 3,
            borderColor: c.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Camera size={15} strokeWidth={2} color={c.onAccent} />
        </View>
      </PressScale>
      {problem ? (
        <Text accessibilityLiveRegion="polite" style={{ color: c.disliked, fontFamily: fonts.ui, fontSize: 13, marginTop: 10, textAlign: 'center' }}>
          {problem}
        </Text>
      ) : null}
      <AvatarSheet
        ref={sheet}
        hasPhoto={Boolean(path || pending)}
        onLibrary={() => void pick('library')}
        onCamera={() => void pick('camera')}
        onRemove={() => void remove()}
      />
    </View>
  );
}
