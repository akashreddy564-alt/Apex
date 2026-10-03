import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const {
  LIBRARY_SERVICE_NAME,
  mergeForegroundServiceType,
  readServiceTypes,
} = require('../plugins/withRecordingNotification.js');

const LIBRARY_XML = `
<manifest>
  <application>
    <service android:name=".OtherService" android:foregroundServiceType="camera" />
    <service
      android:name="${LIBRARY_SERVICE_NAME}"
      android:exported="false"
      android:foregroundServiceType="location" />
  </application>
</manifest>
`;

test('service type regex reads LocationTaskService, not the first service in the file', () => {
  assert.deepEqual(readServiceTypes(LIBRARY_XML, LIBRARY_SERVICE_NAME), ['location']);
  assert.deepEqual(readServiceTypes(LIBRARY_XML, '.OtherService'), ['camera']);
  assert.deepEqual(readServiceTypes(LIBRARY_XML, 'expo.modules.location.services.LocationTaskService'), []);
});

test('duplicate location is removed from the value and other types stay', () => {
  assert.equal(mergeForegroundServiceType('location|dataSync', ['location']), 'dataSync');
  assert.equal(mergeForegroundServiceType('location|location', []), 'location');
  assert.equal(mergeForegroundServiceType(undefined, []), 'location');
  assert.equal(mergeForegroundServiceType('location', ['location']), undefined);
  assert.equal(mergeForegroundServiceType(undefined, ['location']), undefined);
});
