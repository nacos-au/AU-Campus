/** Shared limits, types and labels for article discussions. */

export const COMMENT_LIMITS = {
  minChars: 2,
  commentMax: 1200,
  replyMax: 600,
  noteMax: 300,
  editWindowMinutes: 10,
  /** Top-level comments and replies are revealed this many at a time. */
  pageSize: 5,
} as const;

export type CommentStatus = "visible" | "held" | "collapsed" | "removed";
export type CommentSort = "newest" | "oldest" | "liked";
export type CommentBadge = "writer" | "editor";

export const COMMENT_SORTS: { value: CommentSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "liked", label: "Most liked" },
];

/** A comment as returned by the public list RPCs (removed text is already blanked). */
export interface CommentData {
  id: string;
  article_id: string;
  parent_id: string | null;
  reply_to_id: string | null;
  reply_to_name: string | null;
  author_id: string | null;
  author_name: string;
  author_username: string | null;
  author_avatar: string | null;
  badge: CommentBadge | null;
  body: string;
  status: CommentStatus;
  deleted: boolean;
  removed_reason: string | null;
  like_count: number;
  reply_count: number;
  liked_by_me: boolean;
  is_mine: boolean;
  can_edit: boolean;
  edited_at: string | null;
  created_at: string;
}

export interface CommentPage {
  total: number;
  items: CommentData[];
}

export interface CommentMeta {
  count: number;
  locked: boolean;
  suspended: boolean;
  suspended_until: string | null;
  signed_in: boolean;
  staff: boolean;
}

export const REPORT_REASONS = [
  { value: "harassment", label: "Harassment or hate" },
  { value: "threat", label: "Threat or incitement" },
  { value: "private_info", label: "Private information" },
  { value: "impersonation", label: "Impersonation" },
  { value: "spam", label: "Spam or promotion" },
  { value: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export function reportReasonLabel(value: string): string {
  return REPORT_REASONS.find((r) => r.value === value)?.label ?? value;
}

export const SUSPEND_OPTIONS = [
  { value: "7d", label: "Suspend for 7 days" },
  { value: "indefinite", label: "Suspend indefinitely (until lifted)" },
] as const;

export type SuspendDuration = (typeof SUSPEND_OPTIONS)[number]["value"];

export const FILTER_CATEGORIES = [
  "threat",
  "spam",
  "sexual",
  "slur",
  "other",
] as const;

/** Anchor used for comment permalinks: `/article/x#c-<id>`. */
export function commentAnchor(id: string): string {
  return `c-${id}`;
}

export function parseCommentAnchor(hash: string): string | null {
  const m = /^#?c-([0-9a-f-]{36})$/i.exec(hash.trim());
  return m ? m[1].toLowerCase() : null;
}

/** Optional moderation contact shown on removed comments. */
export const MODERATION_EMAIL =
  process.env.NEXT_PUBLIC_MODERATION_EMAIL?.trim() || null;

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${Math.max(m, 1)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: d > 330 ? "numeric" : undefined,
  }).format(new Date(iso));
}
