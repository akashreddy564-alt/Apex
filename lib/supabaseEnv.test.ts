import assert from 'node:assert/strict';
import { test } from 'node:test';

import { supabaseEnvConfigured } from './supabaseEnv.ts';

test('missing supabase keys leave account and sync off', () => {
  assert.equal(supabaseEnvConfigured(undefined, undefined), false);
  assert.equal(supabaseEnvConfigured('', undefined), false);
  assert.equal(supabaseEnvConfigured(undefined, 'anon'), false);
  assert.equal(supabaseEnvConfigured('https://example.supabase.co', ''), false);
  assert.equal(supabaseEnvConfigured('', 'anon'), false);
  assert.equal(supabaseEnvConfigured('https://example.supabase.co', 'anon'), true);
});
