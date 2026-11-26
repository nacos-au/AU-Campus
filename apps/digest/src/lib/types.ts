export type Role = "reader" | "writer" | "editor" | "admin";
export type ArticleStatus =
  | "draft"
  | "awaiting_editor"
  | "awaiting_writer"
  | "published"
  | "scheduled"
  | "archived"
  | "withdrawn";

/** Author credit only — series is a separate attachment. */
export type BylineMode = "personal" | "alias";

export interface ArticleSeries {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}
export type AdSlot = "leaderboard" | "sidebar" | "infeed";
export type WeeklyIssueStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "archived";
export type WeeklySlotKind = "lead" | "second" | "rail" | "inside";

/** Public byline desk title — never admin. */
export type DeskCredit = "writer" | "editor";

export interface Profile {
  id: string;
  display_name: string;
  username?: string | null;
  email?: string | null;
  bio?: string | null;
  /** Public URL in the `avatars` bucket — shown small only, never full-view. */
  avatar_url?: string | null;
  /**
   * Public credit line on articles: writer | editor only.
   * Independent of Admin Mode / elevated role.
   */
  desk_credit?: DeskCredit | null;
  role: Role;
  /** Underlying newsroom ladder before Admin Mode elevation. */
  base_role?: Role;
  /** Cross-platform owner — elevated powers only while Admin Mode is on. */
  is_super_admin?: boolean;
  /** True when Admin Mode is on and this account may elevate. */
  elevated?: boolean;
  /** Super admin or digest app_roles admin — may toggle Admin Mode. */
  can_elevate?: boolean;
  verification_level?: "soft" | "verified";
  forum_karma?: number;
  matric_number?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  created_at: string;
}

export interface Section {
  id: number;
  slug: string;
  name: string;
  position: number;
}

export interface Article {
  id: string;
  slug: string;
  /** Stable 8-char public id for /a/{short_code}/{stem} URLs. */
  short_code?: string | null;
  title: string;
  dek: string | null;
  body: unknown; // Tiptap JSON document
  cover_url: string | null;
  /** Optional cover description — shown via ImageInfo; also used as alt when set. */
  cover_caption?: string | null;
  section_id: number;
  author_id: string;
  language: string;
  status: ArticleStatus;
  featured: boolean;
  breaking?: boolean;
  editor_note: string | null;
  assigned_editor_id?: string | null;
  byline?: string | null;
  byline_mode?: BylineMode;
  /** @deprecated Prefer series_id / article_series */
  series_key?: string | null;
  series_id?: string | null;
  like_count?: number;
  /** Visible + collapsed comments; maintained by DB triggers. */
  comment_count?: number;
  /** When true, existing comments stay readable but no new ones are accepted. */
  comments_locked?: boolean;
  save_count?: number;
  review_lock_by?: string | null;
  review_lock_at?: string | null;
  sponsored_by?: string | null;
  /** Set when a post-publish edit is approved — public “Updated” label. */
  content_updated_at?: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleCollaborator {
  user_id: string;
  credit_order: number;
  profiles?: (Pick<Profile, "display_name" | "username"> &
    Partial<Pick<Profile, "avatar_url" | "desk_credit" | "role">>) | null;
}

export interface ArticleWithMeta extends Article {
  sections: Pick<Section, "slug" | "name"> | null;
  profiles: (Pick<Profile, "display_name" | "username"> &
    Partial<Pick<Profile, "avatar_url" | "desk_credit" | "role">>) | null;
  article_series?: Pick<ArticleSeries, "id" | "slug" | "title"> | null;
  article_collaborators?: ArticleCollaborator[] | null;
  assignee?: Pick<Profile, "display_name"> | null;
}

export type TalentDiscipline =
  | "design"
  | "development"
  | "writing"
  | "debate"
  | "other";

export interface TalentSpotlight {
  id: string;
  profile_id: string;
  discipline: TalentDiscipline;
  headline: string;
  blurb: string | null;
  published: boolean;
  created_at: string;
  profiles?: Pick<Profile, "display_name" | "username" | "bio"> | null;
}

export type ForumStatus = "visible" | "hidden" | "removed";

export interface ForumCategory {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  position: number;
}

export interface ForumThread {
  id: string;
  category_id: number;
  author_id: string;
  title: string;
  body: string;
  status: ForumStatus;
  score: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, "display_name" | "username"> | null;
  forum_categories?: Pick<ForumCategory, "slug" | "name"> | null;
}

export interface ForumPost {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  status: ForumStatus;
  score: number;
  created_at: string;
  profiles?: Pick<Profile, "display_name" | "username"> | null;
}

export interface Edition {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  issue_date: string;
  price_kobo: number;
  published: boolean;
  created_at: string;
}

export interface Purchase {
  id: string;
  user_id: string;
  edition_id: string;
  reference: string;
  amount_kobo: number;
  paid_at: string;
}

export type AdStatus =
  | "pending_payment"
  | "pending_review"
  | "approved"
  | "rejected";

export interface Ad {
  id: string;
  slot: AdSlot;
  image_url: string;
  target_url: string;
  label: string;
  active: boolean;
  created_at: string;
  advertiser_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  weight?: number;
  price_kobo?: number;
  paid_at?: string | null;
  paystack_reference?: string | null;
  impressions?: number;
  clicks?: number;
  status?: AdStatus;
}

export interface ReviewComment {
  id: string;
  article_id: string;
  author_id: string;
  body: string;
  anchor: {
    quote: string;
    prefix?: string;
    suffix?: string;
  } | null;
  resolved?: boolean;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at: string;
  profiles?: Pick<Profile, "display_name"> | null;
}

export type FrontPageKind =
  | "page_one"
  | "breaking"
  | "top_news"
  | "section_highlight";

export interface FrontPageSlot {
  id: string;
  kind: FrontPageKind;
  article_id: string;
  section_id: number | null;
  position: number;
  updated_at: string;
}

export interface AppNotification {
  id: string;
  type: string;
  article_id: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface RevisionPayload {
  title: string;
  dek: string | null;
  body: unknown;
  cover_url: string | null;
  cover_caption?: string | null;
  byline: string | null;
  byline_mode?: BylineMode;
  series_id?: string | null;
  sponsored_by?: string | null;
  section_id: number;
  language: string;
}

export interface WeeklyIssue {
  id: string;
  week_start: string;
  title: string;
  status: WeeklyIssueStatus;
  scheduled_at: string | null;
  published_at: string | null;
  intro?: string | null;
  intro_byline?: string | null;
  /** Freeform board document — see lib/weekly-layout.ts */
  layout?: unknown;
  created_at: string;
  updated_at: string;
}

export interface WeeklyIssueSlot {
  id: string;
  issue_id: string;
  slot: WeeklySlotKind;
  position: number;
  article_id: string;
  section_id: number | null;
  teaser?: string | null;
}

export interface CampusWord {
  id: string;
  word: string;
  definition: string;
  example?: string | null;
  active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CampusFact {
  id: string;
  question: string;
  answer: string;
  active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

/** Row from writer_engagement_board() — newsroom motivation board. */
export interface WriterEngagementRow {
  user_id: string;
  display_name: string;
  username: string | null;
  live_articles: number;
  likes_received: number;
  saves_received: number;
}
