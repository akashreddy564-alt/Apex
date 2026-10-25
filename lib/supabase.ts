import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase client when env is present; otherwise null and the app
 * falls back to local Zustand mock data (no credentials required).
 */
// Expo web renders each page once in Node, where there's no storage.
const isServer = typeof window === 'undefined';

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: !isServer,
          autoRefreshToken: !isServer,
          // Only the browser can read the sign-in link itself; native uses useAuthLinks.
          detectSessionInUrl: !isServer && Platform.OS === 'web',
          storage: isServer ? undefined : AsyncStorage,
        },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;
