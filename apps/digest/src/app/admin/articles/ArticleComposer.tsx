"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/articles";
import { uploadCover } from "@/lib/uploads";
import { locales, localeNames } from "@/i18n/locales";
import { RichText } from "@/components/RichText";
import type { Article, Profile, RevisionPayload, Section } from "@/lib/types";

const EMPTY_DOC = { type: "doc", content: [] };

const AlignedImage = ImageExt.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-align") || "center",
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-align": attrs.align as string,
        }),
      },
    };
  },
});

function Btn({
  active,
  onClick,
  children,
  title,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`h-8 min-w-8 shrink-0 px-2 text-sm font-semibold transition-colors disabled:opacity-30 ${
        active ? "bg-ink text-paper" : "hover:bg-rule"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px shrink-0 bg-rule-dark" />;

export function ArticleComposer({
  article,
  revision,
  userId,
  isStaff = false,
  locked = false,
}: {
  article: Article | null;
  /** Pending edit of a live article (if any). Overrides article fields. */
  revision?: RevisionPayload | null;
  userId: string;
  isStaff?: boolean;
  locked?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const articleIdRef = useRef<string | null>(article?.id ?? null);

  const initial = revision ?? article;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [dek, setDek] = useState(initial?.dek ?? "");
  const [byline, setByline] = useState(initial?.byline ?? "");
  const [sponsoredBy, setSponsoredBy] = useState(initial?.sponsored_by ?? "");
  const [sectionId, setSectionId] = useState<number | "">(
    initial?.section_id ?? ""
  );
  const [language, setLanguage] = useState(initial?.language ?? "en");
  const [coverUrl, setCoverUrl] = useState(initial?.cover_url ?? "");
  const [assignedEditorId, setAssignedEditorId] = useState(
    article?.assigned_editor_id ?? ""
  );
  const [showSettings, setShowSettings] = useState(false);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isLive = article?.status === "published";

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

  const editorsQuery = useQuery({
    queryKey: ["newsroom-editors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, role, is_super_admin")
        .or("role.eq.editor,role.eq.admin,is_super_admin.eq.true")
        .order("display_name");
      if (error) throw error;
      return data as Pick<Profile, "id" | "display_name" | "username">[];
    },
  });
  const otherEditors = (editorsQuery.data ?? []).filter((p) => p.id !== userId);
  const soleEditor =
    isStaff && editorsQuery.isSuccess && otherEditors.length === 0;

  const resolvedSection = sectionId || sections[0]?.id || "";

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      AlignedImage.configure({ inline: false }),
      Placeholder.configure({ placeholder: "Tell your story…" }),
    ],
    content: (initial?.body as object) ?? EMPTY_DOC,
    editable: !locked,
    immediatelyRender: false,
    editorProps: { attributes: { class: "article-body composer-body" } },
  });

  const ui = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      underline: e?.isActive("underline") ?? false,
      strike: e?.isActive("strike") ?? false,
      link: e?.isActive("link") ?? false,
      quote: e?.isActive("blockquote") ?? false,
      bullet: e?.isActive("bulletList") ?? false,
      ordered: e?.isActive("orderedList") ?? false,
      h2: e?.isActive("heading", { level: 2 }) ?? false,
      h3: e?.isActive("heading", { level: 3 }) ?? false,
      image: e?.isActive("image") ?? false,
      align: (e?.getAttributes("image").align as string | undefined) ?? null,
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false,
    }),
  });

  function payload(): RevisionPayload {
    return {
      title: title.trim(),
      dek: dek.trim() || null,
      body: editor?.getJSON() ?? EMPTY_DOC,
      cover_url: coverUrl || null,
      byline: byline.trim() || null,
      sponsored_by: isStaff ? sponsoredBy.trim() || null : (article?.sponsored_by ?? null),
      section_id: Number(resolvedSection),
      language,
    };
  }

  /** Persist the current content; returns the article id. */
  async function persist(): Promise<string> {
    const p = payload();
    if (!p.title) throw new Error("A headline is required.");
    if (!p.section_id) throw new Error("Pick a section in Continue.");

    // Live article, not sole editor → saved as a revision, live copy untouched.
    if (isLive && article && !soleEditor) {
      const { error } = await supabase.rpc("save_revision", {
        p_article_id: article.id,
        p_payload: p,
      });
      if (error) throw error;
      return article.id;
    }

    if (articleIdRef.current) {
      const { error } = await supabase
        .from("articles")
        .update({
          title: p.title,
          dek: p.dek,
          body: p.body,
          cover_url: p.cover_url,
          byline: p.byline,
          sponsored_by: p.sponsored_by,
          section_id: p.section_id,
          language: p.language,
        })
        .eq("id", articleIdRef.current);
      if (error) throw error;
      return articleIdRef.current;
    }

    const slug = `${slugify(p.title)}-${Date.now().toString(36)}`;
    const { data, error } = await supabase
      .from("articles")
      .insert({ ...p, slug, status: "draft", author_id: userId })
      .select("id")
      .single();
    if (error) throw error;
    articleIdRef.current = data.id;
    return data.id as string;
  }

  const saveDraft = useMutation({
    mutationFn: persist,
    onSuccess: (id) => {
      setError(null);
      setNotice("Saved.");
      if (!article) router.replace(`/admin/articles/${id}/edit`);
    },
    onError: (e: Error) => setError(e.message),
  });

  const send = useMutation({
    mutationFn: async (action: "submit" | "publish") => {
      const id = await persist();
      if (action === "publish") {
        if (isLive) return; // sole editor edits live copy directly
        const { error } = await supabase.rpc("review_approve", {
          p_article_id: id,
        });
        if (error) throw error;
        return;
      }
      if (!assignedEditorId) throw new Error("Choose an editor to review this.");
      const { error } = await supabase.rpc("submit_article", {
        p_article_id: id,
        p_editor: assignedEditorId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      router.push("/admin/articles");
      router.refresh();
    },
    onError: (e: Error) => setError(e.message),
  });

  async function uploadInline(file: File | undefined) {
    if (!file || !editor) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadCover(supabase, file, "articles");
      editor
        .chain()
        .focus()
        .insertContent({ type: "image", attrs: { src: url, align: "center" } })
        .run();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function uploadCoverFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      setCoverUrl(await uploadCover(supabase, file, "articles"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (leave empty to remove)", prev ?? "");
    if (url === null) return;
    if (!url) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().setLink({ href: url }).run();
  }

  function setAlign(align: "left" | "center" | "wide") {
    editor?.chain().focus().updateAttributes("image", { align }).run();
  }

  function setCaption() {
    if (!editor) return;
    const prev = editor.getAttributes("image").title as string | undefined;
    const cap = window.prompt("Caption", prev ?? "");
    if (cap === null) return;
    editor
      .chain()
      .focus()
      .updateAttributes("image", { title: cap || null, alt: cap || null })
      .run();
  }

  const busy = saveDraft.isPending || send.isPending || uploading;
  const statusLabel = !article
    ? "New draft"
    : isLive
      ? revision
        ? "Live · edit pending"
        : "Live"
      : article.status === "awaiting_editor"
        ? "With editor"
        : article.status === "awaiting_writer"
          ? "Changes requested"
          : "Draft";

  return (
    <div className="-mx-4 -mt-8 sm:mx-0 sm:mt-0">
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-rule-dark bg-paper px-3 py-2 sm:px-0">
        <Link
          href="/admin/articles"
          className="text-sm text-ink-soft hover:text-ink"
          aria-label="Back to articles"
        >
          ←<span className="ml-1 hidden sm:inline">Articles</span>
        </Link>
        <span className="ml-1 rounded-full bg-rule px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
          {statusLabel}
        </span>
        {article && (
          <Link
            href={`/admin/review/${article.id}`}
            className="hidden text-xs text-accent underline underline-offset-2 sm:inline"
          >
            Feedback
          </Link>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => saveDraft.mutate()}
            disabled={busy || locked}
            className="hidden px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft hover:text-ink disabled:opacity-40 sm:block"
          >
            {saveDraft.isPending ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => setPreview((v) => !v)}
            className="border border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wider hover:bg-ink hover:text-paper"
          >
            {preview ? "Edit" : "Preview"}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            disabled={locked}
            className="bg-accent px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-hover disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      </div>

      {locked && (
        <p className="mx-4 mt-4 border border-rule-dark bg-gray-50 px-3 py-2 text-sm text-ink-soft sm:mx-0">
          This piece is with the editor. You can edit again if they send it
          back.
        </p>
      )}

      {/* Toolbar */}
      {!preview && !locked && (
        <div className="sticky top-[49px] z-20 flex items-center gap-0.5 overflow-x-auto border-b border-rule bg-paper px-2 py-1.5 sm:px-0 [scrollbar-width:none]">
          <Btn title="Undo" disabled={!ui?.canUndo} onClick={() => editor?.chain().focus().undo().run()}>↺</Btn>
          <Btn title="Redo" disabled={!ui?.canRedo} onClick={() => editor?.chain().focus().redo().run()}>↻</Btn>
          <Sep />
          <select
            aria-label="Text style"
            value={ui?.h2 ? "h2" : ui?.h3 ? "h3" : "p"}
            onChange={(e) => {
              const v = e.target.value;
              const c = editor?.chain().focus();
              if (v === "p") c?.setParagraph().run();
              else c?.setHeading({ level: v === "h2" ? 2 : 3 }).run();
            }}
            className="h-8 shrink-0 border border-rule-dark bg-paper px-2 text-sm"
          >
            <option value="p">Paragraph</option>
            <option value="h2">Heading</option>
            <option value="h3">Subheading</option>
          </select>
          <Sep />
          <Btn title="Bold" active={ui?.bold} onClick={() => editor?.chain().focus().toggleBold().run()}>B</Btn>
          <Btn title="Italic" active={ui?.italic} onClick={() => editor?.chain().focus().toggleItalic().run()}><em>I</em></Btn>
          <Btn title="Underline" active={ui?.underline} onClick={() => editor?.chain().focus().toggleUnderline().run()}><u>U</u></Btn>
          <Btn title="Strikethrough" active={ui?.strike} onClick={() => editor?.chain().focus().toggleStrike().run()}><s>S</s></Btn>
          <Sep />
          <Btn title="Link" active={ui?.link} onClick={setLink}>🔗</Btn>
          <Btn title="Insert image" onClick={() => fileRef.current?.click()}>
            {uploading ? "…" : "🖼"}
          </Btn>
          <Sep />
          <Btn title="Bullet list" active={ui?.bullet} onClick={() => editor?.chain().focus().toggleBulletList().run()}>•</Btn>
          <Btn title="Numbered list" active={ui?.ordered} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1.</Btn>
          <Btn title="Quote" active={ui?.quote} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>“ ”</Btn>
          <Btn title="Divider" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>—</Btn>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => uploadInline(e.target.files?.[0])}
          />
          {ui?.image && (
            <>
              <Sep />
              <span className="shrink-0 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                Image
              </span>
              <Btn title="Align left, text wraps" active={ui.align === "left"} onClick={() => setAlign("left")}>◧</Btn>
              <Btn title="Center" active={ui.align === "center"} onClick={() => setAlign("center")}>▣</Btn>
              <Btn title="Wide" active={ui.align === "wide"} onClick={() => setAlign("wide")}>▭</Btn>
              <Btn title="Caption" onClick={setCaption}>Cap</Btn>
              <Btn title="Remove image" onClick={() => editor?.chain().focus().deleteSelection().run()}>✕</Btn>
            </>
          )}
        </div>
      )}

      {/* Page */}
      <div className="mx-auto max-w-[44rem] px-4 pb-24 pt-8 sm:px-0">
        {preview ? (
          <article>
            <h1 className="font-serif text-4xl font-bold leading-tight">
              {title || "Untitled"}
            </h1>
            {dek && <p className="mt-3 font-serif text-xl text-ink-soft">{dek}</p>}
            <p className="mt-4 text-sm text-ink-soft">
              By <span className="font-semibold text-ink">{byline || "You"}</span>
            </p>
            {coverUrl && (
              <div className="relative mt-6 aspect-video w-full overflow-hidden">
                <Image src={coverUrl} alt="" fill className="object-cover" />
              </div>
            )}
            <div className="article-body mt-8">
              <RichText doc={editor?.getJSON() ?? EMPTY_DOC} />
            </div>
          </article>
        ) : (
          <>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={locked}
              rows={1}
              placeholder="Title"
              className="w-full resize-none overflow-hidden bg-transparent font-serif text-4xl font-bold leading-tight placeholder:text-ink-soft/50 focus:outline-none [field-sizing:content]"
            />
            <textarea
              value={dek}
              onChange={(e) => setDek(e.target.value)}
              readOnly={locked}
              rows={1}
              placeholder="Add a subtitle…"
              className="mt-2 w-full resize-none bg-transparent font-serif text-xl text-ink-soft placeholder:text-ink-soft/50 focus:outline-none [field-sizing:content]"
            />
            <label className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-rule-dark px-3 py-1.5 text-sm">
              <span className="text-ink-soft">By</span>
              <input
                value={byline}
                onChange={(e) => setByline(e.target.value)}
                readOnly={locked}
                placeholder="Your name or series, e.g. Achievers in Plain Sight"
                className="w-64 max-w-[60vw] bg-transparent font-semibold focus:outline-none"
              />
            </label>
            <div className="tiptap-editor mt-6">
              <EditorContent editor={editor} />
            </div>
          </>
        )}

        {(error || notice) && (
          <p
            className={`mt-6 border px-3 py-2 text-sm ${
              error
                ? "border-accent/30 bg-accent-soft text-accent"
                : "border-rule-dark text-ink-soft"
            }`}
          >
            {error ?? notice}
          </p>
        )}

        <button
          onClick={() => saveDraft.mutate()}
          disabled={busy || locked}
          className="mt-6 w-full border border-ink py-2.5 text-xs font-semibold uppercase tracking-wider disabled:opacity-40 sm:hidden"
        >
          {saveDraft.isPending ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Continue sheet */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="max-h-[90vh] w-full overflow-y-auto bg-paper p-5 sm:max-w-lg">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold">Ready to send?</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-2xl leading-none text-ink-soft"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Section
                <select
                  value={resolvedSection}
                  onChange={(e) => setSectionId(Number(e.target.value))}
                  className="mt-1 block w-full border border-rule-dark px-3 py-2 text-sm text-ink"
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Language
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="mt-1 block w-full border border-rule-dark px-3 py-2 text-sm text-ink"
                >
                  {locales.map((l) => (
                    <option key={l} value={l}>
                      {localeNames[l]}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Cover image
                </p>
                {coverUrl && (
                  <div className="relative mt-2 aspect-video w-full overflow-hidden border border-rule-dark">
                    <Image src={coverUrl} alt="Cover" fill className="object-cover" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadCoverFile(e.target.files?.[0])}
                  className="mt-2 block w-full text-sm"
                />
              </div>

              {isStaff && (
                <label className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Sponsored by (optional — marks this a paid post)
                  <input
                    value={sponsoredBy}
                    onChange={(e) => setSponsoredBy(e.target.value)}
                    placeholder="Campus Bookshop"
                    className="mt-1 block w-full border border-rule-dark px-3 py-2 text-sm text-ink"
                  />
                </label>
              )}

              {!soleEditor && (
                <label className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Editor to review
                  <select
                    value={assignedEditorId}
                    onChange={(e) => setAssignedEditorId(e.target.value)}
                    className="mt-1 block w-full border border-rule-dark px-3 py-2 text-sm text-ink"
                  >
                    <option value="">Choose…</option>
                    {otherEditors.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name}
                        {p.username ? ` (@${p.username})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {error && (
              <p className="mt-4 border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
              {soleEditor ? (
                <button
                  onClick={() => send.mutate("publish")}
                  disabled={busy}
                  className="bg-accent px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {isLive ? "Update live article" : "Publish now"}
                </button>
              ) : (
                <button
                  onClick={() => send.mutate("submit")}
                  disabled={busy}
                  className="bg-accent px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {isLive ? "Submit edit for review" : "Send to editor"}
                </button>
              )}
              <button
                onClick={() => saveDraft.mutate(undefined, { onSuccess: () => setShowSettings(false) })}
                disabled={busy}
                className="border border-ink px-5 py-3 text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
              >
                Save as draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
