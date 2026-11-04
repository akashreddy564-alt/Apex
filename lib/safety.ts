import type { PersonSummary } from '@/lib/friendRules';
import { mapNotification, type AppNotification, type ReportReason } from '@/lib/safetyRules';
import { supabase } from '@/lib/supabase';

export * from '@/lib/safetyRules';

function client() {
  if (!supabase) throw new Error('This needs the online version of Apex.');
  return supabase;
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await client().rpc('my_notifications', { max_rows: 60 });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[])
    .map(mapNotification)
    .filter((row): row is AppNotification => row !== null);
}

export async function fetchUnreadCount(): Promise<number> {
  const { data, error } = await client().rpc('unread_notification_count');
  if (error) throw new Error(error.message);
  return typeof data === 'number' ? data : Number(data ?? 0);
}

export async function markNotificationsRead(): Promise<void> {
  const { error } = await client().rpc('mark_notifications_read');
  if (error) throw new Error(error.message);
}

export async function blockPerson(target: string): Promise<void> {
  const { error } = await client().rpc('block_user', { target });
  if (error) throw new Error(error.message);
}

export async function unblockPerson(target: string): Promise<void> {
  const { error } = await client().rpc('unblock_user', { target });
  if (error) throw new Error(error.message);
}

export async function fetchBlocked(): Promise<PersonSummary[]> {
  const { data, error } = await client().rpc('my_blocks');
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    username: String(row.username),
    display_name: String(row.display_name ?? row.username),
  }));
}

export interface ReportInput {
  person: string;
  reason: ReportReason;
  details?: string;
  post?: string | null;
  comment?: string | null;
}

export async function sendReport({ person, reason, details, post, comment }: ReportInput): Promise<void> {
  const { error } = await client().rpc('report_content', {
    person,
    reason,
    details: details?.trim() || null,
    post: post ?? null,
    comment: comment ?? null,
  });
  if (error) throw new Error(error.message);
}
