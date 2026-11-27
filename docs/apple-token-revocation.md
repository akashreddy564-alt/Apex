# Sign in with Apple: revoking on account deletion

App Store guideline 5.1.1(v): when someone deletes an account that used Sign in with Apple, the app must revoke their Apple tokens. Apex does this through the `apple-token` Edge Function.

## How it works

1. **Sign-in** (`lib/socialAuth.ts`): after Supabase accepts the Apple identity token, the app sends Apple's one-time `authorizationCode` to `apple-token` (`{ action: 'store' }`). The function signs a client-secret JWT with the Apple key, trades the code at `https://appleid.apple.com/auth/token` for a refresh token, checks that the token's `sub` matches the person's Apple identity, and saves it with `save_apple_token`. If this step fails, sign-in still works.
2. **Storage** (migration `032_apple_tokens.sql`): the token is kept in `apex_private.apple_tokens`. Only the service role can reach it, through `save_apple_token`, `apple_token` and `forget_apple_token`. The row is removed with the auth user.
3. **Deletion** (`app/delete-account.tsx`): for accounts that use Apple, the app calls `apple-token` (`{ action: 'revoke' }`) after deleting photos and before `delete_own_account`. The function posts the token to `https://appleid.apple.com/auth/revoke`. If Apple reports the token is already invalid (`invalid_grant`), that counts as revoked. If there is no saved token, deletion goes ahead. If Apple can't be reached or the secrets are missing, deletion stops and the person sees a message to try again.

## Setup steps for the owner

On 2026-11-27, migration 032 was applied and `apple-token` (v1) was deployed to project `sokcfkoogbniifrifyti`. Steps 1–3 and 6 are still to do. Until the secrets are set, saving a token fails quietly and deletion goes ahead, because no Apple tokens are saved.

1. **Make the key.** Go to Apple Developer → Certificates, IDs & Profiles → Keys → **+**. Tick **Sign in with Apple**, configure it with the primary App ID `com.apex.trails`, then save and download the `.p8` file. You can only download it once. Note the **Key ID**.
2. **Find the Team ID.** It's under Membership details, and it's 10 characters.
3. **Set the function secrets** (Supabase dashboard → Edge Functions → Secrets, or the CLI):

   ```bash
   supabase secrets set APPLE_TEAM_ID=XXXXXXXXXX APPLE_KEY_ID=YYYYYYYYYY
   ```

   ```bash
   supabase secrets set APPLE_PRIVATE_KEY="$(cat AuthKey_YYYYYYYYYY.p8)"
   ```

   `APPLE_PRIVATE_KEY` is the whole `.p8` file, including the BEGIN/END lines. Real line breaks and literal `\n` both work.
   `APPLE_CLIENT_ID` is optional and defaults to `com.apex.trails`. It must be the iOS bundle id, not a Services ID, because native sign-in codes are issued to the bundle id.
4. **Apply the migration:** `supabase db push`, or run `supabase/migrations/032_apple_tokens.sql` in the SQL editor.
5. **Deploy the function:**

   ```bash
   supabase functions deploy apple-token
   ```

6. **Check it on a phone.** Use a build with the real bundle id, since Apple sign-in is off for Personal Team builds. Sign in with Apple, then confirm that a row appears in `apex_private.apple_tokens`. Delete the account, then confirm that Apex has disappeared from Settings → Apple ID → Sign in with Apple on that phone.

## Notes

- Accounts that signed in with Apple before this shipped have no saved token, so deletion can't revoke them. A token is saved only after they sign out and sign in with Apple again. The app isn't released yet, so this affects test accounts only.
- The authorization code lasts about five minutes and works only once, so it's sent right after sign-in.
