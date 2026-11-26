"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
import { safeHref } from "@/lib/safe-link";
import type { RichDoc } from "@/lib/weekly-layout";

const EMPTY_DOC: RichDoc = { type: "doc", content: [{ type: "paragraph" }] };

/**
 * Formatted text for weekly blocks: bold, italic, lists and links only.
 * Headings, quotes, code and raw HTML are not offered, and pasted links are
 * checked against the same rules readers' pages enforce.
 */
export function RichBlockEditor({
  value,
  onChange,
}: {
  value: RichDoc | null;
  onChange: (doc: RichDoc) => void;
}) {
  const [linkError, setLinkError] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
        link: {
          openOnClick: false,
          isAllowedUri: (url) => safeHref(url) !== null,
        },
      }),
    ],
    content: value ?? EMPTY_DOC,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[7rem] px-3 py-2 text-sm leading-relaxed text-ink focus:outline-none [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-accent [&_a]:underline",
      },
    },
    onUpdate: ({ editor: e }) => onChangeRef.current(e.getJSON() as RichDoc),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      bullet: e?.isActive("bulletList") ?? false,
      ordered: e?.isActive("orderedList") ?? false,
      link: e?.isActive("link") ?? false,
    }),
  });

  const active = state ?? {
    bold: false,
    italic: false,
    bullet: false,
    ordered: false,
    link: false,
  };

  function setLink() {
    if (!editor) return;
    const current = (editor.getAttributes("link").href as string | undefined) ?? "";
    const input = window.prompt(
      "Link address: https://…, mailto:name@example.com, or /page on this site. Leave empty to remove the link.",
      current
    );
    if (input === null) return;
    if (!input.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkError(null);
      return;
    }
    const href = safeHref(input);
    if (!href) {
      setLinkError("That address can’t be linked. Use https://, mailto: or a /path.");
      return;
    }
    setLinkError(null);
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  const btn = (on: boolean) =>
    `px-2 py-1 text-xs font-bold ${on ? "bg-ink text-paper" : "text-ink-soft hover:bg-gray-100 hover:text-ink"}`;

  return (
    <div className="border border-rule-dark bg-white">
      <div className="flex flex-wrap gap-0.5 border-b border-rule p-1" role="toolbar" aria-label="Formatting">
        <button type="button" className={btn(active.bold)} onClick={() => editor?.chain().focus().toggleBold().run()}>
          B
        </button>
        <button type="button" className={`${btn(active.italic)} italic`} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          I
        </button>
        <button type="button" className={btn(active.bullet)} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          • List
        </button>
        <button type="button" className={btn(active.ordered)} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          1. List
        </button>
        <button type="button" className={btn(active.link)} onClick={setLink}>
          Link
        </button>
      </div>
      <EditorContent editor={editor} />
      {linkError ? <p className="border-t border-rule px-3 py-2 text-xs text-red-700">{linkError}</p> : null}
    </div>
  );
}
