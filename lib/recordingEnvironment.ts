/**
 * Background location updates need a dev build.
 * Expo Go (`storeClient`) and web can only record while the app is open.
 */
export function backgroundRecordingAvailable(
  os: string,
  executionEnvironment: string | null | undefined,
): boolean {
  if (os === 'web') return false;
  return executionEnvironment !== 'storeClient';
}
