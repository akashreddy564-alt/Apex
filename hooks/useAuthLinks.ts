import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';

import { claimAuthCode, parseAuthLink } from '@/lib/authLink';
import { supabase } from '@/lib/supabase';
import { finishSignIn } from '@/stores/signInStore';

/**
 * Finishes sign-in when the email link opens the app. On web, supabase-js
 * reads the URL itself (`detectSessionInUrl`).
 */
export function useAuthLinks() {
  // Whatever finished a sign-in, the sign-in screen remembers how.
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') finishSignIn(session?.user.email, session?.user.app_metadata?.provider);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || Platform.OS === 'web') return;
    const client = supabase;
    const handle = async (url: string | null) => {
      const link = parseAuthLink(url);
      if (!link) return;
      if (link.kind === 'error') {
        Alert.alert('Sign-in link didn’t work', `${link.message}. Send a new link from Settings.`);
        return;
      }
      if (!claimAuthCode(link.code)) return;
      // Fails unless this phone asked for the link (PKCE code verifier).
      const { error } = await client.auth.exchangeCodeForSession(link.code);
      if (error) Alert.alert('Couldn’t sign in', error.message);
    };
    void Linking.getInitialURL().then(handle);
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handle(url);
    });
    return () => subscription.remove();
  }, []);
}
