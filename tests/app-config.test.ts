import { assertProductionEnv } from '../app.config';

const KEYS = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  EXPO_PUBLIC_MAPBOX_TOKEN: 'pk.x',
};

it('fails a production EAS build that is missing a public key', () => {
  expect(() =>
    assertProductionEnv({ EAS_BUILD_PROFILE: 'production', ...KEYS, EXPO_PUBLIC_MAPBOX_TOKEN: ' ' }),
  ).toThrow(/EXPO_PUBLIC_MAPBOX_TOKEN/);
  expect(() => assertProductionEnv({ EAS_BUILD_PROFILE: 'production' })).toThrow(
    /SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_MAPBOX_TOKEN/,
  );
});

it('lets complete production builds and every other profile through', () => {
  expect(() => assertProductionEnv({ EAS_BUILD_PROFILE: 'production', ...KEYS })).not.toThrow();
  expect(() => assertProductionEnv({ EAS_BUILD_PROFILE: 'preview' })).not.toThrow();
  expect(() => assertProductionEnv({})).not.toThrow();
});
