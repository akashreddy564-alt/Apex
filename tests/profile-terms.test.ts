import { mapProfile } from '@/lib/profile';

jest.mock('@/lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));

const base = { id: 'u1', username: 'maya_c', display_name: 'Maya', created_at: '' };

it('treats a missing terms column as not accepted in release builds', () => {
  expect(mapProfile(base, false)?.terms_accepted).toBe(false);
});

it('keeps the missing-column fallback for dev builds only', () => {
  expect(mapProfile(base, true)?.terms_accepted).toBe(true);
});

it('reads the column when 018 has run, in any build', () => {
  for (const dev of [true, false]) {
    expect(mapProfile({ ...base, terms_accepted_at: null }, dev)?.terms_accepted).toBe(false);
    expect(mapProfile({ ...base, terms_accepted_at: '2026-11-24T00:00:00Z' }, dev)?.terms_accepted).toBe(true);
  }
});
