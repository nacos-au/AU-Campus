"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { ChevronLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  articleSlug,
  countUntaggedImages,
  isPlaceholderSlug,
  readingMinutes,
  slugify,
} from "@/lib/articles";
import { digestFeatures, isPublicSectionSlug } from "@/lib/features";
import { uploadCover } from "@/lib/uploads";
import { locales, localeNames } from "@/i18n/locales";
import { CoverEditorModal } from "@/components/CoverEditorModal";
import { ImageInfo } from "@/components/ImageInfo";
import { RichText } from "@/components/RichText";
import { useConfirm } from "@/components/ConfirmDialog";
import { WriterReviewPanel } from "@/components/WriterReviewPanel";
import type {
  Article,
  ArticleSeries,
  Profile,
  RevisionPayload,
  Section,
} from "@/lib/types";
import { ShareDraftPanel } from "./ShareDraftPanel";

const EMPTY_DOC = { type: "doc", content: [] };
const AUTOSAVE_MS = 2000;

const AlignedImage = ImageExt.extend({
  selectable: true,
  draggable: true,
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
  displayName,
  isStaff = false,
  isAdmin = false,
  isSuperAdmin = false,
  locked = false,
}: {
  article: Article | null;
  revision?: RevisionPayload | null;
  userId: string;
  displayName: string;
  isStaff?: boolean;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  locked?: boolean;
}) {
  const canManualAssign = isAdmin || isSuperAdmin;
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceImageRef = useRef<HTMLInputElement>(null);
  const articleIdRef = useRef<string | null>(article?.id ?? null);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const { prompt } = useConfirm();

  const initial = revision ?? article;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [dek, setDek] = useState(initial?.dek ?? "");
  const ownerName = displayName.trim() || "You";
  const [seriesId, setSeriesId] = useState<string>(
    (initial as Article | null)?.series_id ?? ""
  );
  const [seriesTitle, setSeriesTitle] = useState("");
  const [collaborators, setCollaborators] = useState<
    {
      user_id: string;
      credit_order: number;
      display_name: string;
      username: string | null;
    }[]
  >([]);
  const [collabQuery, setCollabQuery] = useState("");
  const [sectionId, setSectionId] = useState<number | "">(
    initial?.section_id ?? ""
  );
  const isOwner = !article || article.author_id === userId;
  const [language, setLanguage] = useState(initial?.language ?? "en");
  const [coverUrl, setCoverUrl] = useState(initial?.cover_url ?? "");
  const [coverCaption, setCoverCaption] = useState(
    initial?.cover_caption ?? ""
  );
  const [showCoverEditor, setShowCoverEditor] = useState(false);
  const [overrideEditorId, setOverrideEditorId] = useState(
    canManualAssign ? (article?.assigned_editor_id ?? "") : ""
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(
    article ? new Date(article.updated_at) : null
  );

  const isLive = article?.status === "published";

  const { data: sections = [] } = useQuery({
    queryKey: ["sections-public-desks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("*")
        .order("position");
      if (error) throw error;
      return ((data ?? []) as Section[]).filter((s) =>
        isPublicSectionSlug(s.slug)
      );
    },
  });

  const { data: seriesOptions = [] } = useQuery({
    queryKey: ["article-series"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_series")
        .select("id, slug, title")
        .order("title");
      if (error) throw error;
      return (data ?? []) as Pick<ArticleSeries, "id" | "slug" | "title">[];
    },
  });

  const { data: deskPeople = [] } = useQuery({
    queryKey: ["newsroom-credit-people"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, role")
        .in("role", ["writer", "editor", "admin"])
        .order("display_name");
      if (error) throw error;
      return (data ?? []) as Pick<
        Profile,
        "id" | "display_name" | "username" | "role"
      >[];
    },
  });

  const collabsQuery = useQuery({
    queryKey: ["article-collaborators", article?.id],
    enabled: Boolean(article?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_collaborators")
        .select("user_id, credit_order, profiles(display_name, username)")
        .eq("article_id", article!.id)
        .order("credit_order");
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        user_id: string;
        credit_order: number;
        profiles: { display_name: string; username: string | null } | null;
      }>;
    },
  });

  useEffect(() => {
    if (!collabsQuery.data) return;
    setCollaborators(
      collabsQuery.data.map((c) => ({
        user_id: c.user_id,
        credit_order: c.credit_order,
        display_name: c.profiles?.display_name ?? "Writer",
        username: c.profiles?.username ?? null,
      }))
    );
  }, [collabsQuery.data]);

  const editorsQuery = useQuery({
    queryKey: ["newsroom-editors"],
    enabled: isSuperAdmin || isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, role, is_super_admin")
        .or("role.eq.editor,role.eq.admin")
        .eq("is_super_admin", false)
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
    editorProps: {
      attributes: { class: "article-body composer-body" },
      /** Drop Word/Docs fonts & spacing junk; keep basic structure. */
      transformPastedHTML(html) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        doc
          .querySelectorAll("style, script, meta, link, xml, o\\:p")
          .forEach((el) => el.remove());
        doc.querySelectorAll("*").forEach((el) => {
          el.removeAttribute("style");
          el.removeAttribute("class");
          el.removeAttribute("face");
          el.removeAttribute("size");
          el.removeAttribute("color");
          el.removeAttribute("bgcolor");
          for (const attr of [...el.attributes]) {
            if (attr.name.startsWith("data-") || attr.name.startsWith("o:")) {
              el.removeAttribute(attr.name);
            }
          }
        });
        doc.querySelectorAll("font").forEach((el) => {
          const parent = el.parentNode;
          if (!parent) return;
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          parent.removeChild(el);
        });
        doc.querySelectorAll("span").forEach((el) => {
          if (el.attributes.length === 0) {
            const parent = el.parentNode;
            if (!parent) return;
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            parent.removeChild(el);
          }
        });
        return doc.body.innerHTML;
      },
      transformPastedText(text) {
        return text.replace(/\u00a0/g, " ").replace(/\r\n/g, "\n");
      },
    },
    onUpdate: () => {
      dirtyRef.current = true;
    },
  });

  const bodyDoc = useEditorState({
    editor,
    selector: ({ editor: e }) => e?.getJSON() ?? EMPTY_DOC,
  });
  const readMins = readingMinutes(bodyDoc ?? EMPTY_DOC, {
    extraImages: coverUrl ? 1 : 0,
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
      imageCaption: Boolean(
        String(e?.getAttributes("image").title ?? "").trim() ||
          String(e?.getAttributes("image").alt ?? "").trim()
      ),
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false,
    }),
  });

  function markDirty() {
    dirtyRef.current = true;
  }

  async function resolveSeriesId(): Promise<string | null> {
    if (seriesId) return seriesId;
    const titleText = seriesTitle.trim();
    if (!titleText) return null;
    const { data, error } = await supabase.rpc("ensure_article_series", {
      p_title: titleText,
      p_slug: null,
    });
    if (error) throw error;
    const row = data as Pick<ArticleSeries, "id" | "title"> | null;
    if (row?.id) {
      setSeriesId(row.id);
      setSeriesTitle("");
      return row.id;
    }
    return null;
  }

  function payload(resolvedSeriesId: string | null): RevisionPayload {
    return {
      title: title.trim() || "Untitled draft",
      dek: dek.trim() || null,
      body: editor?.getJSON() ?? EMPTY_DOC,
      cover_url: coverUrl || null,
      cover_caption: coverCaption.trim() || null,
      byline: null,
      byline_mode: "personal",
      series_id: resolvedSeriesId,
      section_id: Number(resolvedSection) || Number(sections[0]?.id) || 0,
      language,
    };
  }

  function formatCreditNames(names: string[]) {
    if (names.length <= 1) return names[0] ?? ownerName;
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }

  async function syncCollaborators(articleId: string) {
    if (!isOwner) return;
    const { error: delErr } = await supabase
      .from("article_collaborators")
      .delete()
      .eq("article_id", articleId);
    if (delErr) throw delErr;
    if (collaborators.length === 0) return;
    const { error: insErr } = await supabase.from("article_collaborators").insert(
      collaborators.map((c, i) => ({
        article_id: articleId,
        user_id: c.user_id,
        credit_order: i + 1,
      }))
    );
    if (insErr) throw insErr;
  }

  const persist = useCallback(
    async (opts?: { requireHeadline?: boolean }): Promise<string> => {
      const requireHeadline = opts?.requireHeadline ?? false;
      const resolvedSeries = await resolveSeriesId();
      const p = payload(resolvedSeries);
      if (requireHeadline && !title.trim()) {
        throw new Error("A headline is required.");
      }
      if (!p.section_id) {
        throw new Error("No section available. Ask an editor to restore desks.");
      }

      if (isLive && article && !soleEditor) {
        const { error } = await supabase.rpc("save_revision", {
          p_article_id: article.id,
          p_payload: { ...p, title: title.trim() || p.title },
        });
        if (error) throw error;
        await syncCollaborators(article.id);
        dirtyRef.current = false;
        return article.id;
      }

      const row = {
        title: title.trim() || p.title,
        dek: p.dek,
        body: p.body,
        cover_url: p.cover_url,
        cover_caption: p.cover_caption ?? null,
        byline: p.byline,
        byline_mode: p.byline_mode ?? "personal",
        series_id: p.series_id ?? null,
        sponsored_by: null,
        section_id: p.section_id,
        language: p.language,
      };

      if (articleIdRef.current) {
        const id = articleIdRef.current;
        const headline = title.trim();
        const patch: Record<string, unknown> = { ...row };
        // Refresh placeholder slugs once a real headline exists (unpublished only).
        if (
          headline &&
          article?.status !== "published" &&
          isPlaceholderSlug(article?.slug)
        ) {
          patch.slug = articleSlug(headline, id);
        }
        const { error } = await supabase
          .from("articles")
          .update(patch)
          .eq("id", id);
        if (error) throw error;
        await syncCollaborators(id);
        dirtyRef.current = false;
        return id;
      }

      const headline = title.trim();
      const slug = headline
        ? `${slugify(headline)}-${Date.now().toString(36)}`
        : `untitled-draft-${Date.now().toString(36)}`;
      const { data, error } = await supabase
        .from("articles")
        .insert({ ...row, slug, status: "draft", author_id: userId })
        .select("id")
        .single();
      if (error) throw error;
      articleIdRef.current = data.id;
      await syncCollaborators(data.id as string);
      dirtyRef.current = false;
      return data.id as string;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- payload reads live state
    [
      article,
      seriesId,
      seriesTitle,
      collaborators,
      isOwner,
      coverUrl,
      coverCaption,
      isLive,
      language,
      resolvedSection,
      sections,
      soleEditor,
      supabase,
      title,
      dek,
      userId,
      isStaff,
      editor,
    ]
  );

  /** Keep the browser URL on /edit without remounting the composer (avoids 404 flashes). */
  function syncEditUrl(id: string) {
    if (typeof window === "undefined") return;
    const next = `/admin/articles/${id}/edit`;
    if (window.location.pathname === next) return;
    window.history.replaceState(window.history.state, "", next);
  }

  const saveDraft = useMutation({
    mutationFn: async () => persist({ requireHeadline: true }),
    onSuccess: (id) => {
      setError(null);
      setNotice("Draft saved.");
      setLastSavedAt(new Date());
      syncEditUrl(id);
    },
    onError: (e: Error) => setError(e.message),
  });

  // Autosave every ~2s while dirty — stay on the same page so typing isn’t interrupted.
  useEffect(() => {
    if (locked) return;
    const tick = window.setInterval(async () => {
      if (!dirtyRef.current || savingRef.current) return;
      if (!title.trim() && !dek.trim() && !coverUrl) {
        const json = editor?.getJSON();
        const empty =
          !json ||
          !json.content ||
          json.content.length === 0 ||
          (json.content.length === 1 &&
            json.content[0]?.type === "paragraph" &&
            !json.content[0]?.content);
        if (empty) return;
      }
      savingRef.current = true;
      try {
        const id = await persist({ requireHeadline: false });
        setLastSavedAt(new Date());
        setNotice("Autosaved");
        setError(null);
        syncEditUrl(id);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        savingRef.current = false;
      }
    }, AUTOSAVE_MS);
    return () => window.clearInterval(tick);
  }, [coverUrl, dek, editor, locked, persist, title]);

  const send = useMutation({
    mutationFn: async (action: "submit" | "publish" | "park") => {
      const missing = countUntaggedImages({
        coverUrl,
        coverCaption,
        body: editor?.getJSON() ?? EMPTY_DOC,
      });
      if (missing > 0) {
        throw new Error(
          `Add a short description to every photo before sending (${missing} still ${
            missing === 1 ? "needs" : "need"
          } one).`
        );
      }
      const id = await persist({ requireHeadline: true });
      if (action === "publish" || action === "park") {
        if (isLive) return;
        const { error } = await supabase.rpc("review_approve", {
          p_article_id: id,
          p_park: action === "park",
        });
        if (error) throw error;
        return;
      }
      const args: { p_article_id: string; p_editor?: string } = {
        p_article_id: id,
      };
      if (canManualAssign && overrideEditorId) {
        args.p_editor = overrideEditorId;
      }
      const { error } = await supabase.rpc("submit_article", args);
      if (error) throw error;
    },
    onSuccess: () => {
      router.push("/admin/articles");
      router.refresh();
    },
    onError: (e: Error) => setError(e.message),
  });

  function uploadNameHint() {
    return title.trim() || article?.slug || null;
  }

  async function uploadInline(file: File | undefined, replace = false) {
    if (!file || !editor) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadCover(
        supabase,
        file,
        "articles",
        uploadNameHint()
      );
      if (replace && editor.isActive("image")) {
        editor
          .chain()
          .focus()
          .updateAttributes("image", { src: url })
          .run();
      } else {
        editor
          .chain()
          .focus()
          .insertContent({ type: "image", attrs: { src: url, align: "center" } })
          .run();
      }
      dirtyRef.current = true;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      if (replaceImageRef.current) replaceImageRef.current.value = "";
    }
  }

  async function saveCoverFromEditor(file: File) {
    setUploading(true);
    setError(null);
    try {
      setCoverUrl(
        await uploadCover(supabase, file, "articles", uploadNameHint())
      );
      dirtyRef.current = true;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setUploading(false);
    }
  }

  async function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = await prompt({
      title: "Add a link",
      body: "Leave empty to remove the link.",
      confirmLabel: "Apply",
      input: { placeholder: "https://", defaultValue: prev ?? "", label: "URL" },
    });
    if (url === null) return;
    if (!url) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().setLink({ href: url }).run();
    dirtyRef.current = true;
  }

  function setAlign(align: "left" | "center" | "wide") {
    editor?.chain().focus().updateAttributes("image", { align }).run();
    dirtyRef.current = true;
  }

  async function setCaption() {
    if (!editor) return;
    if (!editor.isActive("image")) {
      setError("Select a photo in the story first, then add a description.");
      return;
    }
    const prev =
      String(editor.getAttributes("image").title ?? "").trim() ||
      String(editor.getAttributes("image").alt ?? "").trim();
    const cap = await prompt({
      title: "Image description",
      body: "Shown as the info chip on the published article.",
      confirmLabel: "Save",
      input: {
        placeholder: "Describe the photo, credit the photographer",
        defaultValue: prev,
      },
    });
    if (cap === null) return;
    editor
      .chain()
      .focus()
      .updateAttributes("image", { title: cap || null, alt: cap || null })
      .run();
    dirtyRef.current = true;
  }

  async function editCoverCaption() {
    const cap = await prompt({
      title: "Cover description",
      confirmLabel: "Save",
      input: {
        placeholder: "Describe the photo, credit the photographer",
        defaultValue: coverCaption,
      },
    });
    if (cap === null) return;
    setCoverCaption(cap.trim());
    markDirty();
  }

  function clearCover() {
    if (article?.featured) {
      setError(
        "Top News stories need a cover. Unfeature the story before removing art."
      );
      return;
    }
    setCoverUrl("");
    setCoverCaption("");
    markDirty();
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
          : article.status === "archived"
            ? "Archived"
            : "Draft";

  return (
    <div className="-mx-4 -mt-6 sm:-mx-6 sm:-mt-8 lg:-mx-8">
      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-rule bg-paper px-3 py-2 sm:px-6 lg:px-8">
        <Link
          href="/admin/articles?filter=draft"
          className="inline-flex items-center gap-0.5 text-sm text-ink-soft hover:text-ink"
          aria-label="Back to drafts"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          <span className="hidden sm:inline">Drafts</span>
        </Link>
        <span className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-rule px-2.5 py-0.5 text-[11px] font-semibold text-ink-soft">
          {saveDraft.isPending || (notice === "Autosaved" && dirtyRef.current === false) ? (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          ) : notice ? (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          ) : null}
          {saveDraft.isPending
            ? "Saving…"
            : notice === "Autosaved"
              ? "Autosaved"
              : notice
                ? "Saved"
                : statusLabel}
        </span>
        {lastSavedAt && (
          <span className="hidden text-[10px] text-ink-soft sm:inline">
            {lastSavedAt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        )}
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
          {digestFeatures.draftShare &&
            article?.id &&
            article.status !== "published" &&
            article.status !== "withdrawn" &&
            article.status !== "archived" && (
              <button
                type="button"
                onClick={() => setShowShare(true)}
                className="border border-rule-dark px-3 py-1.5 text-xs font-semibold uppercase tracking-wider hover:border-ink"
              >
                Share
              </button>
            )}
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
          back. Use{" "}
          <Link
            href={article ? `/admin/review/${article.id}` : "/admin/articles"}
            className="font-semibold text-accent underline underline-offset-2"
          >
            Feedback
          </Link>{" "}
          to read comments and version history.
        </p>
      )}

      {article?.status === "awaiting_writer" && (
        <div className="mx-4 mt-4 sm:mx-0">
          <WriterReviewPanel articleId={article.id} userId={userId} />
        </div>
      )}

      {!preview && !locked && (
        <div className="sticky top-[49px] z-20 flex items-center gap-0.5 overflow-x-auto border-b border-rule bg-paper px-2 py-1.5 sm:justify-center sm:px-6 [scrollbar-width:none]">
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
              markDirty();
            }}
            className="h-8 shrink-0 border border-rule-dark bg-paper px-2 text-sm"
          >
            <option value="p">Paragraph</option>
            <option value="h2">Heading</option>
            <option value="h3">Subheading</option>
          </select>
          <Sep />
          <Btn title="Bold" active={ui?.bold} onClick={() => { editor?.chain().focus().toggleBold().run(); markDirty(); }}>B</Btn>
          <Btn title="Italic" active={ui?.italic} onClick={() => { editor?.chain().focus().toggleItalic().run(); markDirty(); }}><em>I</em></Btn>
          <Btn title="Underline" active={ui?.underline} onClick={() => { editor?.chain().focus().toggleUnderline().run(); markDirty(); }}><u>U</u></Btn>
          <Btn title="Strikethrough" active={ui?.strike} onClick={() => { editor?.chain().focus().toggleStrike().run(); markDirty(); }}><s>S</s></Btn>
          <Sep />
          <Btn title="Link" active={ui?.link} onClick={setLink}>🔗</Btn>
          <Btn
            title={uploading ? "Uploading image…" : "Insert image"}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : (
              "🖼"
            )}
          </Btn>
          <Sep />
          <Btn title="Bullet list" active={ui?.bullet} onClick={() => { editor?.chain().focus().toggleBulletList().run(); markDirty(); }}>•</Btn>
          <Btn title="Numbered list" active={ui?.ordered} onClick={() => { editor?.chain().focus().toggleOrderedList().run(); markDirty(); }}>1.</Btn>
          <Btn title="Quote" active={ui?.quote} onClick={() => { editor?.chain().focus().toggleBlockquote().run(); markDirty(); }}>“ ”</Btn>
          <Btn title="Divider" onClick={() => { editor?.chain().focus().setHorizontalRule().run(); markDirty(); }}>—</Btn>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => uploadInline(e.target.files?.[0], false)}
          />
          <input
            ref={replaceImageRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => uploadInline(e.target.files?.[0], true)}
          />
          {ui?.image && (
            <>
              <Sep />
              <span className="shrink-0 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                Image
              </span>
              <Btn title="Replace image" onClick={() => replaceImageRef.current?.click()}>
                Replace
              </Btn>
              <Btn title="Align left, text wraps" active={ui.align === "left"} onClick={() => setAlign("left")}>◧</Btn>
              <Btn title="Center" active={ui.align === "center"} onClick={() => setAlign("center")}>▣</Btn>
              <Btn title="Wide" active={ui.align === "wide"} onClick={() => setAlign("wide")}>▭</Btn>
              <Btn
                title="Image description"
                active={ui.imageCaption}
                onClick={() => void setCaption()}
              >
                Description
              </Btn>
              <Btn
                title="Remove image"
                onClick={() => {
                  editor?.chain().focus().deleteSelection().run();
                  markDirty();
                }}
              >
                ✕
              </Btn>
              <span className="hidden shrink-0 px-2 text-[11px] text-ink-soft sm:inline">
                Description → info chip on the public article
              </span>
            </>
          )}
        </div>
      )}

      <div className="mx-auto max-w-[44rem] px-4 pb-24 pt-8 sm:px-6">
        {preview ? (
          <article>
            {coverUrl && (
              <figure className="mb-6">
                <ImageInfo
                  description={coverCaption}
                  className="aspect-video w-full overflow-hidden"
                >
                  <Image
                    src={coverUrl}
                    alt={coverCaption.trim() || title || "Cover"}
                    fill
                    className="object-cover"
                  />
                </ImageInfo>
              </figure>
            )}
            <h1 className="font-serif text-4xl font-bold leading-tight">
              {title || "Untitled"}
            </h1>
            {dek && <p className="mt-3 font-serif text-xl text-ink-soft">{dek}</p>}
            <p className="mt-4 text-sm text-ink-soft">
              By{" "}
              <span className="font-semibold text-ink">
                {formatCreditNames([
                  ownerName,
                  ...collaborators.map((c) => c.display_name),
                ])}
              </span>
              {(seriesId || seriesTitle.trim()) && (
                <>
                  {" · "}
                  <span className="font-semibold text-ink">
                    {seriesOptions.find((s) => s.id === seriesId)?.title ||
                      seriesTitle.trim()}
                  </span>
                </>
              )}
            </p>
            <p className="mt-3 text-xs text-ink-soft">{readMins} min read</p>
            <div className="article-body mt-8">
              <RichText doc={editor?.getJSON() ?? EMPTY_DOC} />
            </div>
          </article>
        ) : (
          <>
            <textarea
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                markDirty();
              }}
              readOnly={locked}
              rows={1}
              placeholder="Title"
              className="w-full resize-none overflow-hidden bg-transparent font-serif text-4xl font-bold leading-tight placeholder:text-ink-soft/50 focus:outline-none [field-sizing:content]"
            />
            <textarea
              value={dek}
              onChange={(e) => {
                setDek(e.target.value);
                markDirty();
              }}
              readOnly={locked}
              rows={1}
              placeholder="Add a subtitle…"
              className="mt-2 w-full resize-none bg-transparent font-serif text-xl text-ink-soft placeholder:text-ink-soft/50 focus:outline-none [field-sizing:content]"
            />
            <p className="mt-3 text-sm text-ink-soft">
              By{" "}
              <span className="font-semibold text-ink">
                {formatCreditNames([
                  ownerName,
                  ...collaborators.map((c) => c.display_name),
                ])}
              </span>
            </p>
            <p className="mt-2 text-xs text-ink-soft">{readMins} min read</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-ink-soft sm:col-span-2">
                Series (optional)
                <select
                  value={seriesId}
                  onChange={(e) => {
                    setSeriesId(e.target.value);
                    setSeriesTitle("");
                    markDirty();
                  }}
                  className="mt-1 block w-full border border-rule-dark px-3 py-2 text-sm text-ink"
                >
                  <option value="">No series</option>
                  {seriesOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>
              {!seriesId && (
                <label className="block text-xs font-semibold uppercase tracking-wide text-ink-soft sm:col-span-2">
                  Or start a new series
                  <input
                    value={seriesTitle}
                    onChange={(e) => {
                      setSeriesTitle(e.target.value);
                      markDirty();
                    }}
                    placeholder="e.g. Feminism"
                    className="mt-1 block w-full border border-rule-dark px-3 py-2 text-sm text-ink"
                  />
                </label>
              )}
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Co-authors
                </p>
                {collaborators.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {collaborators.map((c) => (
                      <li
                        key={c.user_id}
                        className="flex items-center justify-between gap-2 border border-rule px-3 py-1.5 text-sm"
                      >
                        <span>
                          {c.display_name}
                          {c.username ? (
                            <span className="text-ink-soft"> @{c.username}</span>
                          ) : null}
                        </span>
                        {isOwner && !locked && (
                          <button
                            type="button"
                            className="text-xs font-semibold uppercase tracking-wider text-accent"
                            onClick={() => {
                              setCollaborators((prev) =>
                                prev.filter((x) => x.user_id !== c.user_id)
                              );
                              markDirty();
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {isOwner && !locked && (
                  <div className="mt-2">
                    <input
                      value={collabQuery}
                      onChange={(e) => setCollabQuery(e.target.value)}
                      placeholder="Search writers & editors…"
                      className="block w-full border border-rule-dark px-3 py-2 text-sm text-ink"
                    />
                    {collabQuery.trim() && (
                      <ul className="mt-1 max-h-40 overflow-y-auto border border-rule bg-paper">
                        {deskPeople
                          .filter((p) => {
                            if (p.id === userId) return false;
                            if (collaborators.some((c) => c.user_id === p.id))
                              return false;
                            const q = collabQuery.trim().toLowerCase();
                            return (
                              p.display_name.toLowerCase().includes(q) ||
                              (p.username ?? "").toLowerCase().includes(q)
                            );
                          })
                          .slice(0, 8)
                          .map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent-soft"
                                onClick={() => {
                                  setCollaborators((prev) => [
                                    ...prev,
                                    {
                                      user_id: p.id,
                                      credit_order: prev.length + 1,
                                      display_name: p.display_name,
                                      username: p.username ?? null,
                                    },
                                  ]);
                                  setCollabQuery("");
                                  markDirty();
                                }}
                              >
                                <span>
                                  {p.display_name}
                                  {p.username ? (
                                    <span className="text-ink-soft">
                                      {" "}
                                      @{p.username}
                                    </span>
                                  ) : null}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                                  {p.role}
                                </span>
                              </button>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                )}
                {!isOwner && collaborators.length === 0 && (
                  <p className="mt-1 text-xs text-ink-soft">No co-authors.</p>
                )}
              </div>
            </div>

            {/* Cover photo — editable in the compose canvas */}
            {!locked && (
              <div className="mt-6 border border-dashed border-rule-dark bg-gray-50/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                    Cover photo
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => setShowCoverEditor(true)}
                      className="text-xs font-semibold uppercase tracking-wider text-accent hover:text-accent-hover"
                    >
                      {coverUrl ? "Adjust / change" : "Add cover"}
                    </button>
                    {coverUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => void editCoverCaption()}
                          className="text-xs font-semibold uppercase tracking-wider text-accent hover:text-accent-hover"
                        >
                          {coverCaption.trim() ? "Edit description" : "Add description"}
                        </button>
                        <button
                          type="button"
                          onClick={clearCover}
                          className="text-xs font-semibold uppercase tracking-wider text-ink-soft hover:text-ink"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {coverUrl ? (
                  <div className="relative mt-2 border border-rule">
                    <ImageInfo
                      description={coverCaption}
                      className="aspect-video w-full overflow-hidden"
                    >
                      <Image
                        src={coverUrl}
                        alt={coverCaption.trim() || "Cover"}
                        fill
                        className="object-cover"
                      />
                    </ImageInfo>
                    {uploading && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-paper/70">
                        <Loader2
                          className="h-8 w-8 animate-spin text-ink-soft"
                          strokeWidth={1.75}
                        />
                      </div>
                    )}
                  </div>
                ) : uploading ? (
                  <div className="relative mt-2 flex aspect-video w-full items-center justify-center border border-rule bg-rule/40">
                    <Loader2
                      className="h-8 w-8 animate-spin text-ink-soft"
                      strokeWidth={1.75}
                    />
                    <span className="sr-only">Uploading cover</span>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-ink-soft">
                    Optional for most stories. Required for Top News / featured
                    homepage packages. Crop to 16:9 for share previews.
                  </p>
                )}
              </div>
            )}

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
          {saveDraft.isPending ? "Saving…" : "Save draft"}
        </button>
      </div>

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
                  onChange={(e) => {
                    setSectionId(Number(e.target.value));
                    markDirty();
                  }}
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
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    markDirty();
                  }}
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
                  <div className="mt-2 border border-rule-dark">
                    <ImageInfo
                      description={coverCaption}
                      className="aspect-video w-full overflow-hidden"
                    >
                      <Image
                        src={coverUrl}
                        alt={coverCaption.trim() || "Cover"}
                        fill
                        className="object-cover"
                      />
                    </ImageInfo>
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => setShowCoverEditor(true)}
                    className="text-xs font-semibold uppercase tracking-wider text-accent disabled:opacity-50"
                  >
                    {coverUrl ? "Adjust / change cover" : "Add cover"}
                  </button>
                  {coverUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() => void editCoverCaption()}
                        className="text-xs font-semibold uppercase tracking-wider text-accent"
                      >
                        {coverCaption.trim() ? "Edit description" : "Add description"}
                      </button>
                      <button
                        type="button"
                        onClick={clearCover}
                        className="text-xs font-semibold uppercase tracking-wider text-ink-soft"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>

              {soleEditor ? (
                <p className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  You are the only editor on the desk (failover). This piece will be
                  assigned to you — review it in the queue, then park or publish from
                  there like any other editor.
                </p>
              ) : (
                <p className="border border-rule bg-gray-50 px-3 py-2 text-sm text-ink-soft">
                  An editor is assigned automatically when you send — workload is
                  balanced across the desk
                  {canManualAssign
                    ? ". As admin you can override below."
                    : "."}
                </p>
              )}

              {canManualAssign && !soleEditor && (
                <label className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Override editor (admin)
                  <select
                    value={overrideEditorId}
                    onChange={(e) => setOverrideEditorId(e.target.value)}
                    className="mt-1 block w-full border border-rule-dark px-3 py-2 text-sm text-ink"
                  >
                    <option value="">Auto-assign (fair rotation)</option>
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
              <button
                onClick={() => send.mutate("submit")}
                disabled={busy}
                className="bg-accent px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {isLive
                  ? "Submit edit for review"
                  : soleEditor
                    ? "Send to myself for review"
                    : "Send to editor"}
              </button>
              <button
                onClick={() =>
                  saveDraft.mutate(undefined, {
                    onSuccess: () => setShowSettings(false),
                  })
                }
                disabled={busy}
                className="border border-ink px-5 py-3 text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
              >
                Save as draft
              </button>
            </div>
          </div>
        </div>
      )}

      {article?.id && (
        <ShareDraftPanel
          articleId={article.id}
          articleTitle={title.trim() || article.title}
          userId={userId}
          open={showShare}
          onClose={() => setShowShare(false)}
        />
      )}

      <CoverEditorModal
        open={showCoverEditor}
        existingUrl={coverUrl || null}
        onClose={() => setShowCoverEditor(false)}
        onSave={saveCoverFromEditor}
      />
    </div>
  );
}
