import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json is the source of truth. The one override: a local-only iOS bundle
 * id (Personal Team signing) from APP_BUNDLE_ID in the gitignored .env, so
 * app.json never needs a local edit. EAS and CI don't see .env and get the
 * committed com.apex.trails.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const bundleIdentifier = process.env.APP_BUNDLE_ID?.trim();
  return {
    ...(config as ExpoConfig),
    ios: {
      ...config.ios,
      ...(bundleIdentifier ? { bundleIdentifier } : {}),
    },
  };
};
