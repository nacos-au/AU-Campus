/**
 * Newsroom capability matrix — the source of truth for which role can do what.
 * Keep this in sync with RLS policies in supabase/migrations.
 *
 * Hierarchy: reader < writer < editor < admin
 * Higher ranks inherit everything below them.
 */
import type { Role } from "@/lib/types";

export const ROLE_RANK: Record<Role, number> = {
  reader: 0,
  writer: 1,
  editor: 2,
  admin: 3,
};

export const ROLE_LABELS: Record<Role, string> = {
  reader: "Reader",
  writer: "Writer",
  editor: "Editor",
  admin: "Admin",
};

export type Capability =
  | "read_published"
  | "buy_editions"
  | "draft_own"
  | "submit_own"
  | "delete_own_draft"
  | "upload_covers"
  | "edit_any_article"
  | "publish"
  | "unpublish"
  | "feature"
  | "reject"
  | "manage_sections"
  | "manage_editions"
  | "manage_ads"
  | "preview_paid_editions"
  | "manage_roles"
  | "view_revenue";

const RANK_FOR: Record<Capability, Role> = {
  read_published: "reader",
  buy_editions: "reader",
  draft_own: "writer",
  submit_own: "writer",
  delete_own_draft: "writer",
  upload_covers: "writer",
  edit_any_article: "editor",
  publish: "editor",
  unpublish: "editor",
  feature: "editor",
  reject: "editor",
  manage_sections: "editor",
  manage_editions: "editor",
  manage_ads: "editor",
  preview_paid_editions: "editor",
  manage_roles: "admin",
  view_revenue: "admin",
};

export function can(role: Role | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[RANK_FOR[capability]];
}

export const ROLE_SUMMARIES: Record<Role, string> = {
  reader:
    "Read the paper, buy and view print editions, manage their own account library.",
  writer:
    "Everything a reader can do, plus write and edit their own drafts, submit for review, upload covers, and delete their own drafts.",
  editor:
    "Everything a writer can do, plus approve articles assigned to them, feature and unpublish, manage sections, paid editions, ads, talent, and forums. Own articles need another editor — unless they are the only editor.",
  admin:
    "Everything an editor can do, plus assign roles, reassign articles, and view sales. Own articles need another editor — unless they are the only admin/editor.",
};
