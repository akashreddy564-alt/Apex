import assert from 'node:assert/strict';
import { test } from 'node:test';

import { notificationPermissionRequired } from './notificationPermission.ts';

test('POST_NOTIFICATIONS is requested only on Android 13 and newer', () => {
  assert.equal(notificationPermissionRequired('android', 33), true);
  assert.equal(notificationPermissionRequired('android', 36), true);
  assert.equal(notificationPermissionRequired('android', '33'), true);
  assert.equal(notificationPermissionRequired('android', 32), false);
  assert.equal(notificationPermissionRequired('android', 0), false);
  assert.equal(notificationPermissionRequired('ios', 33), false);
  assert.equal(notificationPermissionRequired('ios', '17.0'), false);
  assert.equal(notificationPermissionRequired('web', 33), false);
});
