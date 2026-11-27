import '../global.css';

import { Anton_400Regular } from '@expo-google-fonts/anton';
import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Appearance, View } from 'react-native';
import { vars } from 'nativewind';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Onboarding } from '@/components/opening/Onboarding';
import { OpeningScreen } from '@/components/opening/OpeningScreen';
import { PeakIntro } from '@/components/opening/PeakIntro';
import { useAuthLinks } from '@/hooks/useAuthLinks';
import { useColors } from '@/hooks/useColors';
import { useHomeTour } from '@/hooks/useHomeTour';
import { HomeTour } from '@/components/tour/HomeTour';
import { useOpeningPlace } from '@/hooks/useOpeningPlace';
import { useMyProfile } from '@/hooks/useProfile';
import { usePrefetchFeed } from '@/hooks/useFeed';
import { useNudges } from '@/hooks/useNudges';
import { useRemoteSync } from '@/hooks/useRemoteSync';
import { hydrateHike } from '@/lib/activeHike';
import { applyNativeScheme } from '@/lib/appearance';
import { startLiveActivitySync } from '@/lib/liveActivity';
import { startWeekWidgetSync } from '@/lib/weekWidgetSync';
import { reconcileTracking } from '@/lib/locationTask';
import { useOnboarding, useOnboardingHydrated } from '@/stores/onboardingStore';
import { useSettings } from '@/stores/settingsStore';
import { cssVars, fonts, navTitle } from '@/theme/tokens';
import { watchConnectivity } from '@/lib/connectivity';
import { persistOptions, queryClient } from '@/lib/queryClient';

watchConnectivity();

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * Links that open a screen directly (sign-in links to /account, invite links
 * to /friend/<id>) still get the tabs underneath, so there's always a way back.
 */
export const unstable_settings = {
  anchor: '(tabs)',
};

/**
 * After first-launch onboarding and the intro: someone who just made an
 * account picks a username (and confirms their age), and a sign-in link that
 * opened Settings underneath is cleared away.
 */
function AfterOnboarding() {
  const router = useRouter();
  const { session, profile, loading } = useMyProfile();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || loading) return;
    done.current = true;
    if (router.canDismiss()) router.dismissAll();
    if (session && !profile) router.push('/username');
  }, [loading, profile, router, session]);
  return null;
}

/** Reminders need the router, so they start once the navigator is up. */
function NudgeKeeper() {
  useNudges();
  usePrefetchFeed();
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    [fonts.display]: BricolageGrotesque_700Bold,
    [fonts.displayExtraBold]: BricolageGrotesque_800ExtraBold,
    [fonts.ui]: Inter_400Regular,
    [fonts.uiMedium]: Inter_500Medium,
    [fonts.uiSemibold]: Inter_600SemiBold,
    [fonts.poster]: Anton_400Regular,
  });
  useRemoteSync();
  useAuthLinks();
  const appearance = useSettings((s) => s.appearance);
  const c = useColors();

  useEffect(() => {
    // Native pickers, keyboards and alerts follow the app, not the phone.
    applyNativeScheme(appearance, Appearance);
  }, [appearance]);

  const [hikeReady] = useState(() => hydrateHike());
  const opening = useOpeningPlace(hikeReady);
  const [photoShown, setPhotoShown] = useState(false);
  const [openingDone, setOpeningDone] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const onPhotoShown = useCallback(() => setPhotoShown(true), []);
  const onOpeningDone = useCallback(() => setOpeningDone(true), []);
  const onIntroDone = useCallback(() => setIntroDone(true), []);
  // First launch: onboarding and sign-up come before the intro. Launches from
  // a link (opening 'skip') never show it and don't use it up.
  const onboardingLoaded = useOnboardingHydrated();
  const onboardingSeen = useOnboarding((s) => s.seen);
  const onboardingShown = useRef(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  // Decided once per launch: marking it seen on the sign-up step must not close it.
  const wantsOnboarding = useRef<boolean | null>(null);
  if (wantsOnboarding.current === null && onboardingLoaded && opening.status !== 'deciding') {
    wantsOnboarding.current = opening.status === 'show' && !onboardingSeen;
  }
  const onboarding = wantsOnboarding.current === true && !onboardingDone;
  if (onboarding) onboardingShown.current = true;
  const onOnboardingDone = useCallback(() => setOnboardingDone(true), []);
  // The tour follows the opening photo on a normal first launch (not a sign-in or invite link).
  const tour = useHomeTour(opening.status === 'show' && openingDone);

  useEffect(() => {
    void hikeReady.then((hike) => {
      void reconcileTracking(Boolean(hike && hike.pausedAt == null));
    });
  }, [hikeReady]);

  // Lock Screen and Dynamic Island while a hike records (iOS builds with the widget extension).
  useEffect(() => startLiveActivitySync(hikeReady), [hikeReady]);

  // The Week ring home-screen widget follows hikes and the goal.
  useEffect(() => startWeekWidgetSync(), []);

  const fontsSettled = fontsLoaded || Boolean(fontError);
  const openingSettled = opening.status === 'skip' || (opening.status === 'show' && photoShown);

  useEffect(() => {
    // Onboarding doesn't wait for the opening photo; the intro after it does.
    if (fontsSettled && onboardingLoaded && (onboarding || openingSettled)) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsSettled, onboarding, onboardingLoaded, openingSettled]);

  if (!fontsSettled || opening.status === 'deciding' || !onboardingLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[{ flex: 1, backgroundColor: c.bg }, vars(cssVars(c))]}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={persistOptions}
          // Writes queued while offline (or before the app closed) go out once the cache is back.
          onSuccess={() => void queryClient.resumePausedMutations()}
        >
          <BottomSheetModalProvider>
            <StatusBar style={appearance === 'dark' ? 'light' : 'dark'} />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: c.bg },
                headerTintColor: c.fg,
                headerTitleStyle: { ...navTitle, color: c.fg },
                headerBackTitleStyle: { fontFamily: fonts.ui },
                headerShadowVisible: false,
                contentStyle: { backgroundColor: c.bg },
                // Swipe back from anywhere on the screen, not just the left edge.
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Home' }} />
              <Stack.Screen
                name="trail/[id]"
                options={{
                  title: '',
                  headerBackTitle: 'Back',
                  // The hero photo runs under the header.
                  headerTransparent: true,
                  headerStyle: { backgroundColor: 'transparent' },
                  // The elevation scrubber drags sideways; back is the edge swipe here.
                  fullScreenGestureEnabled: false,
                }}
              />
              <Stack.Screen name="trails" options={{ title: '', headerBackTitle: 'Home' }} />
              <Stack.Screen name="account" options={{ title: 'Settings' }} />
              <Stack.Screen name="username" options={{ title: '', headerBackTitle: 'Back' }} />
              <Stack.Screen name="add-friends" options={{ title: 'Add friends', headerBackTitle: 'Social' }} />
              <Stack.Screen name="friend-requests" options={{ title: 'Friend requests', headerBackTitle: 'Social' }} />
              {/* Photo pagers swipe sideways on these two; back is the edge swipe. */}
              <Stack.Screen name="friend/[id]" options={{ title: '', headerBackTitle: 'Back', fullScreenGestureEnabled: false }} />
              <Stack.Screen name="follows/[id]" options={{ title: 'People', headerBackTitle: 'Back' }} />
              <Stack.Screen name="post/[id]" options={{ title: 'Hike', headerBackTitle: 'Home', fullScreenGestureEnabled: false }} />
              <Stack.Screen name="create-group" options={{ title: 'New group', headerBackTitle: 'Social' }} />
              <Stack.Screen name="join-group" options={{ title: 'Join a group', headerBackTitle: 'Social' }} />
              <Stack.Screen name="group/[id]" options={{ title: '', headerBackTitle: 'Social' }} />
              <Stack.Screen name="verify-org" options={{ title: 'School or work', headerBackTitle: 'Social' }} />
              <Stack.Screen name="org/[id]" options={{ title: '', headerBackTitle: 'Social' }} />
              <Stack.Screen name="notifications" options={{ title: 'Notifications', headerBackTitle: 'Home' }} />
              <Stack.Screen name="report" options={{ title: 'Report', presentation: 'modal' }} />
              <Stack.Screen name="blocked" options={{ title: 'Blocked people', headerBackTitle: 'Settings' }} />
              <Stack.Screen name="goal" options={{ title: 'Weekly goal', headerBackTitle: 'Back' }} />
              <Stack.Screen name="challenge/[key]" options={{ title: '', headerBackTitle: 'Home' }} />
              <Stack.Screen
                name="flyover/[logId]"
                options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }}
              />
              <Stack.Screen
                name="credits"
                options={{ title: 'Credits', headerBackTitle: 'Settings' }}
              />
              <Stack.Screen
                name="delete-account"
                options={{
                  title: 'Delete account',
                  headerBackTitle: 'Settings',
                }}
              />
            </Stack>
            <NudgeKeeper />
            {opening.status === 'show' && !openingDone ? (
              <OpeningScreen
                place={opening.place}
                photo={opening.photo}
                onReady={onPhotoShown}
                onDone={onOpeningDone}
                held={!introDone}
              />
            ) : null}
            {tour.show ? <HomeTour onDone={tour.done} /> : null}
            {/* Takes over from the splash once it hides, then opens onto the photo above. */}
            {opening.status === 'show' && !introDone ? (
              <PeakIntro play={fontsSettled && openingSettled && !onboarding} onDone={onIntroDone} />
            ) : null}
            {onboarding ? <Onboarding onDone={onOnboardingDone} /> : null}
            {onboardingShown.current && introDone ? <AfterOnboarding /> : null}
          </BottomSheetModalProvider>
        </PersistQueryClientProvider>
      </View>
    </GestureHandlerRootView>
  );
}
