const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'apex-recording-actions';

/**
 * Patches expo-location 57.0.20 only.
 * File: node_modules/expo-location/android/src/main/java/expo/modules/location/services/LocationTaskService.kt
 * Edits buildServiceNotification at the setContentIntent let-block, lines 89–90:
 *   builder.setContentIntent(contentIntent)
 *       }
 * Inserts Pause and Finish actions there, before `val iconsResId`.
 * Revisit this needle whenever expo-location is upgraded. The pin is exact.
 */
const LOCATION_TASK_SERVICE = path.join(
  'node_modules',
  'expo-location',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'location',
  'services',
  'LocationTaskService.kt',
);
const NEEDLE = 'builder.setContentIntent(contentIntent)\n    }';
const SERVICE_NAME = 'expo.modules.location.services.LocationTaskService';

function patchFailure(file, reason) {
  throw new Error(
    `withRecordingNotification: ${reason}\nFile: ${file}\nMissing needle:\n${NEEDLE}`,
  );
}

const LIBRARY_SERVICE_NAME = '.services.LocationTaskService';

function splitTypes(value) {
  return String(value || '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Types on one `<service>` element. Ignores the same attribute on other services. */
function readServiceTypes(xml, serviceName) {
  if (!xml || !serviceName) return [];
  const tags = xml.match(/<service\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const name = tag.match(/\bandroid:name="([^"]*)"/);
    if (!name || name[1] !== serviceName) continue;
    const types = tag.match(/\bandroid:foregroundServiceType="([^"]*)"/);
    return splitTypes(types ? types[1] : '');
  }
  return [];
}

/**
 * The manifest merger joins both sides with `|`.
 * Drop a value the library service already declares, including a repeated
 * `location|location`, and keep every other value on this attribute.
 * Location is written here only when the library service does not declare it.
 * Undefined means this side has no remaining value to write.
 */
function mergeForegroundServiceType(appValue, libraryTypes) {
  const library = new Set(libraryTypes);
  const seen = new Set();
  const next = [];
  for (const type of splitTypes(appValue)) {
    if (library.has(type) || seen.has(type)) continue;
    seen.add(type);
    next.push(type);
  }
  if (!library.has('location') && !seen.has('location')) next.push('location');
  return next.length > 0 ? next.join('|') : undefined;
}

function withRecordingNotification(config) {
  config = withAndroidManifest(config, (config) => {
    AndroidConfig.Permissions.ensurePermissions(config.modResults, [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_LOCATION',
      'android.permission.POST_NOTIFICATIONS',
    ]);
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    const services = application.service ?? [];
    let service = services.find((entry) => entry.$['android:name'] === SERVICE_NAME);
    if (!service) {
      service = { $: { 'android:name': SERVICE_NAME } };
      services.push(service);
      application.service = services;
    }
    service.$['android:exported'] = 'false';
    // Read only LocationTaskService. Another service's foregroundServiceType
    // must not decide this attribute.
    const libraryManifest = path.join(
      config.modRequest.projectRoot,
      'node_modules',
      'expo-location',
      'android',
      'src',
      'main',
      'AndroidManifest.xml',
    );
    const libraryXml = fs.existsSync(libraryManifest)
      ? fs.readFileSync(libraryManifest, 'utf8')
      : '';
    const libraryTypes = readServiceTypes(libraryXml, LIBRARY_SERVICE_NAME);
    const merged = mergeForegroundServiceType(
      service.$['android:foregroundServiceType'],
      libraryTypes,
    );
    // Keep the attribute whenever any type remains. Drop it only when every
    // token was a duplicate of the library service, so the merger does not
    // emit location|location from an empty or repeated value.
    if (merged) service.$['android:foregroundServiceType'] = merged;
    else delete service.$['android:foregroundServiceType'];
    return config;
  });

  return withDangerousMod(config, [
    'android',
    (config) => {
      const file = path.join(config.modRequest.projectRoot, LOCATION_TASK_SERVICE);
      if (!fs.existsSync(file)) patchFailure(file, 'target file was not found');
      const source = fs.readFileSync(file, 'utf8');
      if (source.includes(MARKER)) return config;
      if (!source.includes(NEEDLE)) patchFailure(file, 'needle was not found');
      const insert = `${NEEDLE}

    // ${MARKER}
    val pause = Intent(Intent.ACTION_VIEW, android.net.Uri.parse("apex://log?recording=pause"))
    pause.setPackage(mParentContext.packageName)
    val finish = Intent(Intent.ACTION_VIEW, android.net.Uri.parse("apex://log?recording=finish"))
    finish.setPackage(mParentContext.packageName)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_IMMUTABLE else 0)
    builder.addAction(android.R.drawable.ic_media_pause, "Pause", PendingIntent.getActivity(this, 1, pause, flags))
    builder.addAction(android.R.drawable.ic_menu_close_clear_cancel, "Finish", PendingIntent.getActivity(this, 2, finish, flags))`;
      fs.writeFileSync(file, source.replace(NEEDLE, insert));
      return config;
    },
  ]);
}

module.exports = withRecordingNotification;
module.exports.readServiceTypes = readServiceTypes;
module.exports.mergeForegroundServiceType = mergeForegroundServiceType;
module.exports.LIBRARY_SERVICE_NAME = LIBRARY_SERVICE_NAME;
