import ImageExt from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";
import { Fragment, Slice, type Node as PMNode } from "@tiptap/pm/model";
import type { EditorProps, EditorView } from "@tiptap/pm/view";
import { markdownToDoc } from "./paste-markdown";

/** Image node with an alignment attribute (center / left / wide). */
export const AlignedImage = ImageExt.extend({
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

export function createBodyExtensions(placeholder = "Tell your story…") {
  return [
    StarterKit.configure({ codeBlock: false, link: { openOnClick: false } }),
    AlignedImage.configure({ inline: false }),
    Placeholder.configure({ placeholder }),
  ];
}

export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function isAcceptedImage(file: File): boolean {
  return IMAGE_TYPES.has(file.type);
}

/** Returns an error message, or null when the file is fine to upload. */
export function imageFileProblem(file: File): string | null {
  if (!isAcceptedImage(file)) return "Use a PNG, JPEG, WebP or GIF image.";
  if (file.size > IMAGE_MAX_BYTES) {
    return `Images must be under ${Math.round(IMAGE_MAX_BYTES / 1024 / 1024)} MB.`;
  }
  return null;
}

function imageFilesFrom(list: FileList | null | undefined): File[] {
  return Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
}

/** Drop Word/Docs fonts & spacing junk; keep basic structure. */
export function cleanPastedHTML(html: string): string {
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
  // HTML whitespace rules: a newline inside text is just a space.
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (n.parentElement?.closest("pre, code")) continue;
    if (n.nodeValue && /\n/.test(n.nodeValue)) {
      n.nodeValue = n.nodeValue.replace(/\s*\n\s*/g, " ");
    }
  }
  return doc.body.innerHTML;
}

function insertMarkdown(view: EditorView, text: string): boolean {
  const { schema } = view.state;
  let nodes: PMNode[];
  try {
    nodes = markdownToDoc(text).map((n) => schema.nodeFromJSON(n));
  } catch {
    return false;
  }
  if (nodes.length === 0) return false;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  const slice = new Slice(
    Fragment.fromArray(nodes),
    first.type.name === "paragraph" ? 1 : 0,
    last.type.name === "paragraph" ? 1 : 0
  );
  view.dispatch(
    view.state.tr.replaceSelection(slice).setMeta("paste", true).scrollIntoView()
  );
  return true;
}

export function buildEditorProps(opts: {
  /** Called with image files pasted or dropped into the editor. */
  onImageFiles: (files: File[], pos?: number) => void;
}): EditorProps {
  return {
    attributes: { class: "article-body composer-body" },
    transformPastedHTML: cleanPastedHTML,
    transformPastedText(text) {
      return text.replace(/\u00a0/g, " ").replace(/\r\n/g, "\n");
    },
    handlePaste(view, event) {
      const data = event.clipboardData;
      if (!data) return false;
      const text = data.getData("text/plain");
      const files = imageFilesFrom(data.files);
      // Word/Docs also put a picture of the text on the clipboard; only treat
      // it as an image paste when there is no text to paste.
      if (files.length > 0 && !text.trim()) {
        event.preventDefault();
        opts.onImageFiles(files);
        return true;
      }
      if (!text.trim() || view.state.selection.$from.parent.type.spec.code) {
        return false;
      }
      // Cursor / VS Code (and plain-text sources) send line-based text whose
      // HTML, if any, is syntax-highlight markup rather than document structure.
      const fromIde = !!data.getData("vscode-editor-data");
      const plainOnly = !data.getData("text/html");
      if (!fromIde && !(plainOnly && /\n/.test(text.trim()))) return false;
      return insertMarkdown(view, text);
    },
    handleDrop(view, event, _slice, moved) {
      if (moved) return false;
      const files = imageFilesFrom(event.dataTransfer?.files);
      if (files.length === 0) return false;
      event.preventDefault();
      const coords = view.posAtCoords({
        left: event.clientX,
        top: event.clientY,
      });
      opts.onImageFiles(files, coords?.pos);
      return true;
    },
  };
}
