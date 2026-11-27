import { memo, type ReactNode } from "react";
import { ImageInfo } from "@/components/ImageInfo";
import { normalizeBodyDoc } from "@/lib/body-normalize";
import { isExternalHref, safeHref } from "@/lib/safe-link";

interface Mark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface Node {
  type?: string;
  text?: string;
  marks?: Mark[];
  attrs?: Record<string, unknown>;
  content?: Node[];
}

function renderText(node: Node, key: number): ReactNode {
  let el: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        el = <strong key={key}>{el}</strong>;
        break;
      case "italic":
        el = <em key={key}>{el}</em>;
        break;
      case "underline":
        el = <u key={key}>{el}</u>;
        break;
      case "strike":
        el = <s key={key}>{el}</s>;
        break;
      case "code":
        el = <code key={key}>{el}</code>;
        break;
      case "link": {
        const href = safeHref(String(mark.attrs?.href ?? ""));
        // Unsafe or unknown addresses render as plain text, never as a link.
        if (!href) break;
        const external = isExternalHref(href);
        el = (
          <a
            key={key}
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
          >
            {el}
          </a>
        );
        break;
      }
    }
  }
  return el;
}

function renderNode(node: Node, key: number): ReactNode {
  if (node.type === "text") return renderText(node, key);

  const children = (node.content ?? []).map((child, i) => renderNode(child, i));

  switch (node.type) {
    case "doc":
      return <div key={key}>{children}</div>;
    case "paragraph":
      return <p key={key}>{children.length ? children : "\u00A0"}</p>;
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      if (level <= 2) return <h2 key={key}>{children}</h2>;
      return <h3 key={key}>{children}</h3>;
    }
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return <ol key={key}>{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "horizontalRule":
      return <hr key={key} className="my-8 border-rule-dark" />;
    case "image": {
      const src = String(node.attrs?.src ?? "");
      if (!src) return null;
      const align = String(node.attrs?.align ?? "center");
      const caption =
        String(node.attrs?.title ?? "").trim() ||
        String(node.attrs?.alt ?? "").trim() ||
        "";
      const alt = String(node.attrs?.alt ?? "").trim() || caption;
      return (
        <figure key={key} className="article-figure" data-align={align}>
          <ImageInfo description={caption || null}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} loading="lazy" />
          </ImageInfo>
        </figure>
      );
    }
    case "hardBreak":
      return <br key={key} />;
    default:
      return children.length > 0 ? <div key={key}>{children}</div> : null;
  }
}

/** Server-side renderer for Tiptap JSON documents. */
function RichTextInner({ doc }: { doc: unknown }) {
  if (!doc || typeof doc !== "object") return null;
  return (
    <div className="article-body">
      {renderNode(normalizeBodyDoc(doc) as Node, 0)}
    </div>
  );
}

/** Memoized so parent re-renders do not recreate the DOM and wipe review marks. */
export const RichText = memo(RichTextInner);
