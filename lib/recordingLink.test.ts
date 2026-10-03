import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { recordingLinkPlan } from './recordingLink.ts';

describe('recording link', () => {
  it('holds a finish link until the saved hike has loaded', () => {
    assert.deepEqual(recordingLinkPlan({ param: 'finish', hydrated: false, tracking: false }), {
      action: null,
      clear: false,
    });
  });

  it('opens finish once the saved hike is tracking, then clears the param', () => {
    assert.deepEqual(recordingLinkPlan({ param: 'finish', hydrated: true, tracking: true }), {
      action: 'finish',
      clear: true,
    });
  });

  it('pauses once the saved hike is tracking, then clears the param', () => {
    assert.deepEqual(recordingLinkPlan({ param: 'pause', hydrated: true, tracking: true }), {
      action: 'pause',
      clear: true,
    });
  });

  it('drops the link when hydration finds no hike', () => {
    assert.deepEqual(recordingLinkPlan({ param: 'finish', hydrated: true, tracking: false }), {
      action: null,
      clear: true,
    });
    assert.deepEqual(recordingLinkPlan({ param: 'pause', hydrated: true, tracking: false }), {
      action: null,
      clear: true,
    });
  });

  it('does nothing after the param has been cleared', () => {
    assert.deepEqual(recordingLinkPlan({ param: undefined, hydrated: true, tracking: true }), {
      action: null,
      clear: false,
    });
  });
});
