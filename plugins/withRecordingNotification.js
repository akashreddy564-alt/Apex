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
    // expo-location's own manifest already sets foregroundServiceType="location".
    // Writing it again makes the merger concatenate "location|location".
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
    const libraryTypes = (libraryXml.match(/android:foregroundServiceType="([^"]*)"/) || [, ''])[1]
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);
    if (libraryTypes.includes('location')) {
      delete service.$['android:foregroundServiceType'];
    } else {
      const current = String(service.$['android:foregroundServiceType'] || '')
        .split('|')
        .map((part) => part.trim())
        .filter(Boolean);
      if (!current.includes('location')) current.push('location');
      service.$['android:foregroundServiceType'] = [...new Set(current)].join('|');
    }
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
