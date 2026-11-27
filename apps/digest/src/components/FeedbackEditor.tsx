"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/ConfirmDialog";
import { normalizeBodyDoc } from "@/lib/body-normalize";
import { buildEditorProps, createBodyExtensions } from "@/lib/editor-config";
import { useEditorImages } from "@/lib/editor-images";
import { matchAnchors } from "@/lib/anchor-match";
import { ReviewHighlights } from "@/lib/review-highlight-extension";
import type { HighlightSpec } from "@/lib/review-highlights";
import type { RevisionPayload } from "@/lib/types";

export type FeedbackEditorHandle = {
  /** Save any pending edits; resolves once the body is stored. */
  flush: () => Promise<void>;
};

const AUTOSAVE_MS = 1500;

function ToolBtn({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`h-8 min-w-8 shrink-0 px-2 text-xs font-semibold transition-colors disabled:opacity-30 ${
        active ? "bg-ink text-paper" : "hover:bg-rule"
      }`}
    >
      {label}
    </button>
  );
}

/**
 * Editable story body for the feedback page. The editor's comment highlights
 * stay visible while the writer fixes the copy; saves go straight to the
 * article (or its pending edit when the story is already live).
 */
export function FeedbackEditor({
  articleId,
  isRevision,
  payloadBase,
  initialBody,
  specs,
  specsKey,
  onHighlightClick,
  onMissed,
  onBodyChange,
  handleRef,
  nameHint,
}: {
  articleId: string;
  isRevision: boolean;
  payloadBase: RevisionPayload;
  initialBody: unknown;
  specs: HighlightSpec[];
  specsKey: string;
  onHighlightClick: (id: string) => void;
  onMissed: (ids: string[]) => void;
  onBodyChange: (body: unknown) => void;
  handleRef: MutableRefObject<FeedbackEditorHandle | null>;
  nameHint: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { prompt } = useConfirm();
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const specsRef = useRef(specs);
  const clickRef = useRef(onHighlightClick);
  const imageFilesRef = useRef<(files: File[], pos?: number) => void>(() => {});
  const baseRef = useRef(payloadBase);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    specsRef.current = specs;
    clickRef.current = onHighlightClick;
    baseRef.current = payloadBase;
  }, [specs, onHighlightClick, payloadBase]);

  const editor = useEditor({
    extensions: [
      ...createBodyExtensions("Fix the copy here…"),
      ReviewHighlights.configure({
        getSpecs: () => specsRef.current,
        onClick: (id) => clickRef.current(id),
      }),
    ],
    content: normalizeBodyDoc(initialBody ?? { type: "doc", content: [] }),
    immediatelyRender: false,
    editorProps: buildEditorProps({
      onImageFiles: (files, pos) => imageFilesRef.current(files, pos),
    }),
    onUpdate: () => {
      dirtyRef.current = true;
    },
  });

  const { uploadFiles } = useEditorImages({
    editor,
    supabase,
    nameHint,
    onDirty: () => {
      dirtyRef.current = true;
    },
    onError: setError,
    onUploadingChange: setUploading,
  });

  useEffect(() => {
    imageFilesRef.current = (files, pos) => void uploadFiles(files, pos);
  }, [uploadFiles]);

  const storeBody = useCallback(
    async (body: unknown) => {
      if (isRevision) {
        const { error } = await supabase.rpc("save_revision", {
          p_article_id: articleId,
          p_payload: { ...baseRef.current, body },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("articles")
          .update({ body })
          .eq("id", articleId);
        if (error) throw error;
      }
    },
    [articleId, isRevision, supabase]
  );

  const save = useCallback(async () => {
    if (!editor || editor.isDestroyed) return;
    if (!dirtyRef.current || savingRef.current) return;
    savingRef.current = true;
    setStatus("saving");
    const body = normalizeBodyDoc(editor.getJSON());
    dirtyRef.current = false;
    try {
      await storeBody(body);
      setStatus("saved");
      setSavedAt(new Date());
      setError(null);
      onBodyChange(body);
    } catch (e) {
      dirtyRef.current = true;
      setStatus("error");
      setError((e as Error).message);
    } finally {
      savingRef.current = false;
    }
  }, [editor, onBodyChange, storeBody]);

  useEffect(() => {
    const tick = window.setInterval(() => void save(), AUTOSAVE_MS);
    return () => window.clearInterval(tick);
  }, [save]);

  useEffect(() => {
    handleRef.current = {
      flush: async () => {
        for (let i = 0; i < 40 && savingRef.current; i++) {
          await new Promise((r) => setTimeout(r, 50));
        }
        await save();
        if (dirtyRef.current) throw new Error("Couldn’t save your edits. Try again.");
      },
    };
    return () => {
      handleRef.current = null;
    };
  }, [handleRef, save]);

  // Leaving edit mode: hand the latest copy back and store it.
  useEffect(() => {
    return () => {
      if (!editor || editor.isDestroyed) return;
      const latest = normalizeBodyDoc(editor.getJSON());
      onBodyChange(latest);
      if (dirtyRef.current) {
        dirtyRef.current = false;
        void storeBody(latest);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Repaint highlights and report comments whose quote the writer edited away.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta("reviewSpecs", specsKey));
    const { missed } = matchAnchors(editor.state.doc, specs);
    onMissed(missed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, specsKey]);

  useEffect(() => {
    if (!editor) return;
    let timer: number | undefined;
    const onUpdate = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (editor.isDestroyed) return;
        onMissed(matchAnchors(editor.state.doc, specsRef.current).missed);
      }, 400);
    };
    editor.on("update", onUpdate);
    return () => {
      window.clearTimeout(timer);
      editor.off("update", onUpdate);
    };
  }, [editor, onMissed]);

  const ui = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      link: e?.isActive("link") ?? false,
      image: e?.isActive("image") ?? false,
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false,
    }),
  });

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

  async function setCaption() {
    if (!editor || !editor.isActive("image")) return;
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

  return (
    <div>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border border-rule bg-paper px-2 py-1">
        <ToolBtn
          label="Undo"
          disabled={!ui?.canUndo}
          onClick={() => editor?.chain().focus().undo().run()}
        />
        <ToolBtn
          label="Redo"
          disabled={!ui?.canRedo}
          onClick={() => editor?.chain().focus().redo().run()}
        />
        <span className="mx-1 h-5 w-px bg-rule-dark" />
        <ToolBtn
          label="B"
          active={ui?.bold}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <ToolBtn
          label="I"
          active={ui?.italic}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />
        <ToolBtn label="Link" active={ui?.link} onClick={() => void setLink()} />
        <ToolBtn
          label="Image description"
          disabled={!ui?.image}
          onClick={() => void setCaption()}
        />
        <span className="ml-auto pr-1 text-[11px] text-ink-soft">
          {uploading
            ? "Uploading image…"
            : status === "saving"
              ? "Saving…"
              : status === "error"
                ? "Not saved"
                : savedAt
                  ? `Saved ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "Edits save automatically"}
        </span>
      </div>
      {error && (
        <p className="mt-2 border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}
      <div className="mt-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
