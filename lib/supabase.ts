import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { supabaseEnvConfigured } from '@/lib/supabaseEnv';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase client when env is present; otherwise null and the app
 * falls back to local Zustand mock data (no credentials required).
 */
export const supabase: SupabaseClient | null =
  supabaseEnvConfigured(url, anonKey) && url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: AsyncStorage,
        },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;
