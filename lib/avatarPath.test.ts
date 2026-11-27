import assert from 'node:assert/strict';
import { test } from 'node:test';

import { avatarUrl, isAvatarPath, newAvatarPath } from './avatarPath.ts';

const uid = '7e570000-0000-4000-8000-000000000001';

test('newAvatarPath lands in the person’s folder and passes the migration check', () => {
  const path = newAvatarPath(uid, 'a1b2-c3!', 1_700_000_000_000);
  assert.ok(path.startsWith(`${uid}/`));
  assert.ok(isAvatarPath(path));
  assert.notEqual(path, newAvatarPath(uid, 'zz', 1_700_000_000_001));
});

test('isAvatarPath refuses anything outside the shape', () => {
  assert.equal(isAvatarPath(`${uid}/../x.jpg`), false);
  assert.equal(isAvatarPath(`${uid}/photo.png`), false);
  assert.equal(isAvatarPath(null), false);
});

test('avatarUrl builds the public URL, or null for no photo', () => {
  const path = `${uid}/abc.jpg`;
  assert.equal(
    avatarUrl('https://x.supabase.co/', path),
    `https://x.supabase.co/storage/v1/object/public/avatars/${path}`,
  );
  assert.equal(avatarUrl('https://x.supabase.co', null), null);
  assert.equal(avatarUrl(undefined, path), null);
});
