export type Role = "reader" | "writer" | "editor" | "admin";
export type ArticleStatus =
  | "draft"
  | "awaiting_editor"
  | "awaiting_writer"
  | "published";
export type AdSlot = "leaderboard" | "sidebar" | "infeed";

export interface Profile {
  id: string;
  display_name: string;
  username?: string | null;
  bio?: string | null;
  role: Role;
  /** Cross-platform owner — treated as Digest admin everywhere */
  is_super_admin?: boolean;
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
  title: string;
  dek: string | null;
  body: unknown; // Tiptap JSON document
  cover_url: string | null;
  section_id: number;
  author_id: string;
  language: string;
  status: ArticleStatus;
  featured: boolean;
  editor_note: string | null;
  assigned_editor_id?: string | null;
  byline?: string | null;
  like_count?: number;
  sponsored_by?: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleWithMeta extends Article {
  sections: Pick<Section, "slug" | "name"> | null;
  profiles: Pick<Profile, "display_name" | "username"> | null;
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
  anchor: { quote: string } | null;
  created_at: string;
  profiles?: Pick<Profile, "display_name"> | null;
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
  byline: string | null;
  sponsored_by?: string | null;
  section_id: number;
  language: string;
}
