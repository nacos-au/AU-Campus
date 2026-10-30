"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/articles";
import { uploadCover } from "@/lib/uploads";
import { locales, localeNames } from "@/i18n/locales";
import type { Article, Profile, Section } from "@/lib/types";

const EMPTY_DOC = { type: "doc", content: [] };

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
        active ? "bg-ink text-paper" : "hover:bg-rule"
      }`}
    >
      {children}
    </button>
  );
}

export function ArticleForm({
  article,
  userId,
  isStaff = false,
}: {
  article: Article | null;
  userId: string;
  isStaff?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [title, setTitle] = useState(article?.title ?? "");
  const [dek, setDek] = useState(article?.dek ?? "");
  const [sectionId, setSectionId] = useState<number | "">(
    article?.section_id ?? ""
  );
  const [language, setLanguage] = useState(article?.language ?? "en");
  const [coverUrl, setCoverUrl] = useState(article?.cover_url ?? "");
  const [assignedEditorId, setAssignedEditorId] = useState(
    article?.assigned_editor_id ?? ""
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: sections = [] } = useQuery({
    queryKey: ["sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("*")
        .order("position");
      if (error) throw error;
      return data as Section[];
    },
  });

  const { data: editors = [] } = useQuery({
    queryKey: ["newsroom-editors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, role, is_super_admin")
        .or("role.eq.editor,role.eq.admin,is_super_admin.eq.true")
        .order("display_name");
      if (error) throw error;
      return (data as Pick<Profile, "id" | "display_name" | "username">[]).filter(
        (p) => p.id !== userId
      );
    },
  });

  const editor = useEditor({
    extensions: [StarterKit],
    content: article?.body ?? EMPTY_DOC,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "article-body" },
    },
  });

  const save = useMutation({
    mutationFn: async (action: "draft" | "submit") => {
      if (!title.trim()) throw new Error("A headline is required.");
      if (!sectionId) throw new Error("Pick a section.");

      let status: "draft" | "submitted" | "published";
      if (action === "submit") {
        if (!assignedEditorId) throw new Error("Assign a different editor.");
        if (assignedEditorId === userId) {
          throw new Error("Assign a different editor.");
        }
        status = "submitted";
      } else if (article?.status === "published" && isStaff) {
        status = "published";
      } else {
        status = "draft";
      }

      const payload: Record<string, unknown> = {
        title: title.trim(),
        dek: dek.trim() || null,
        body: editor?.getJSON() ?? EMPTY_DOC,
        cover_url: coverUrl || null,
        section_id: sectionId,
        language,
        status,
      };
      if (action === "submit") {
        payload.assigned_editor_id = assignedEditorId;
      } else if (status === "draft" && assignedEditorId) {
        payload.assigned_editor_id = assignedEditorId;
      }

      if (article) {
        const { error } = await supabase
          .from("articles")
          .update(payload)
          .eq("id", article.id);
        if (error) throw error;
      } else {
        const slug = `${slugify(title)}-${Date.now().toString(36)}`;
        const { error } = await supabase
          .from("articles")
          .insert({ ...payload, slug });
        if (error) throw error;
      }
    },
    onSuccess: () => router.push("/admin/articles"),
    onError: (e: Error) => setError(e.message),
  });

  async function onCoverChange(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setCoverUrl(await uploadCover(supabase, file, "articles"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-3xl font-bold">
        {article ? "Edit Article" : "New Article"}
      </h1>

      <div className="mt-6 space-y-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Headline"
          className="w-full border border-rule-dark px-4 py-3 font-serif text-2xl font-bold focus:border-ink focus:outline-none"
        />

        <textarea
          value={dek}
          onChange={(e) => setDek(e.target.value)}
          placeholder="Dek — one-sentence summary shown under the headline"
          rows={2}
          className="w-full border border-rule-dark px-4 py-2 font-serif text-lg text-ink-soft focus:border-ink focus:outline-none"
        />

        <div className="flex flex-wrap gap-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Section
            <select
              value={sectionId}
              onChange={(e) => setSectionId(Number(e.target.value))}
              className="mt-1 block border border-rule-dark px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            >
              <option value="">Choose…</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Language
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1 block border border-rule-dark px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            >
              {locales.map((l) => (
                <option key={l} value={l}>
                  {localeNames[l]}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Assign editor
            <select
              value={assignedEditorId}
              onChange={(e) => setAssignedEditorId(e.target.value)}
              className="mt-1 block border border-rule-dark px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            >
              <option value="">Choose…</option>
              {editors.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.display_name}
                  {person.username ? ` (@${person.username})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Cover image
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onCoverChange(e.target.files?.[0])}
              className="mt-1 block text-sm"
            />
          </label>
        </div>

        {uploading && <p className="text-xs text-ink-soft">Uploading cover…</p>}
        {coverUrl && (
          <div className="relative aspect-video w-full max-w-md overflow-hidden border border-rule-dark">
            <Image src={coverUrl} alt="Cover" fill className="object-cover" />
          </div>
        )}

        <div className="tiptap-editor border border-rule-dark">
          <div className="flex flex-wrap gap-1 border-b border-rule-dark bg-gray-50 p-1.5">
            <ToolbarButton
              title="Bold"
              active={editor?.isActive("bold")}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              B
            </ToolbarButton>
            <ToolbarButton
              title="Italic"
              active={editor?.isActive("italic")}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <em>I</em>
            </ToolbarButton>
            <ToolbarButton
              title="Heading"
              active={editor?.isActive("heading", { level: 2 })}
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              H2
            </ToolbarButton>
            <ToolbarButton
              title="Subheading"
              active={editor?.isActive("heading", { level: 3 })}
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 3 }).run()
              }
            >
              H3
            </ToolbarButton>
            <ToolbarButton
              title="Quote"
              active={editor?.isActive("blockquote")}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            >
              “ ”
            </ToolbarButton>
            <ToolbarButton
              title="Bullet list"
              active={editor?.isActive("bulletList")}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              • List
            </ToolbarButton>
            <ToolbarButton
              title="Numbered list"
              active={editor?.isActive("orderedList")}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              1. List
            </ToolbarButton>
            <ToolbarButton
              title="Divider"
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            >
              —
            </ToolbarButton>
            <ToolbarButton
              title="Undo"
              onClick={() => editor?.chain().focus().undo().run()}
            >
              ↺
            </ToolbarButton>
            <ToolbarButton
              title="Redo"
              onClick={() => editor?.chain().focus().redo().run()}
            >
              ↻
            </ToolbarButton>
          </div>
          <EditorContent editor={editor} />
        </div>

        {error && (
          <p className="border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3 border-t border-rule pt-5">
          <button
            onClick={() => save.mutate("draft")}
            disabled={save.isPending || uploading}
            className="border border-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-ink hover:text-paper transition-colors disabled:opacity-50"
          >
            Save draft
          </button>
          {article?.status !== "published" && (
            <button
              onClick={() => save.mutate("submit")}
              disabled={save.isPending || uploading}
              className="bg-accent px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              Submit to editor
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
