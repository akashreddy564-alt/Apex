/** True only when both public Supabase env values are present. */
export function supabaseEnvConfigured(
  url: string | undefined,
  anonKey: string | undefined,
): boolean {
  return Boolean(url && anonKey);
}
