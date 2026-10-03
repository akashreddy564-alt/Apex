import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  notificationPermissionRequired,
  shouldRequestNotificationPermission,
} from './notificationPermission.ts';

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

test('POST_NOTIFICATIONS is not requested when location was denied', () => {
  assert.equal(shouldRequestNotificationPermission('android', 33, false), false);
  assert.equal(shouldRequestNotificationPermission('android', 36, false), false);
  assert.equal(shouldRequestNotificationPermission('android', 33, true), true);
  assert.equal(shouldRequestNotificationPermission('android', 32, true), false);
  assert.equal(shouldRequestNotificationPermission('ios', 33, true), false);
});
