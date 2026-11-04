/** Pure rules for notifications, reports and blocks. Matches 013_notifications_and_safety.sql. */

export type NotificationKind = 'friend_request' | 'friend_accepted' | 'group_join' | 'like' | 'comment' | 'passed';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  actorId: string;
  actorName: string;
  actorUsername: string;
  postId: string | null;
  trailName: string | null;
  groupId: string | null;
  groupName: string | null;
  commentBody: string | null;
  createdAt: string;
  read: boolean;
}

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'impersonation' | 'other';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'inappropriate', label: 'Inappropriate photo or words' },
  { value: 'spam', label: 'Spam' },
  { value: 'impersonation', label: 'Pretending to be someone else' },
  { value: 'other', label: 'Something else' },
];

export const REPORT_DETAILS_MAX = 1000;

const KINDS = new Set<string>(['friend_request', 'friend_accepted', 'group_join', 'like', 'comment', 'passed']);
const str = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 ? value : null);

export function mapNotification(row: Record<string, unknown>): AppNotification | null {
  const id = str(row.id);
  const actorId = str(row.actor_id);
  if (!id || !actorId || typeof row.kind !== 'string' || !KINDS.has(row.kind)) return null;
  const username = str(row.actor_username) ?? 'someone';
  return {
    id,
    kind: row.kind as NotificationKind,
    actorId,
    actorName: str(row.actor_name) ?? username,
    actorUsername: username,
    postId: str(row.post_id),
    trailName: str(row.trail_name),
    groupId: str(row.group_id),
    groupName: str(row.group_name),
    commentBody: str(row.comment_body),
    createdAt: String(row.created_at ?? ''),
    read: row.is_read === true,
  };
}

/** What the row says after the actor's name. */
export function notificationText(n: AppNotification): string {
  switch (n.kind) {
    case 'friend_request':
      return 'wants to be friends';
    case 'friend_accepted':
      return 'accepted your friend request';
    case 'group_join':
      return n.groupName ? `joined ${n.groupName}` : 'joined your group';
    case 'like':
      return n.trailName ? `liked your ${n.trailName} hike` : 'liked your hike';
    case 'comment':
      return n.commentBody
        ? `commented: “${n.commentBody}”`
        : n.trailName
          ? `commented on your ${n.trailName} hike`
          : 'commented on your hike';
    case 'passed':
      return n.groupName ? `passed you in ${n.groupName} this week` : 'passed you this week';
  }
}

export type NotificationTarget =
  | { pathname: '/post/[id]'; params: { id: string; comment?: string } }
  | { pathname: '/group/[id]'; params: { id: string } }
  | { pathname: '/friend/[id]'; params: { id: string } }
  | { pathname: '/friend-requests' };

/** Where tapping a notification goes. */
export function notificationTarget(n: AppNotification): NotificationTarget {
  if ((n.kind === 'like' || n.kind === 'comment') && n.postId) {
    return { pathname: '/post/[id]', params: n.kind === 'comment' ? { id: n.postId, comment: '0' } : { id: n.postId } };
  }
  if ((n.kind === 'group_join' || n.kind === 'passed') && n.groupId) {
    return { pathname: '/group/[id]', params: { id: n.groupId } };
  }
  if (n.kind === 'friend_request') return { pathname: '/friend-requests' };
  return { pathname: '/friend/[id]', params: { id: n.actorId } };
}

/** "now", "5m", "3h", "2d", "Oct 12". */
export function shortAge(iso: string, now: Date = new Date()): string {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return '';
  const minutes = Math.max(0, Math.floor((now.getTime() - at) / 60000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
