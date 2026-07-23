import type { ReactNode } from "react";

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
      case "strike":
        el = <s key={key}>{el}</s>;
        break;
      case "code":
        el = <code key={key}>{el}</code>;
        break;
      case "link":
        el = (
          <a
            key={key}
            href={String(mark.attrs?.href ?? "#")}
            target="_blank"
            rel="noopener noreferrer"
          >
            {el}
          </a>
        );
        break;
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
    case "hardBreak":
      return <br key={key} />;
    default:
      return children.length > 0 ? <div key={key}>{children}</div> : null;
  }
}

/** Server-side renderer for Tiptap JSON documents. */
export function RichText({ doc }: { doc: unknown }) {
  if (!doc || typeof doc !== "object") return null;
  return <div className="article-body">{renderNode(doc as Node, 0)}</div>;
}
