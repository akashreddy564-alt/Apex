const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'apex-recording-actions';

/**
 * expo-location's foreground-service notification has no action API.
 * On prebuild, add Pause and Finish actions that open apex://log.
 * This does not add ACCESS_BACKGROUND_LOCATION.
 */
function withRecordingNotification(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const file = path.join(
        config.modRequest.projectRoot,
        'node_modules/expo-location/android/src/main/java/expo/modules/location/services/LocationTaskService.kt',
      );
      if (!fs.existsSync(file)) return config;
      const source = fs.readFileSync(file, 'utf8');
      if (source.includes(MARKER)) return config;
      const needle = 'builder.setContentIntent(contentIntent)\n    }';
      if (!source.includes(needle)) return config;
      const insert = `${needle}

    // ${MARKER}
    val pause = Intent(Intent.ACTION_VIEW, android.net.Uri.parse("apex://log?recording=pause"))
    pause.setPackage(mParentContext.packageName)
    val finish = Intent(Intent.ACTION_VIEW, android.net.Uri.parse("apex://log?recording=finish"))
    finish.setPackage(mParentContext.packageName)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_IMMUTABLE else 0)
    builder.addAction(android.R.drawable.ic_media_pause, "Pause", PendingIntent.getActivity(this, 1, pause, flags))
    builder.addAction(android.R.drawable.ic_menu_close_clear_cancel, "Finish", PendingIntent.getActivity(this, 2, finish, flags))`;
      fs.writeFileSync(file, source.replace(needle, insert));
      return config;
    },
  ]);
}

module.exports = withRecordingNotification;
