// org-verify: emails a 6-digit code to a school or work address.
//
// The app calls this with the signed-in person's token and { email }. We
// check who they are, ask the database for a code (issue_org_code, which only
// the service role may call, so the app can never read a code itself), and
// send it with Resend. The app then checks the code with confirm_org_code().
//
// Secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY   a Resend API key
//   ORG_EMAIL_FROM   the sender, e.g. "Apex <verify@yourdomain.com>"
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided.
//
// Deploy: supabase functions deploy org-verify

import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

function codeEmailHtml(code: string): string {
  const safe = code.replace(/[^0-9]/g, '');
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f1ea;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1b1d1c">
<div style="max-width:440px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px">
<p style="margin:0 0 6px;font-size:15px;color:#5b5f5a">Your Apex code is</p>
<p style="margin:0 0 18px;font-size:34px;font-weight:700;letter-spacing:6px">${safe}</p>
<p style="margin:0 0 12px;font-size:15px;line-height:22px">Enter it in Apex to join your school or company board. It works for 15 minutes.</p>
<p style="margin:0;font-size:13px;line-height:19px;color:#5b5f5a">Apex keeps only the part after the @, never your address. If you didn’t ask for this, ignore this email.</p>
</div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Use POST' });

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('ORG_EMAIL_FROM');
  if (!url || !anon || !service) return reply(500, { error: 'The server isn’t set up yet.' });
  if (!resendKey || !from) return reply(503, { error: 'Email verification isn’t switched on yet. Try again later.' });

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return reply(401, { error: 'Sign in first.' });
  const asUser = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userData, error: userError } = await asUser.auth.getUser(token);
  if (userError || !userData.user) return reply(401, { error: 'Sign in again.' });

  let email = '';
  try {
    const body = await req.json();
    email = typeof body?.email === 'string' ? body.email.trim().slice(0, 254) : '';
  } catch {
    return reply(400, { error: 'Send an email address.' });
  }
  if (!email) return reply(400, { error: 'Send an email address.' });

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: code, error } = await admin.rpc('issue_org_code', { person: userData.user.id, email });
  if (error) {
    const limited = error.message.startsWith('rate_limited:');
    return reply(limited ? 429 : 400, {
      error: limited ? 'That’s a few codes already. Wait a little and try again.' : error.message,
    });
  }

  const sent = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `${code} is your Apex code`,
      text:
        `Your Apex code is ${code}.\n\n` +
        `Enter it in Apex to join your school or company board. It works for 15 minutes.\n\n` +
        `Apex keeps only the part after the @, never your address. If you didn’t ask for this, ignore this email.`,
      // A plain HTML part next to the text one. Mail filters trust a normal two-part
      // message more than bare text. No images, links or tracking.
      html: codeEmailHtml(String(code)),
    }),
  });
  if (!sent.ok) return reply(502, { error: 'We couldn’t send the email. Check the address and try again.' });

  return reply(200, { ok: true });
});
