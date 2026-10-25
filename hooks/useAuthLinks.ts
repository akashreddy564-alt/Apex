import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';

import { parseAuthLink } from '@/lib/authLink';
import { supabase } from '@/lib/supabase';

/**
 * Finishes sign-in when the email link opens the app. On web, supabase-js
 * reads the URL itself (`detectSessionInUrl`).
 */
export function useAuthLinks() {
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
