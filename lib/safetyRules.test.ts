import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mapNotification, notificationTarget, notificationText, shortAge, type AppNotification } from './safetyRules.ts';

const base = {
  id: 'n1', actor_id: 'u2', actor_name: 'Maya Chen', actor_username: 'maya',
  post_id: null, trail_name: null, group_id: null, group_name: null, comment_body: null,
  created_at: '2026-11-04T12:00:00Z', is_read: false,
};
const make = (row: Record<string, unknown>) => mapNotification({ ...base, ...row }) as AppNotification;

describe('mapNotification', () => {
  it('drops unknown kinds and missing ids', () => {
    assert.equal(mapNotification({ ...base, kind: 'poke' }), null);
    assert.equal(mapNotification({ ...base, kind: 'like', id: null }), null);
  });
});

describe('notificationText', () => {
  it('says what happened', () => {
    assert.equal(notificationText(make({ kind: 'friend_request' })), 'wants to be friends');
    assert.equal(notificationText(make({ kind: 'like', trail_name: 'Mount Si' })), 'liked your Mount Si hike');
    assert.equal(notificationText(make({ kind: 'comment', comment_body: 'Nice' })), 'commented: “Nice”');
    assert.equal(notificationText(make({ kind: 'passed', group_name: 'Desk hikers' })), 'passed you in Desk hikers this week');
    assert.equal(notificationText(make({ kind: 'group_join' })), 'joined your group');
  });
});

describe('notificationTarget', () => {
  it('opens the post, group, requests or person', () => {
    assert.deepEqual(notificationTarget(make({ kind: 'like', post_id: 'p1' })), { pathname: '/post/[id]', params: { id: 'p1' } });
    assert.deepEqual(notificationTarget(make({ kind: 'passed', group_id: 'g1' })), { pathname: '/group/[id]', params: { id: 'g1' } });
    assert.deepEqual(notificationTarget(make({ kind: 'friend_request' })), { pathname: '/friend-requests' });
    assert.deepEqual(notificationTarget(make({ kind: 'friend_accepted' })), { pathname: '/friend/[id]', params: { id: 'u2' } });
    assert.deepEqual(notificationTarget(make({ kind: 'like' })), { pathname: '/friend/[id]', params: { id: 'u2' } });
  });
});

describe('shortAge', () => {
  const now = new Date('2026-11-04T12:00:00Z');
  it('rounds down', () => {
    assert.equal(shortAge('2026-11-04T11:59:40Z', now), 'now');
    assert.equal(shortAge('2026-11-04T11:55:00Z', now), '5m');
    assert.equal(shortAge('2026-11-04T09:00:00Z', now), '3h');
    assert.equal(shortAge('2026-11-02T12:00:00Z', now), '2d');
    assert.equal(shortAge('bad', now), '');
  });
});
