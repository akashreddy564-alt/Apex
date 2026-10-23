import '../global.css';

import { Anton_400Regular } from '@expo-google-fonts/anton';
import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { OpeningScreen } from '@/components/opening/OpeningScreen';
import { useOpeningPlace } from '@/hooks/useOpeningPlace';
import { useRemoteSync } from '@/hooks/useRemoteSync';
import { hydrateHike } from '@/lib/activeHike';
import { reconcileTracking } from '@/lib/locationTask';
import { colors, fonts, navTitle } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

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

  const [hikeReady] = useState(() => hydrateHike());
  const opening = useOpeningPlace(hikeReady);
  const [photoShown, setPhotoShown] = useState(false);
  const [openingDone, setOpeningDone] = useState(false);
  const onPhotoShown = useCallback(() => setPhotoShown(true), []);
  const onOpeningDone = useCallback(() => setOpeningDone(true), []);

  useEffect(() => {
    void hikeReady.then((hike) => {
      void reconcileTracking(Boolean(hike && hike.pausedAt == null));
    });
  }, [hikeReady]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  const fontsSettled = fontsLoaded || Boolean(fontError);
  const openingSettled =
    opening.status === 'skip' || (opening.status === 'show' && photoShown);

  useEffect(() => {
    if (fontsSettled && openingSettled) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsSettled, openingSettled]);

  if (!fontsSettled || opening.status === 'deciding') {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <BottomSheetModalProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.fg,
              headerTitleStyle: navTitle,
              headerBackTitleStyle: { fontFamily: fonts.ui },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="trail/[id]"
              options={{
                title: '',
                headerBackTitle: 'Back',
                // The hero photo runs under the header.
                headerTransparent: true,
                headerStyle: { backgroundColor: 'transparent' },
              }}
            />
            <Stack.Screen name="account" options={{ title: 'Settings' }} />
            <Stack.Screen
              name="credits"
              options={{ title: 'Credits', headerBackTitle: 'Settings' }}
            />
            <Stack.Screen
              name="delete-account"
              options={{ title: 'Delete account', headerBackTitle: 'Settings' }}
            />
          </Stack>
          {opening.status === 'show' && !openingDone ? (
            <OpeningScreen
              place={opening.place}
              photo={opening.photo}
              onReady={onPhotoShown}
              onDone={onOpeningDone}
            />
          ) : null}
        </BottomSheetModalProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
