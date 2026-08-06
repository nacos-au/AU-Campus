export type Role = "reader" | "writer" | "editor" | "admin";
export type ArticleStatus = "draft" | "submitted" | "published" | "rejected";
export type AdSlot = "leaderboard" | "sidebar" | "infeed";

export interface Profile {
  id: string;
  display_name: string;
  username?: string | null;
  role: Role;
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
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleWithMeta extends Article {
  sections: Pick<Section, "slug" | "name"> | null;
  profiles: Pick<Profile, "display_name"> | null;
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

export interface Ad {
  id: string;
  slot: AdSlot;
  image_url: string;
  target_url: string;
  label: string;
  active: boolean;
  created_at: string;
}
