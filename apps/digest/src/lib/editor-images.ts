"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadBodyImage } from "@/lib/body-image";
import { imageFileProblem } from "@/lib/editor-config";

type Options = {
  editor: Editor | null;
  supabase: SupabaseClient;
  /** Slug-ish hint used in the storage object name. */
  nameHint: string | null;
  onDirty: () => void;
  onError: (message: string | null) => void;
  /** Called whenever an upload starts or finishes. */
  onUploadingChange?: (uploading: boolean) => void;
};

/**
 * Handles pasted/dropped image files and re-hosts base64 images (pasted from
 * Docs/Word) so a saved body never carries raw image data.
 */
export function useEditorImages({
  editor,
  supabase,
  nameHint,
  onDirty,
  onError,
  onUploadingChange,
}: Options) {
  const [uploading, setUploadingState] = useState(false);
  const hintRef = useRef(nameHint);
  const rehostingRef = useRef(false);

  useEffect(() => {
    hintRef.current = nameHint;
  }, [nameHint]);

  const setUploading = useCallback(
    (v: boolean) => {
      setUploadingState(v);
      onUploadingChange?.(v);
    },
    [onUploadingChange]
  );

  const uploadFiles = useCallback(
    async (files: File[], pos?: number) => {
      if (!editor || files.length === 0) return;
      setUploading(true);
      onError(null);
      try {
        let at = pos;
        for (const file of files) {
          const problem = imageFileProblem(file);
          if (problem) throw new Error(problem);
          const url = await uploadBodyImage(supabase, file, hintRef.current);
          const node = { type: "image", attrs: { src: url, align: "center" } };
          const chain = editor.chain().focus();
          if (typeof at === "number") {
            const size = editor.state.doc.content.size;
            chain.insertContentAt(Math.min(at, size), node).run();
            at = undefined;
          } else {
            chain.insertContent(node).run();
          }
          onDirty();
        }
      } catch (e) {
        onError((e as Error).message);
      } finally {
        setUploading(false);
      }
    },
    [editor, supabase, onDirty, onError, setUploading]
  );

  // Swap data: URIs for uploaded URLs after a paste.
  useEffect(() => {
    if (!editor) return;
    let timer: number | undefined;

    const findDataImage = () => {
      let found: { pos: number; src: string } | null = null;
      editor.state.doc.descendants((node, pos) => {
        if (found) return false;
        const src = String(node.attrs?.src ?? "");
        if (node.type.name === "image" && src.startsWith("data:")) {
          found = { pos, src };
          return false;
        }
        return true;
      });
      return found as { pos: number; src: string } | null;
    };

    const rehost = async () => {
      if (rehostingRef.current) return;
      let target = findDataImage();
      if (!target) return;
      rehostingRef.current = true;
      setUploading(true);
      try {
        while (target) {
          const blob = await (await fetch(target.src)).blob();
          const ext = blob.type.split("/")[1] || "png";
          const file = new File([blob], `pasted.${ext}`, { type: blob.type });
          const problem = imageFileProblem(file);
          if (problem) throw new Error(problem);
          const url = await uploadBodyImage(supabase, file, hintRef.current);
          const current = findDataImage();
          if (current && current.src === target.src) {
            const node = editor.state.doc.nodeAt(current.pos);
            if (node) {
              editor.view.dispatch(
                editor.state.tr.setNodeMarkup(current.pos, undefined, {
                  ...node.attrs,
                  src: url,
                })
              );
              onDirty();
            }
          }
          target = findDataImage();
        }
      } catch (e) {
        onError((e as Error).message);
      } finally {
        rehostingRef.current = false;
        setUploading(false);
      }
    };

    const onUpdate = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void rehost(), 400);
    };
    editor.on("update", onUpdate);
    return () => {
      window.clearTimeout(timer);
      editor.off("update", onUpdate);
    };
  }, [editor, supabase, onDirty, onError, setUploading]);

  return { uploadFiles, uploading };
}
