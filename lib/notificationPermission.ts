/** Shown on the location explainer on Android 13+ before the system prompts. */
export const RECORDING_NOTIFICATION_COPY =
  "You'll see a notification with Pause and Finish while you record.";

/** Shown on Record when POST_NOTIFICATIONS was not granted. Recording still runs. */
export const LOCK_SCREEN_NOTIFICATION_NOTE =
  'Turn on notifications to pause or finish from your lock screen.';

/**
 * Android 13 (API 33) is the first release that gates notifications on
 * POST_NOTIFICATIONS. iOS and older Android do not use this prompt.
 */
export function notificationPermissionRequired(os: string, version: string | number): boolean {
  return os === 'android' && Number(version) >= 33;
}

/** Location has to be granted before Apex asks for the recording notification. */
export function shouldRequestNotificationPermission(
  os: string,
  version: string | number,
  locationGranted: boolean,
): boolean {
  return locationGranted && notificationPermissionRequired(os, version);
}
