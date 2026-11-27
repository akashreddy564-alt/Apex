import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json is the source of truth. The one override: a local-only iOS bundle
 * id (Personal Team signing) from APP_BUNDLE_ID in the gitignored .env, so
 * app.json never needs a local edit. EAS and CI don't see .env and get the
 * committed com.apex.trails.
 */
/** Public keys a store build can't work without. */
export const REQUIRED_PRODUCTION_ENV = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_MAPBOX_TOKEN',
] as const;

/**
 * EAS sets EAS_BUILD_PROFILE while it resolves this config. A production
 * build without these keys would ship a local-only app with no maps, so fail
 * the build instead.
 */
export function assertProductionEnv(env: NodeJS.ProcessEnv = process.env): void {
  if (env.EAS_BUILD_PROFILE !== 'production') return;
  const missing = REQUIRED_PRODUCTION_ENV.filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Production build is missing ${missing.join(', ')}. Set them with \`eas env:create --environment production\` (or eas env:set) and rebuild.`,
    );
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  assertProductionEnv();
  const bundleIdentifier = process.env.APP_BUNDLE_ID?.trim();
  // Personal Team signing can't carry the Sign in with Apple capability, and
  // Supabase only trusts the real bundle id, so local builds go without it.
  const appleSignIn = !bundleIdentifier;
  return {
    ...(config as ExpoConfig),
    ios: {
      ...config.ios,
      ...(bundleIdentifier ? { bundleIdentifier, usesAppleSignIn: false } : {}),
    },
    plugins: appleSignIn ? config.plugins : config.plugins?.filter((p) => p !== 'expo-apple-authentication'),
    extra: { ...config.extra, appleSignIn },
  };
};
